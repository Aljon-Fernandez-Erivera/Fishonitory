const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const Order = require("../models/Order");
const Sale = require("../models/Sale");
const Fish = require("../models/Fish");
const User = require("../models/User");
const getOwnerId = require("../utils/ownerScope");
const { writeAudit } = require("../utils/audit");

const ORDER_ROLES = ["Owner", "masterStaff"];

async function withTransaction(work) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        result = await work(session);
      });
      return result;
    } catch (error) {
      lastError = error;
      if (!error.hasErrorLabel?.("TransientTransactionError")) throw error;
    } finally {
      await session.endSession();
    }
  }
  throw lastError;
}

const createTransporter = () =>
  nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

const peso = (value) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    Number(value) || 0,
  );

const methodLabel = (deliveryMethod, courierName) => {
  if (deliveryMethod === "pickup") return "Pickup at the store";
  if (deliveryMethod === "rider") return "Rider delivery";
  return `Courier delivery${courierName ? ` (${courierName})` : ""}`;
};

const buildOrderEmailHtml = ({
  businessName,
  customerName,
  items,
  deliveryMethod,
  courierName,
  requestedDate,
  total,
}) => {
  const itemsHtml = items
    .map(
      (item) => `
        <tr>
          <td style="padding:4px 0;">${item.name} x${item.quantity}</td>
          <td style="text-align:right;padding:4px 0;">${peso(item.total)}</td>
        </tr>`,
    )
    .join("");

  return `
    <div style="margin:0;padding:32px 16px;background:#edf7fb;font-family:Arial,Helvetica,sans-serif;color:#12314a;">
      <div style="max-width:560px;margin:0 auto;border:1px solid #d8ebf3;border-radius:18px;overflow:hidden;background:#ffffff;box-shadow:0 10px 30px rgba(16, 76, 98, 0.08);">
        <div style="background:linear-gradient(135deg,#0d4a5f,#0a6c7d);padding:22px 28px;color:#ffffff;">
          <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:0.9;">${businessName}</div>
          <div style="margin-top:8px;font-size:26px;font-weight:700;">Your order is confirmed</div>
        </div>
        <div style="padding:24px;">
          <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#3d5d6b;">Hi ${customerName}, thanks for your order! Here's a summary:</p>
          <table style="width:100%;font-size:13px;color:#23434c;">${itemsHtml}</table>
          <div style="margin-top:16px;padding:14px;border-radius:10px;background:#f3fafb;border:1px solid #d4edf2;font-size:13px;">
            <div><strong>Fulfillment:</strong> ${methodLabel(deliveryMethod, courierName)}</div>
            <div style="margin-top:4px;"><strong>Date:</strong> ${new Date(requestedDate).toLocaleDateString(
              "en-PH",
              { weekday: "long", year: "numeric", month: "long", day: "numeric" },
            )}</div>
          </div>
          <p style="margin:16px 0 0;font-size:17px;font-weight:800;color:#0a4c63;">Total: ${peso(total)}</p>
        </div>
        <div style="padding:0 24px 24px;font-size:12px;color:#6b8591;">
          <div style="border-top:1px solid #e5edf1;padding-top:14px;">${businessName} · Order notification</div>
        </div>
      </div>
    </div>`;
};

const resolveScope = async (req, res) => {
  if (!ORDER_ROLES.includes(req.user.role)) {
    res.status(403).json({ message: "This account cannot access orders." });
    return null;
  }
  const ownerId = await getOwnerId(req);
  if (!ownerId) {
    res.status(404).json({ message: "Owner account not found." });
    return null;
  }
  return ownerId;
};

exports.listOrders = async (req, res) => {
  const ownerId = await resolveScope(req, res);
  if (!ownerId) return undefined;

  const orders = await Order.find({ ownerId })
    .populate("createdBy", "ownerName staffName staffPosition")
    .sort({ createdAt: -1 });

  return res.json({ orders });
};

exports.createOrder = async (req, res) => {
  const ownerId = await resolveScope(req, res);
  if (!ownerId) return undefined;

  const owner = await User.findById(ownerId).select("businessName");
  const requestedItems = Array.isArray(req.validated.items) ? req.validated.items : [];
  const discount = Math.max(0, Number(req.validated.discount) || 0);

  if (!owner?.businessName || !requestedItems.length) {
    return res.status(400).json({ message: "Order must contain at least one item." });
  }
  if (req.validated.deliveryMethod === "courier" && !req.validated.courierName) {
    return res.status(400).json({ message: "Enter the courier name for courier deliveries." });
  }

  let order;
  try {
    // Stock is reserved (decremented) the moment an order is placed, the same
    // way an instant sale reserves it — otherwise two orders could both
    // "succeed" against stock that only exists once.
    order = await withTransaction(async (session) => {
      const items = [];
      for (const requested of requestedItems) {
        const quantity = Math.floor(Number(requested.quantity));
        if (!requested.itemId || quantity < 1) {
          throw new Error("Each item must have a valid quantity.");
        }
        const item = await Fish.findOneAndUpdate(
          { _id: requested.itemId, ownerId, quantity: { $gte: quantity } },
          { $inc: { quantity: -quantity } },
          { new: true, session },
        );
        if (!item) {
          throw new Error(`Not enough stock for ${requested.name || "an inventory item"}.`);
        }
        const price = Number(item.price) || 0;
        items.push({
          itemId: item._id,
          name: item.name,
          category: item.category || "Fish",
          price,
          costPrice: Number(item.costPrice) || 0,
          quantity,
          total: price * quantity,
        });
      }

      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      const [created] = await Order.create(
        [
          {
            ownerId,
            businessName: owner.businessName,
            createdBy: req.user.userId,
            items,
            customerName: req.validated.customerName,
            customerEmail: req.validated.customerEmail || "",
            customerPhone: req.validated.customerPhone || "",
            deliveryMethod: req.validated.deliveryMethod,
            courierName: req.validated.courierName || "",
            requestedDate: req.validated.requestedDate,
            notes: req.validated.notes || "",
            subtotal,
            discount: Math.min(discount, subtotal),
            total: subtotal - Math.min(discount, subtotal),
          },
        ],
        { session },
      );
      return created;
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Order could not be created." });
  }

  await writeAudit(req, "CREATE", "Order", order._id, `Order created for ${order.customerName}.`);

  if (order.customerEmail) {
    try {
      await createTransporter().sendMail({
        from: `"${owner.businessName}" <${process.env.EMAIL_USER}>`,
        to: order.customerEmail,
        subject: `${owner.businessName} - Order Confirmation`,
        html: buildOrderEmailHtml({
          businessName: owner.businessName,
          customerName: order.customerName,
          items: order.items,
          deliveryMethod: order.deliveryMethod,
          courierName: order.courierName,
          requestedDate: order.requestedDate,
          total: order.total,
        }),
      });
      order.notificationSentAt = new Date();
      await order.save();
    } catch (emailError) {
      // The order still stands even if the email fails — losing a real order
      // over an SMTP hiccup would be worse than a missed notification.
      console.error("Order confirmation email failed:", emailError.message);
    }
  }

  return res.status(201).json({ message: "Order created successfully.", order });
};

exports.updateOrderStatus = async (req, res) => {
  const ownerId = await resolveScope(req, res);
  if (!ownerId) return undefined;

  const order = await Order.findOne({ _id: req.params.id, ownerId });
  if (!order) return res.status(404).json({ message: "Order not found." });
  if (order.saleId) {
    return res.status(400).json({ message: "This order has already been completed." });
  }

  const changes = req.validated;
  const nextDeliveryStatus = changes.deliveryStatus ?? order.deliveryStatus;
  const movingToPaid = changes.paymentStatus === "paid" && order.paymentStatus !== "paid";

  if (!movingToPaid) {
    order.deliveryStatus = nextDeliveryStatus;
    await order.save();
    await writeAudit(req, "UPDATE", "Order", order._id, "Order status updated.");
    return res.json({ message: "Order updated.", order });
  }

  // Marking an order paid is the point of no return: it becomes a Sale in
  // the same transaction, so the two records can never disagree.
  const owner = await User.findById(ownerId).select("businessName");
  const sale = await withTransaction(async (session) => {
    order.deliveryStatus = nextDeliveryStatus;
    order.paymentStatus = "paid";
    const [createdSale] = await Sale.create(
      [
        {
          ownerId,
          businessName: owner.businessName,
          soldBy: req.user.userId,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          customerPhone: order.customerPhone,
          items: order.items,
          subtotal: order.subtotal,
          discount: order.discount,
          total: order.total,
        },
      ],
      { session },
    );
    order.saleId = createdSale._id;
    await order.save({ session });
    return createdSale;
  });

  await writeAudit(
    req,
    "UPDATE",
    "Order",
    order._id,
    `Order marked paid and converted to sale ${sale._id}.`,
  );
  return res.json({ message: "Order marked as paid and recorded as a sale.", order, sale });
};

exports.cancelOrder = async (req, res) => {
  const ownerId = await resolveScope(req, res);
  if (!ownerId) return undefined;

  const order = await Order.findOne({ _id: req.params.id, ownerId });
  if (!order) return res.status(404).json({ message: "Order not found." });
  if (order.saleId) {
    return res.status(400).json({ message: "A completed order cannot be cancelled." });
  }

  await withTransaction(async (session) => {
    for (const item of order.items) {
      await Fish.updateOne(
        { _id: item.itemId, ownerId },
        { $inc: { quantity: item.quantity } },
        { session },
      );
    }
    await Order.deleteOne({ _id: order._id, ownerId }, { session });
  });

  await writeAudit(req, "DELETE", "Order", order._id, "Order cancelled and stock restored.");
  return res.json({ message: "Order cancelled and stock restored." });
};
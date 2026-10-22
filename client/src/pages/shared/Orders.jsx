import { useEffect, useMemo, useState } from "react";
import { confirmOceanicAction } from "../../utils/oceanicSwal.js";
import { formatPeso } from "./salesUtils.js";

const fieldClass = "min-h-11 rounded-xl border border-sky-100/15 bg-[#062d48] px-3 py-2.5 text-sm text-[#d9ecef] outline-none focus:border-[#73c4ca]";
const primaryClass = "inline-flex min-h-10 items-center justify-center rounded-xl bg-[#75bec4] px-4 py-2 text-sm font-semibold text-[#052d45] transition hover:bg-[#91d2d5] disabled:cursor-not-allowed disabled:opacity-50";
const secondaryClass = "inline-flex min-h-10 items-center justify-center rounded-xl border border-sky-100/20 bg-white/[.05] px-4 py-2 text-sm font-medium text-[#d9ecef] transition hover:bg-white/[.1] disabled:cursor-not-allowed disabled:opacity-50";

const fulfillmentLabels = {
  pending: "Pending",
  preparing: "Preparing",
  ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  fulfilled: "Fulfilled",
};

const nextFulfillmentStep = (order) => {
  const steps = order.deliveryMethod === "pickup"
    ? { pending: ["ready_for_pickup", "Mark ready for pickup"], ready_for_pickup: ["fulfilled", "Mark picked up"] }
    : { pending: ["preparing", "Start preparation"], preparing: ["out_for_delivery", "Mark out for delivery"], out_for_delivery: ["fulfilled", "Mark delivered"] };
  return steps[order.deliveryStatus] || null;
};

function Orders({ request, onChanged }) {
  const [orders, setOrders] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [methodFilter, setMethodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await request(`/orders?archived=${showArchived}`);
      setOrders(data.orders || []);
    } catch (requestError) {
      setError(requestError.message || "Could not load orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // This request synchronizes the page with the server when the archive view changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived]);

  const visibleOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return orders.filter((order) => {
      const methodMatches = methodFilter === "all" || order.deliveryMethod === methodFilter;
      const status = order.saleId ? "completed" : order.deliveryStatus;
      const statusMatches = statusFilter === "all" || status === statusFilter;
      const queryMatches = !normalizedQuery || [
        order.customerName,
        order.customerEmail,
        order.customerPhone,
        order.courierName,
        ...(order.items || []).map((item) => item.name),
      ].some((value) => String(value || "").toLowerCase().includes(normalizedQuery));
      return methodMatches && statusMatches && queryMatches;
    });
  }, [orders, methodFilter, statusFilter, query]);

  const updateOrder = async (order, changes) => {
    const completing = changes.paymentStatus === "paid";
    const confirm = await confirmOceanicAction({
      title: completing ? "Complete this order?" : "Update order status?",
      text: completing
        ? "This records payment and adds the completed order to sales."
        : "Confirm that the order has reached this pickup or delivery step.",
      confirmText: completing ? "Record payment & complete" : "Confirm status",
      icon: "question",
    });
    if (!confirm) return;
    setBusy(true);
    setError("");
    try {
      await request(`/orders/${order._id}`, { method: "PATCH", body: JSON.stringify(changes) });
      setSuccess(completing ? "Order completed and recorded in sales." : "Order status updated.");
      await loadOrders();
      onChanged?.();
    } catch (requestError) {
      setError(requestError.message || "Could not update the order.");
    } finally {
      setBusy(false);
    }
  };

  const moveArchive = async (order) => {
    const restore = showArchived;
    const confirm = await confirmOceanicAction({
      title: restore ? "Restore this order?" : "Archive completed order?",
      text: restore ? "It will return to the active order list." : "It will be kept in the archive and removed from active orders.",
      confirmText: restore ? "Restore" : "Archive",
      icon: "question",
    });
    if (!confirm) return;
    setBusy(true);
    try {
      await request(`/orders/${order._id}/${restore ? "restore" : "archive"}`, { method: "PATCH" });
      setSuccess(restore ? "Order restored." : "Order archived.");
      await loadOrders();
      onChanged?.();
    } catch (requestError) {
      setError(requestError.message || "Could not update the archive.");
    } finally {
      setBusy(false);
    }
  };

  const cancelOrder = async (order) => {
    const confirm = await confirmOceanicAction({
      title: "Cancel this order?",
      text: "The order will be removed and its reserved stock returned to inventory.",
      confirmText: "Cancel order",
      tone: "danger",
    });
    if (!confirm) return;
    setBusy(true);
    try {
      await request(`/orders/${order._id}`, { method: "DELETE" });
      setSuccess("Order cancelled and stock returned to inventory.");
      await loadOrders();
      onChanged?.();
    } catch (requestError) {
      setError(requestError.message || "Could not cancel the order.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="w-full max-w-7xl space-y-5">
      <div>
        <p className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-[.14em] text-[#73c4ca]">Fulfillment workflow</p>
        <h2 className="mt-1 font-['Fraunces'] text-3xl text-[#d9ecef]">Orders</h2>
        <p className="mt-1 text-sm text-[#9bbec7]">Orders placed at the POS appear here for pickup, delivery, payment, and archiving.</p>
      </div>

      {(error || success) && <p role={error ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${error ? "border-red-200/25 bg-red-200/10 text-red-100" : "border-[#75bec4]/30 bg-[#75bec4]/10 text-[#c9e8e9]"}`}>{error || success}</p>}

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-3">
        <input aria-label="Search orders" placeholder="Search customer or item" className={`${fieldClass} min-w-[180px] flex-1`} value={query} onChange={(event) => setQuery(event.target.value)} />
        <select aria-label="Fulfillment filter" className={fieldClass} value={methodFilter} onChange={(event) => setMethodFilter(event.target.value)}><option value="all">All methods</option><option value="pickup">Pickup</option><option value="rider">Rider</option><option value="courier">Courier</option></select>
        <select aria-label="Order status filter" className={fieldClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option><option value="pending">Pending</option><option value="preparing">Preparing</option><option value="ready_for_pickup">Ready for pickup</option><option value="out_for_delivery">Out for delivery</option><option value="fulfilled">Fulfilled (unpaid)</option><option value="completed">Completed</option></select>
        <button type="button" className={secondaryClass} onClick={() => { setShowArchived((value) => !value); setStatusFilter("all"); }}>{showArchived ? "View active" : "View archive"}</button>
      </div>

      <div className="space-y-3">
        {loading ? <div className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-8 text-center text-sm text-[#9bbec7]">Loading orders...</div> : visibleOrders.length === 0 ? <div className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-8 text-center text-sm text-[#9bbec7]">{showArchived ? "No archived orders match these filters." : "No active orders match these filters. Create a customer order from POS."}</div> : visibleOrders.map((order) => {
          const completed = Boolean(order.saleId);
          const nextStep = nextFulfillmentStep(order);
          const cancelable = ["pending", "preparing", "ready_for_pickup"].includes(order.deliveryStatus);
          const method = order.deliveryMethod === "pickup" ? "Customer pickup" : order.deliveryMethod === "rider" ? "Rider delivery" : `Courier delivery${order.courierName ? ` - ${order.courierName}` : ""}`;
          const requestedDate = order.requestedDate
            ? new Date(order.requestedDate).toLocaleDateString("en-PH", { dateStyle: "medium" })
            : "No requested date";
          return (
            <article key={order._id} className="min-w-0 overflow-hidden rounded-2xl border border-[#75bec4]/15 bg-[#062d48] shadow-[0_12px_30px_rgba(0,0,0,0.12)] transition-colors hover:border-[#75bec4]/35">
              <div className="flex flex-col gap-3 border-b border-white/10 bg-white/[0.025] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#75bec4]">Customer order</p>
                  <h3 className="mt-1 truncate font-['Fraunces'] text-xl text-[#e7f5f5] sm:text-2xl">{order.customerName || "Customer"}</h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${completed ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200" : order.deliveryStatus === "pending" ? "border-amber-300/25 bg-amber-300/10 text-amber-200" : "border-[#75bec4]/30 bg-[#75bec4]/10 text-[#a7e3e5]"}`}>
                    {completed ? "Completed" : order.deliveryStatus === "fulfilled" ? "Fulfilled · unpaid" : fulfillmentLabels[order.deliveryStatus] || "Pending"}
                  </span>
                  <span className={`rounded-full border px-3 py-1.5 text-xs font-medium ${order.paymentStatus === "paid" ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200" : "border-white/15 bg-white/5 text-[#b7d2d7]"}`}>
                    {order.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                  </span>
                </div>
              </div>

              <div className="grid min-w-0 gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
                <div className="min-w-0 space-y-5">
                  <div>
                    <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-[#75bec4]">Customer & fulfillment</h4>
                    <dl className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
                      <div className="min-w-0"><dt className="text-xs text-[#89afb9]">Email</dt><dd className="mt-1 break-all text-sm text-[#e0eeee]">{order.customerEmail || "Not provided"}</dd></div>
                      <div className="min-w-0"><dt className="text-xs text-[#89afb9]">Phone</dt><dd className="mt-1 break-words text-sm text-[#e0eeee]">{order.customerPhone || "Not provided"}</dd></div>
                      <div className="min-w-0"><dt className="text-xs text-[#89afb9]">Fulfillment method</dt><dd className="mt-1 break-words text-sm font-medium text-[#e0eeee]">{method}</dd></div>
                      <div className="min-w-0"><dt className="text-xs text-[#89afb9]">Requested date</dt><dd className="mt-1 text-sm text-[#e0eeee]">{requestedDate}</dd></div>
                    </dl>
                  </div>
                  {order.notes && <div className="rounded-xl border border-[#75bec4]/15 bg-[#75bec4]/[0.06] px-4 py-3"><p className="text-xs font-semibold text-[#9bd8dc]">Order note</p><p className="mt-1 whitespace-pre-wrap break-words text-sm text-[#d9ecef]">{order.notes}</p></div>}
                </div>

                <div className="min-w-0 rounded-xl border border-white/10 bg-[#041f33]/60 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2"><h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#75bec4]">Order items</h4><span className="text-xs text-[#9bbec7]">{(order.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)} pcs</span></div>
                  <ul className="max-h-52 space-y-2 overflow-y-auto pr-1 [scrollbar-color:#4c8995_transparent] [scrollbar-width:thin]">
                    {(order.items || []).map((item, index) => (
                      <li key={item.itemId || `${item.name}-${index}`} className="flex min-w-0 items-start justify-between gap-3 border-b border-white/[0.07] pb-2 last:border-0 last:pb-0">
                        <span className="min-w-0 break-words text-sm text-[#d9ecef]">{item.name || "Item"}</span>
                        <span className="shrink-0 rounded-md bg-white/[0.07] px-2 py-0.5 text-xs font-semibold text-[#b5dadd]">×{item.quantity}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex items-end justify-between gap-3 border-t border-white/10 pt-4"><span className="text-sm text-[#a3c5cb]">Order total</span><strong className="break-all text-right font-['Fraunces'] text-2xl font-semibold text-[#85d6d8]">{formatPeso(order.total)}</strong></div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 bg-[#041f33]/40 px-4 py-3 sm:px-6">
                {!completed && !showArchived && cancelable && <button disabled={busy} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-red-300/20 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-300/10 disabled:opacity-50" onClick={() => cancelOrder(order)} type="button">Cancel order</button>}
                {!completed && !showArchived && nextStep && <button disabled={busy} className={primaryClass} onClick={() => updateOrder(order, { deliveryStatus: nextStep[0] })} type="button">{nextStep[1]}</button>}
                {!completed && !showArchived && order.deliveryStatus === "fulfilled" && <button disabled={busy} className={primaryClass} onClick={() => updateOrder(order, { paymentStatus: "paid" })} type="button">Record payment & complete</button>}
                {completed && <button disabled={busy} className={secondaryClass} onClick={() => moveArchive(order)} type="button">{showArchived ? "Restore" : "Archive"}</button>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default Orders;

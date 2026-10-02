const Fish = require("../models/Fish");
const Mortality = require("../models/Mortality");
const Tank = require("../models/Tank");
const User = require("../models/User");
const getOwnerId = require("../utils/ownerScope");
const { writeAudit } = require("../utils/audit");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const config = require("../config/config");

const imageSignatures = {
  "image/jpeg": Buffer.from([0xff, 0xd8, 0xff]),
  "image/png": Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
};

function hasValidImageSignature(file) {
  const signature = imageSignatures[file.mimetype];
  return signature && file.buffer?.subarray(0, signature.length).equals(signature);
}

async function uploadMortalityPhoto(file) {
  cloudinary.config({
    cloud_name: config.cloudinaryCloudName,
    api_key: config.cloudinaryApiKey,
    api_secret: config.cloudinaryApiSecret,
    secure: true,
  });

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "fishonitory/mortality",
        resource_type: "image",
        allowed_formats: ["jpg", "png"],
        format: "webp",
        transformation: [{ width: 1600, height: 1600, crop: "limit" }],
      },
      (error, result) => (error ? reject(error) : resolve(result)),
    );
    stream.end(file.buffer);
  });
}

exports.listMortality = async (req, res) => {
  if (!['Owner', 'masterStaff'].includes(req.user.role))
    return res.status(403).json({ message: "This account cannot view mortality records." });
  const ownerId = await getOwnerId(req);
  const records = await Mortality.find({ ownerId })
    .populate("recordedBy", "ownerName staffName staffPosition role")
    .populate("tankId", "name")
    .sort({ recordedAt: -1 });
  return res.json({ records });
};

exports.createMortality = async (req, res) => {
  if (!['Owner', 'masterStaff'].includes(req.user.role))
    return res.status(403).json({ message: "This account cannot record mortality." });

  const ownerId = await getOwnerId(req);
  const quantity = Number(req.body.quantity);
  const recorderId = req.user.role === "Owner"
    ? req.body.recordedBy || req.user.userId
    : req.user.userId;
  const [tank, recordedBy] = await Promise.all([
    Tank.findOne({ _id: req.body.tankId, ownerId }).select("_id name"),
    User.findOne({
      _id: recorderId,
      $or: [
        { _id: ownerId },
        { ownerId, role: { $in: ["Staff", "masterStaff"] } },
      ],
    }).select("_id"),
  ]);
  if (!tank) return res.status(400).json({ message: "Selected facility or tank was not found." });
  if (!recordedBy) return res.status(400).json({ message: "Selected recorder does not belong to this business." });

  let photoUrl = "";
  if (req.file) {
    if (!hasValidImageSignature(req.file)) {
      return res.status(400).json({ message: "Upload a valid JPEG or PNG photo." });
    }
    if (!config.cloudinaryCloudName || !config.cloudinaryApiKey || !config.cloudinaryApiSecret) {
      return res.status(503).json({ message: "Photo uploads are not configured." });
    }
    try {
      const upload = await uploadMortalityPhoto(req.file);
      photoUrl = upload.secure_url;
    } catch {
      return res.status(502).json({ message: "Mortality photo upload failed." });
    }
  }

  const session = await mongoose.startSession();
  let record;
  try {
    await session.withTransaction(async () => {
      const fish = await Fish.findOneAndUpdate(
        { _id: req.body.fishId, ownerId, quantity: { $gte: quantity } },
        { $inc: { quantity: -quantity } }, { new: true, session },
      );
      if (!fish) throw new Error("Insufficient stock or fish item not found.");
      [record] = await Mortality.create([{
        ownerId,
        fishId: fish._id,
        tankId: tank._id,
        fishName: fish.name,
        species: fish.species,
        lifeStage: req.body.lifeStage,
        batchNumber: req.body.batchNumber || "",
        initialStockCount: Number(req.body.initialStockCount),
        quantity,
        suspectedCause: req.body.suspectedCause,
        signsObserved: req.body.signsObserved,
        treatmentGiven: req.body.treatmentGiven || "None",
        disposalMethod: req.body.disposalMethod,
        photoUrl,
        remarks: req.body.remarks || "",
        reason: `${req.body.suspectedCause}${req.body.remarks ? `: ${req.body.remarks}` : ""}`.slice(0, 500),
        recordedAt: new Date(req.body.recordedAt),
        recordedBy: recordedBy._id,
      }], { session });
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Mortality could not be recorded." });
  } finally {
    await session.endSession();
  }
  await writeAudit(req, "CREATE", "Mortality", record._id, `${record.quantity} ${record.fishName}: ${record.suspectedCause}`);
  return res.status(201).json({ message: "Mortality recorded and stock updated.", record });
};

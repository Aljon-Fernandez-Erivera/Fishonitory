const { number, objectId, oneOf, string, validate } = require("./validateInput");

const validatePurchase = validate((req) => {
  string(req.body?.supplierName, "Supplier name", { min: 2, max: 120 });
  string(req.body?.supplierContact, "Supplier contact", {
    required: false,
    max: 120,
  });
  string(req.body?.invoiceNumber, "Invoice number", {
    required: false,
    max: 80,
  });
  string(req.body?.notes, "Purchase notes", { required: false, max: 1000 });
  if (
    !Array.isArray(req.body?.items) ||
    !req.body.items.length ||
    req.body.items.length > 100
  )
    throw Object.assign(
      new Error("Purchase must contain between 1 and 100 items."),
      { statusCode: 400 },
    );
  req.body.items.forEach((item) => {
    objectId(item.fishId, "Inventory item ID");
    number(item.quantity, "Purchase quantity", {
      integer: true,
      min: 1,
      max: 100000,
    });
    number(item.unitCost, "Unit cost", { min: 0, max: 10000000 });
  });
});

const validateMortality = validate((req) => {
  objectId(req.body?.fishId, "Inventory item ID");
  objectId(req.body?.tankId, "Tank ID");
  number(req.body?.quantity, "Mortality quantity", {
    integer: true,
    min: 1,
    max: 100000,
  });
  number(req.body?.initialStockCount, "Initial stock count", {
    integer: true,
    min: 1,
    max: 1000000,
  });
  if (Number(req.body.quantity) > Number(req.body.initialStockCount)) {
    throw Object.assign(
      new Error("Number of dead fish cannot exceed the initial stock count."),
      { statusCode: 400 },
    );
  }
  string(req.body?.species, "Species / variety", { min: 1, max: 120 });
  oneOf(req.body?.lifeStage, "Life stage", [
    "Fry",
    "Juvenile",
    "Adult",
    "Broodstock",
  ]);
  oneOf(req.body?.suspectedCause, "Suspected cause", [
    "Disease",
    "Water quality",
    "Handling stress",
    "Transport",
    "Predation",
    "Cannibalism",
    "Unknown",
  ]);
  oneOf(req.body?.disposalMethod, "Disposal method", [
    "Burial",
    "Incineration",
    "Composting",
  ]);
  string(req.body?.batchNumber, "Batch / lot number", {
    required: false,
    max: 100,
  });
  string(req.body?.treatmentGiven, "Treatment given", {
    required: false,
    max: 200,
  });
  string(req.body?.remarks, "Remarks", { required: false, max: 1000 });

  const recordedAt = new Date(req.body?.recordedAt);
  if (!req.body?.recordedAt || Number.isNaN(recordedAt.getTime())) {
    throw Object.assign(new Error("A valid mortality date and time are required."), {
      statusCode: 400,
    });
  }

  let signsObserved;
  try {
    signsObserved = JSON.parse(req.body?.signsObserved || "[]");
  } catch {
    throw Object.assign(new Error("Observed signs must be a valid list."), {
      statusCode: 400,
    });
  }
  if (
    !Array.isArray(signsObserved) ||
    signsObserved.length > 5 ||
    signsObserved.some(
      (sign) =>
        !["Lethargy", "White spots", "Fin rot", "Gasping", "Red patches"].includes(sign),
    )
  ) {
    throw Object.assign(new Error("One or more observed signs are invalid."), {
      statusCode: 400,
    });
  }
  req.body.signsObserved = signsObserved;

  if (req.body.recordedBy) objectId(req.body.recordedBy, "Recorded by ID");
});

module.exports = { validateMortality, validatePurchase };

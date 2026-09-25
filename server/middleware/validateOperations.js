const { number, objectId, string, validate } = require("./validateInput");

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
  number(req.body?.quantity, "Mortality quantity", {
    integer: true,
    min: 1,
    max: 100000,
  });
  string(req.body?.reason, "Mortality reason", { min: 2, max: 500 });
});

module.exports = { validateMortality, validatePurchase };

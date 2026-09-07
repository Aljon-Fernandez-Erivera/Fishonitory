import { useState } from "react";
import { formatPeso } from "../shared/salesUtils.js";

function downloadCsv(filename, rows) {
  const csv = rows
    .map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function OwnerOperations({
  fish,
  purchases,
  mortality,
  auditLogs,
  sales,
  onPurchase,
  onMortality,
}) {
  const [purchase, setPurchase] = useState({
    supplierName: "",
    supplierContact: "",
    invoiceNumber: "",
    fishId: fish[0]?._id || "",
    quantity: "",
    unitCost: "",
    notes: "",
  });
  const [death, setDeath] = useState({
    fishId: fish[0]?._id || "",
    quantity: "",
    reason: "",
  });

  const submitPurchase = (event) => {
    event.preventDefault();
    onPurchase({
      supplierName: purchase.supplierName,
      supplierContact: purchase.supplierContact,
      invoiceNumber: purchase.invoiceNumber,
      notes: purchase.notes,
      items: [{
        fishId: purchase.fishId,
        quantity: Number(purchase.quantity),
        unitCost: Number(purchase.unitCost),
      }],
    });
    setPurchase((previous) => ({ ...previous, quantity: "", unitCost: "" }));
  };

  const submitMortality = (event) => {
    event.preventDefault();
    onMortality({
      fishId: death.fishId,
      quantity: Number(death.quantity),
      reason: death.reason,
    });
    setDeath((previous) => ({ ...previous, quantity: "", reason: "" }));
  };

  return (
    <section className="dashboard-page">
      <div className="page-heading">
        <div>
          <h2>Business Operations</h2>
          <p>Track costs, stock losses, reports, and accountability.</p>
        </div>
        <div>
          <button type="button" onClick={() => downloadCsv("sales-report.csv", [
            ["Date", "Total", "Cost", "Profit"],
            ...sales.map((sale) => [sale.createdAt, sale.total, sale.items.reduce((sum, item) => sum + (item.costPrice || 0) * item.quantity, 0), sale.total - sale.items.reduce((sum, item) => sum + (item.costPrice || 0) * item.quantity, 0)]),
          ])}>Export Sales</button>{" "}
          <button type="button" onClick={() => downloadCsv("audit-log.csv", [
            ["Date", "Action", "Entity", "Details"],
            ...auditLogs.map((log) => [log.createdAt, log.action, log.entityType, log.details]),
          ])}>Export Audit</button>
        </div>
      </div>

      <div className="operations-grid">
        <form className="report-card dashboard-form" onSubmit={submitPurchase}>
          <h3>Record Purchase</h3>
          <label>Supplier name<input required value={purchase.supplierName} onChange={(event) => setPurchase({ ...purchase, supplierName: event.target.value })} /></label>
          <label>Supplier contact<input value={purchase.supplierContact} onChange={(event) => setPurchase({ ...purchase, supplierContact: event.target.value })} /></label>
          <label>Invoice number<input value={purchase.invoiceNumber} onChange={(event) => setPurchase({ ...purchase, invoiceNumber: event.target.value })} /></label>
          <label>Inventory item<select required value={purchase.fishId} onChange={(event) => setPurchase({ ...purchase, fishId: event.target.value })}>{fish.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>
          <label>Quantity<input required type="number" min="1" value={purchase.quantity} onChange={(event) => setPurchase({ ...purchase, quantity: event.target.value })} /></label>
          <label>Unit cost<input required type="number" min="0" step="0.01" value={purchase.unitCost} onChange={(event) => setPurchase({ ...purchase, unitCost: event.target.value })} /></label>
          <label>Notes<textarea value={purchase.notes} onChange={(event) => setPurchase({ ...purchase, notes: event.target.value })} /></label>
          <button type="submit">Save Purchase and Add Stock</button>
        </form>

        <form className="report-card dashboard-form" onSubmit={submitMortality}>
          <h3>Record Mortality</h3>
          <label>Fish<select required value={death.fishId} onChange={(event) => setDeath({ ...death, fishId: event.target.value })}>{fish.filter((item) => item.category !== "Fish Food").map((item) => <option key={item._id} value={item._id}>{item.name} ({item.quantity} available)</option>)}</select></label>
          <label>Quantity<input required type="number" min="1" value={death.quantity} onChange={(event) => setDeath({ ...death, quantity: event.target.value })} /></label>
          <label>Reason<textarea required value={death.reason} onChange={(event) => setDeath({ ...death, reason: event.target.value })} /></label>
          <button type="submit">Save Mortality and Reduce Stock</button>
        </form>
      </div>

      <div className="report-card">
        <h3>Purchase History</h3>
        <ul>{purchases.map((item) => <li key={item._id}>{new Date(item.purchasedAt).toLocaleDateString()} - {item.supplierName} - {formatPeso(item.totalCost)}</li>)}</ul>
        {!purchases.length && <p>No purchases recorded.</p>}
      </div>
      <div className="report-card">
        <h3>Mortality History</h3>
        <ul>{mortality.map((item) => <li key={item._id}>{new Date(item.recordedAt).toLocaleDateString()} - {item.fishName} x{item.quantity}: {item.reason}</li>)}</ul>
        {!mortality.length && <p>No mortality records.</p>}
      </div>
      <div className="report-card">
        <h3>Audit Log</h3>
        <ul>{auditLogs.slice(0, 50).map((log) => <li key={log._id}>{new Date(log.createdAt).toLocaleString()} - {log.action} {log.entityType}: {log.details}</li>)}</ul>
        {!auditLogs.length && <p>No audit activity recorded.</p>}
      </div>
    </section>
  );
}

export default OwnerOperations;

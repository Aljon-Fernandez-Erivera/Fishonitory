import { useState } from "react";
import { formatPeso } from "../shared/salesUtils.js";

function downloadCsv(filename, rows) {
  const safeCell = (value) => {
    const text = String(value ?? "");
    return /^[=+\-@]/.test(text) ? `'${text}` : text;
  };
  const csv = rows
    .map((row) => row.map((value) => `"${safeCell(value).replaceAll('"', '""')}"`).join(","))
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

  const formClass = "grid gap-4 rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-5 shadow-[0_14px_35px_rgba(0,12,31,.14)] sm:grid-cols-2 sm:p-6 [&_h3]:col-span-full [&_h3]:m-0 [&_h3]:font-['Fraunces'] [&_h3]:text-2xl [&_h3]:font-medium [&_h3]:text-[#d9ecef] [&_label]:grid [&_label]:gap-1.5 [&_label]:font-['Poppins'] [&_label]:text-xs [&_label]:font-medium [&_label]:text-[#a9c8cf] [&_input]:box-border [&_input]:min-h-10 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-sky-100/10 [&_input]:bg-white/[.06] [&_input]:px-3 [&_input]:font-['Poppins'] [&_input]:text-sm [&_input]:text-[#d9ecef] [&_input]:outline-none [&_select]:box-border [&_select]:min-h-10 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-sky-100/10 [&_select]:bg-white/[.06] [&_select]:px-3 [&_select]:font-['Poppins'] [&_select]:text-sm [&_select]:text-[#d9ecef] [&_textarea]:box-border [&_textarea]:min-h-20 [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-sky-100/10 [&_textarea]:bg-white/[.06] [&_textarea]:p-3 [&_textarea]:font-['Poppins'] [&_textarea]:text-sm [&_textarea]:text-[#d9ecef] [&_textarea]:outline-none [&_button]:rounded-full [&_button]:bg-[#75bec4] [&_button]:px-4 [&_button]:py-2.5 [&_button]:font-['Poppins'] [&_button]:text-sm [&_button]:font-medium [&_button]:text-[#052d45]";

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[0.16em] text-[#73c4ca]">Operations & Reports</p>
          <p className="mt-3 font-['Poppins'] text-sm text-[#9bbec7]">Track costs, stock losses, reports, and accountability.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-full border border-sky-100/15 bg-white/[.05] px-4 py-2.5 font-['Poppins'] text-sm text-[#d9ecef]" type="button" onClick={() => downloadCsv("sales-report.csv", [
            ["Date", "Total", "Cost", "Profit"],
            ...sales.map((sale) => [sale.createdAt, sale.total, sale.items.reduce((sum, item) => sum + (item.costPrice || 0) * item.quantity, 0), sale.total - sale.items.reduce((sum, item) => sum + (item.costPrice || 0) * item.quantity, 0)]),
          ])}>Export Sales</button>
          <button className="rounded-full border border-sky-100/15 bg-white/[.05] px-4 py-2.5 font-['Poppins'] text-sm text-[#d9ecef]" type="button" onClick={() => downloadCsv("audit-log.csv", [
            ["Date", "Action", "Entity", "Details"],
            ...auditLogs.map((log) => [log.createdAt, log.action, log.entityType, log.details]),
          ])}>Export Audit</button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <form className={formClass} onSubmit={submitPurchase}>
          <h3>Record Purchase</h3>
          <label>Supplier name<input required value={purchase.supplierName} onChange={(event) => setPurchase({ ...purchase, supplierName: event.target.value })} /></label>
          <label>Supplier contact<input value={purchase.supplierContact} onChange={(event) => setPurchase({ ...purchase, supplierContact: event.target.value })} /></label>
          <label>Invoice number<input value={purchase.invoiceNumber} onChange={(event) => setPurchase({ ...purchase, invoiceNumber: event.target.value })} /></label>
          <label>Inventory item<select required value={purchase.fishId} onChange={(event) => setPurchase({ ...purchase, fishId: event.target.value })}>{fish.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>
          <label>Quantity<input required type="number" min="1" value={purchase.quantity} onChange={(event) => setPurchase({ ...purchase, quantity: event.target.value })} /></label>
          <label>Unit cost<input required type="number" min="0" step="0.01" value={purchase.unitCost} onChange={(event) => setPurchase({ ...purchase, unitCost: event.target.value })} /></label>
          <label>Notes<textarea value={purchase.notes} onChange={(event) => setPurchase({ ...purchase, notes: event.target.value })} /></label>
          <div className="col-span-full flex flex-wrap justify-end gap-3 pt-1">
            <button type="submit">Save Purchase and Add Stock</button>
          </div>
        </form>

        <form className={formClass} onSubmit={submitMortality}>
          <h3>Record Mortality</h3>
          <label>Fish<select required value={death.fishId} onChange={(event) => setDeath({ ...death, fishId: event.target.value })}>{fish.filter((item) => item.category !== "Fish Food").map((item) => <option key={item._id} value={item._id}>{item.name} ({item.quantity} available)</option>)}</select></label>
          <label>Quantity<input required type="number" min="1" value={death.quantity} onChange={(event) => setDeath({ ...death, quantity: event.target.value })} /></label>
          <label>Reason<textarea required value={death.reason} onChange={(event) => setDeath({ ...death, reason: event.target.value })} /></label>
          <div className="col-span-full flex flex-wrap justify-end gap-3 pt-1">
            <button type="submit">Save Mortality and Reduce Stock</button>
          </div>
        </form>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
      <div className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-5 shadow-[0_14px_35px_rgba(0,12,31,.14)] sm:p-6">
        <h3 className="m-0 font-['Fraunces'] text-2xl font-medium text-[#d9ecef]">Purchase History</h3>
        <ul className="mt-4 grid gap-2 p-0 font-['Poppins'] text-sm text-[#b7d2d7]">{purchases.map((item) => <li className="rounded-xl border border-sky-100/[.07] bg-white/[.035] px-4 py-3" key={item._id}>{new Date(item.purchasedAt).toLocaleDateString()} · {item.supplierName} · {formatPeso(item.totalCost)}</li>)}</ul>
        {!purchases.length && <p className="mt-4 font-['Poppins'] text-sm text-[#789faa]">No purchases recorded.</p>}
      </div>
      <div className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-5 shadow-[0_14px_35px_rgba(0,12,31,.14)] sm:p-6">
        <h3 className="m-0 font-['Fraunces'] text-2xl font-medium text-[#d9ecef]">Mortality History</h3>
        <ul className="mt-4 grid gap-2 p-0 font-['Poppins'] text-sm text-[#b7d2d7]">{mortality.map((item) => <li className="rounded-xl border border-sky-100/[.07] bg-white/[.035] px-4 py-3" key={item._id}>{new Date(item.recordedAt).toLocaleDateString()} · {item.fishName} x{item.quantity}: {item.reason}</li>)}</ul>
        {!mortality.length && <p className="mt-4 font-['Poppins'] text-sm text-[#789faa]">No mortality records.</p>}
      </div>
      </div>
      <div className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-5 shadow-[0_14px_35px_rgba(0,12,31,.14)] sm:p-6">
        <h3 className="m-0 font-['Fraunces'] text-2xl font-medium text-[#d9ecef]">Audit Log</h3>
        <ul className="mt-4 grid gap-2 p-0 font-['Poppins'] text-sm text-[#b7d2d7]">{auditLogs.slice(0, 50).map((log) => <li className="rounded-xl border border-sky-100/[.07] bg-white/[.035] px-4 py-3" key={log._id}>{new Date(log.createdAt).toLocaleString()} · {log.action} {log.entityType}: {log.details}</li>)}</ul>
        {!auditLogs.length && <p className="mt-4 font-['Poppins'] text-sm text-[#789faa]">No audit activity recorded.</p>}
      </div>
    </section>
  );
}

export default OwnerOperations;

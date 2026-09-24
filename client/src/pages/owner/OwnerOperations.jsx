import { useEffect, useState } from "react";
import { formatPeso } from "../shared/salesUtils.js";

function downloadCsv(filename, rows) {
  const safeCell = (value) => {
    const text = String(value ?? "");
    return /^[=+\-@]/.test(text) ? `'${text}` : text;
  };
  const csv = rows
    .map((row) =>
      row
        .map((value) => `"${safeCell(value).replaceAll('"', '""')}"`)
        .join(","),
    )
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
  const [purchaseLimit] = useState(20);
  const [mortalityLimit] = useState(20);
  const [auditLimit] = useState(20);
  const [purchaseFilter, setPurchaseFilter] = useState("all");
  const [mortalityFilter, setMortalityFilter] = useState("all");
  const [auditFilter, setAuditFilter] = useState("all");
  const [auditActionFilter, setAuditActionFilter] = useState("all");
  const [auditEntityFilter, setAuditEntityFilter] = useState("all");

  // Reading the clock is a side effect, so it happens in an effect, not
  // during render — `now` is 0 until the effect fires, then refreshes
  // periodically so date-range filters stay accurate over time.
  const [now, setNow] = useState(0);
  useEffect(() => {
    const updateNow = () => setNow(Date.now());
    updateNow();
    const interval = window.setInterval(updateNow, 60000);
    return () => window.clearInterval(interval);
  }, []);

  const getFilteredByDays = (items, days) => {
    if (days === "all" || !now) return items;
    const milliseconds = Number(days) * 24 * 60 * 60 * 1000;
    const cutoff = now - milliseconds;
    return items.filter((item) => {
      const dateValue = new Date(
        item.createdAt ||
          item.purchasedAt ||
          item.recordedAt ||
          item.date ||
          now,
      ).getTime();
      return Number.isFinite(dateValue) && dateValue >= cutoff;
    });
  };

  const filteredAuditLogs = auditLogs.filter((log) => {
    const actionMatch =
      auditActionFilter === "all" || log.action === auditActionFilter;
    const entityMatch =
      auditEntityFilter === "all" || log.entityType === auditEntityFilter;
    return actionMatch && entityMatch;
  });

  const purchaseRows = getFilteredByDays(purchases, purchaseFilter).slice(
    0,
    purchaseLimit,
  );
  const mortalityRows = getFilteredByDays(mortality, mortalityFilter).slice(
    0,
    mortalityLimit,
  );
  const auditRows = getFilteredByDays(filteredAuditLogs, auditFilter).slice(
    0,
    auditLimit,
  );

  const visiblePurchases = purchaseRows;
  const visibleMortality = mortalityRows;
  const visibleAuditLogs = auditRows;

  const submitPurchase = (event) => {
    event.preventDefault();
    onPurchase({
      supplierName: purchase.supplierName,
      supplierContact: purchase.supplierContact,
      invoiceNumber: purchase.invoiceNumber,
      notes: purchase.notes,
      items: [
        {
          fishId: purchase.fishId,
          quantity: Number(purchase.quantity),
          unitCost: Number(purchase.unitCost),
        },
      ],
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

  const formClass =
    "grid gap-4 rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-5 shadow-[0_14px_35px_rgba(0,12,31,.14)] sm:grid-cols-2 sm:p-6";
  const fieldLabelClass =
    "flex flex-col gap-1.5 font-['Poppins'] text-xs font-medium text-[#a9c8cf]";
  const inputClass =
    "min-h-10 w-full rounded-xl border border-sky-100/10 bg-white/[.06] px-3 py-2.5 font-['Poppins'] text-sm text-[#d9ecef] placeholder:text-[#7ea2aa] outline-none transition focus:border-[#73c4ca] focus:ring-2 focus:ring-[#73c4ca]/20";
  const textareaClass =
    "min-h-[88px] w-full rounded-xl border border-sky-100/10 bg-white/[.06] p-3 font-['Poppins'] text-sm text-[#d9ecef] placeholder:text-[#7ea2aa] outline-none transition focus:border-[#73c4ca] focus:ring-2 focus:ring-[#73c4ca]/20";
  const selectClass =
    "min-h-10 w-full cursor-pointer rounded-xl border border-sky-100/10 bg-white/[.06] px-3 py-2.5 font-['Poppins'] text-sm text-[#d9ecef] outline-none transition focus:border-[#73c4ca] focus:ring-2 focus:ring-[#73c4ca]/20";
  const actionButtonClass =
    "inline-flex h-10 cursor-pointer items-center justify-center whitespace-nowrap rounded-full bg-[#75bec4] px-4 py-2.5 font-['Poppins'] text-xs font-medium text-[#052d45] outline-none transition hover:bg-[#91d2d5] focus-visible:ring-2 focus-visible:ring-[#73c4ca] focus-visible:ring-offset-2 focus-visible:ring-offset-[#062d48] sm:h-11 sm:text-sm";
  const secondaryButtonClass =
    "inline-flex min-h-10 cursor-pointer items-center justify-center rounded-full border border-sky-100/15 bg-white/[.05] px-3 py-2.5 font-['Poppins'] text-xs font-medium text-[#d9ecef] outline-none transition hover:bg-white/[.1] focus-visible:ring-2 focus-visible:ring-[#73c4ca] focus-visible:ring-offset-2 focus-visible:ring-offset-[#062d48] sm:text-sm";

  const tableHeaderClass =
    "border-b border-sky-100/10 bg-white/[.025] px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-[#89afb9]";
  const tableCellClass =
    "border-b border-sky-100/[.07] px-3 py-3 align-top text-sm text-[#b7d2d7]";
  const filterSelectClass =
    "w-full cursor-pointer rounded-xl border border-sky-100/10 bg-white/[.06] px-2.5 py-2 text-xs font-medium text-[#d9ecef] outline-none transition focus:border-[#73c4ca]";
  const filterRowClass = "mb-4 flex flex-wrap items-center gap-2";

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[0.16em] text-[#73c4ca]">
            Operations & Reports
          </p>
          <p className="mt-3 font-['Poppins'] text-sm text-[#9bbec7]">
            Track costs, stock losses, reports, and accountability.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={secondaryButtonClass}
            type="button"
            onClick={() =>
              downloadCsv("sales-report.csv", [
                ["Date", "Total", "Cost", "Profit"],
                ...sales.map((sale) => [
                  sale.createdAt,
                  sale.total,
                  sale.items.reduce(
                    (sum, item) => sum + (item.costPrice || 0) * item.quantity,
                    0,
                  ),
                  sale.total -
                    sale.items.reduce(
                      (sum, item) =>
                        sum + (item.costPrice || 0) * item.quantity,
                      0,
                    ),
                ]),
              ])
            }
          >
            Export Sales
          </button>
          <button
            className={secondaryButtonClass}
            type="button"
            onClick={() =>
              downloadCsv("audit-log.csv", [
                ["Date", "Action", "Entity", "Details"],
                ...auditLogs.map((log) => [
                  log.createdAt,
                  log.action,
                  log.entityType,
                  log.details,
                ]),
              ])
            }
          >
            Export Audit
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <form
          className={`${formClass} [&_h3]:col-span-full [&_h3]:mb-1 [&_h3]:font-['Fraunces'] [&_h3]:text-2xl [&_h3]:font-medium [&_h3]:text-[#d9ecef]`}
          onSubmit={submitPurchase}
        >
          <h3>Record Purchase</h3>
          <label className={fieldLabelClass}>
            Supplier name
            <input
              className={inputClass}
              required
              value={purchase.supplierName}
              onChange={(event) =>
                setPurchase({ ...purchase, supplierName: event.target.value })
              }
            />
          </label>
          <label className={fieldLabelClass}>
            Supplier contact
            <input
              className={inputClass}
              value={purchase.supplierContact}
              onChange={(event) =>
                setPurchase({
                  ...purchase,
                  supplierContact: event.target.value,
                })
              }
            />
          </label>
          <label className={fieldLabelClass}>
            Invoice number
            <input
              className={inputClass}
              value={purchase.invoiceNumber}
              onChange={(event) =>
                setPurchase({ ...purchase, invoiceNumber: event.target.value })
              }
            />
          </label>
          <label className={fieldLabelClass}>
            Inventory item
            <select
              className={selectClass}
              required
              value={purchase.fishId}
              onChange={(event) =>
                setPurchase({ ...purchase, fishId: event.target.value })
              }
            >
              {fish.map((item) => (
                <option
                  className="bg-[#062d48]"
                  key={item._id}
                  value={item._id}
                >
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className={fieldLabelClass}>
            Quantity
            <input
              className={inputClass}
              required
              type="number"
              min="1"
              value={purchase.quantity}
              onChange={(event) =>
                setPurchase({ ...purchase, quantity: event.target.value })
              }
            />
          </label>
          <label className={fieldLabelClass}>
            Unit cost
            <input
              className={inputClass}
              required
              type="number"
              min="0"
              step="0.01"
              value={purchase.unitCost}
              onChange={(event) =>
                setPurchase({ ...purchase, unitCost: event.target.value })
              }
            />
          </label>
          <label className={`${fieldLabelClass} sm:col-span-2`}>
            Notes
            <textarea
              className={textareaClass}
              value={purchase.notes}
              onChange={(event) =>
                setPurchase({ ...purchase, notes: event.target.value })
              }
            />
          </label>
          <div className="col-span-full flex flex-wrap justify-end gap-3 pt-1">
            <button className={actionButtonClass} type="submit">
              Save Purchase and Add Stock
            </button>
          </div>
        </form>

        <form
          className={`${formClass} [&_h3]:col-span-full [&_h3]:mb-1 [&_h3]:font-['Fraunces'] [&_h3]:text-2xl [&_h3]:font-medium [&_h3]:text-[#d9ecef]`}
          onSubmit={submitMortality}
        >
          <h3>Record Mortality</h3>
          <label className={fieldLabelClass}>
            Fish
            <select
              className={selectClass}
              required
              value={death.fishId}
              onChange={(event) =>
                setDeath({ ...death, fishId: event.target.value })
              }
            >
              {fish
                .filter((item) => item.category !== "Fish Food")
                .map((item) => (
                  <option
                    className="bg-[#062d48]"
                    key={item._id}
                    value={item._id}
                  >
                    {item.name} ({item.quantity} available)
                  </option>
                ))}
            </select>
          </label>
          <label className={fieldLabelClass}>
            Quantity
            <input
              className={inputClass}
              required
              type="number"
              min="1"
              value={death.quantity}
              onChange={(event) =>
                setDeath({ ...death, quantity: event.target.value })
              }
            />
          </label>
          <label className={`${fieldLabelClass} sm:col-span-2`}>
            Reason
            <textarea
              className={textareaClass}
              required
              value={death.reason}
              onChange={(event) =>
                setDeath({ ...death, reason: event.target.value })
              }
            />
          </label>
          <div className="col-span-full flex flex-wrap justify-end gap-3 pt-1">
            <button className={actionButtonClass} type="submit">
              Save Mortality and Reduce Stock
            </button>
          </div>
        </form>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-sky-100/10 bg-[#062d48]/80">
          <div className="flex items-center justify-between gap-4 border-b border-sky-100/10 px-5 py-4">
            <h3 className="m-0 font-['Fraunces'] text-2xl text-[#d9ecef]">
              Purchase History
            </h3>
            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-300">
              {purchases.length} records
            </span>
          </div>
          <div className="p-4 sm:p-5">
            <div className={filterRowClass}>
              <label className="w-full max-w-[170px] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#789faa]">
                <span className="mb-1 block">Time range</span>
                <select
                  value={purchaseFilter}
                  onChange={(event) => setPurchaseFilter(event.target.value)}
                  className={filterSelectClass}
                >
                  <option className="bg-[#062d48]" value="all">
                    All
                  </option>
                  <option className="bg-[#062d48]" value="7">
                    7 days
                  </option>
                  <option className="bg-[#062d48]" value="30">
                    30 days
                  </option>
                  <option className="bg-[#062d48]" value="90">
                    90 days
                  </option>
                </select>
              </label>
            </div>
            <div className="max-h-72 overflow-auto rounded-xl border border-sky-100/10 bg-white/[.025]">
              <table className="min-w-full border-separate border-spacing-0">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className={tableHeaderClass}>Date</th>
                    <th className={tableHeaderClass}>Supplier</th>
                    <th className={tableHeaderClass}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePurchases.length ? (
                    visiblePurchases.map((item) => (
                      <tr key={item._id}>
                        <td className={tableCellClass}>
                          {new Date(item.purchasedAt).toLocaleDateString()}
                        </td>
                        <td className={tableCellClass}>{item.supplierName}</td>
                        <td className={tableCellClass}>
                          {formatPeso(item.totalCost)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="3"
                        className="px-3 py-4 text-sm text-[#789faa]"
                      >
                        No purchases recorded in this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-sky-100/10 bg-[#062d48]/80">
          <div className="flex items-center justify-between gap-4 border-b border-sky-100/10 px-5 py-4">
            <h3 className="m-0 font-['Fraunces'] text-2xl text-[#d9ecef]">
              Mortality History
            </h3>
            <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-300">
              {mortality.length} logs
            </span>
          </div>
          <div className="p-4 sm:p-5">
            <div className={filterRowClass}>
              <label className="w-full max-w-[170px] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#789faa]">
                <span className="mb-1 block">Time range</span>
                <select
                  value={mortalityFilter}
                  onChange={(event) => setMortalityFilter(event.target.value)}
                  className={filterSelectClass}
                >
                  <option className="bg-[#062d48]" value="all">
                    All
                  </option>
                  <option className="bg-[#062d48]" value="7">
                    7 days
                  </option>
                  <option className="bg-[#062d48]" value="30">
                    30 days
                  </option>
                  <option className="bg-[#062d48]" value="90">
                    90 days
                  </option>
                </select>
              </label>
            </div>
            <div className="max-h-72 overflow-auto rounded-xl border border-sky-100/10 bg-white/[.025]">
              <table className="min-w-full border-separate border-spacing-0">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className={tableHeaderClass}>Date</th>
                    <th className={tableHeaderClass}>Fish</th>
                    <th className={tableHeaderClass}>Quantity</th>
                    <th className={tableHeaderClass}>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleMortality.length ? (
                    visibleMortality.map((item) => (
                      <tr key={item._id}>
                        <td className={tableCellClass}>
                          {new Date(item.recordedAt).toLocaleDateString()}
                        </td>
                        <td className={tableCellClass}>{item.fishName}</td>
                        <td className={tableCellClass}>{item.quantity}</td>
                        <td className={tableCellClass}>{item.reason}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="4"
                        className="px-3 py-4 text-sm text-[#789faa]"
                      >
                        No mortality records in this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-sky-100/10 bg-[#062d48]/80">
        <div className="flex items-center justify-between gap-4 border-b border-sky-100/10 px-5 py-4">
          <h3 className="m-0 font-['Fraunces'] text-2xl text-[#d9ecef]">
            Audit Log
          </h3>
          <span className="rounded-full border border-sky-100/20 bg-white/[.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#73c4ca]">
            {auditLogs.length} entries
          </span>
        </div>
        <div className="p-4 sm:p-5">
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#789faa]">
              <span className="mb-1 block">Time range</span>
              <select
                value={auditFilter}
                onChange={(event) => setAuditFilter(event.target.value)}
                className={filterSelectClass}
              >
                <option className="bg-[#062d48]" value="all">
                  All
                </option>
                <option className="bg-[#062d48]" value="7">
                  7 days
                </option>
                <option className="bg-[#062d48]" value="30">
                  30 days
                </option>
                <option className="bg-[#062d48]" value="90">
                  90 days
                </option>
              </select>
            </label>
            <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#789faa]">
              <span className="mb-1 block">Action</span>
              <select
                value={auditActionFilter}
                onChange={(event) => setAuditActionFilter(event.target.value)}
                className={filterSelectClass}
              >
                <option className="bg-[#062d48]" value="all">
                  All
                </option>
                {[
                  ...new Set(
                    auditLogs.map((log) => log.action).filter(Boolean),
                  ),
                ].map((action) => (
                  <option className="bg-[#062d48]" key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#789faa]">
              <span className="mb-1 block">Entity</span>
              <select
                value={auditEntityFilter}
                onChange={(event) => setAuditEntityFilter(event.target.value)}
                className={filterSelectClass}
              >
                <option className="bg-[#062d48]" value="all">
                  All
                </option>
                {[
                  ...new Set(
                    auditLogs.map((log) => log.entityType).filter(Boolean),
                  ),
                ].map((entity) => (
                  <option className="bg-[#062d48]" key={entity} value={entity}>
                    {entity}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="max-h-72 overflow-auto rounded-xl border border-sky-100/10 bg-white/[.025]">
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 backdrop-blur-2xl">
                <tr>
                  <th className={tableHeaderClass}>Date</th>
                  <th className={tableHeaderClass}>Action</th>
                  <th className={tableHeaderClass}>Entity</th>
                  <th className={tableHeaderClass}>Details</th>
                </tr>
              </thead>
              <tbody>
                {visibleAuditLogs.length ? (
                  visibleAuditLogs.map((log) => (
                    <tr key={log._id}>
                      <td className={tableCellClass}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className={tableCellClass}>{log.action}</td>
                      <td className={tableCellClass}>{log.entityType}</td>
                      <td className={tableCellClass}>{log.details}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="4"
                      className="px-3 py-4 text-sm text-[#789faa]"
                    >
                      No audit activity in this range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

export default OwnerOperations;
import { useEffect, useState } from "react";
import { formatPeso } from "../shared/salesUtils.js";
import MortalityReportForm from "../../components/MortalityReportForm.jsx";

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
  const url = URL.createObjectURL(
    new Blob([csv], {
      type: "text/csv;charset=utf-8",
    }),
  );

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function OwnerOperations({
  fish = [],
  tanks = [],
  staff = [],
  user,
  purchases = [],
  mortality = [],
  auditLogs = [],
  sales = [],
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

  const [purchaseFormOpen, setPurchaseFormOpen] = useState(false);
  const [mortalityFormOpen, setMortalityFormOpen] = useState(false);

  const [purchaseLimit] = useState(20);
  const [mortalityLimit] = useState(20);
  const [auditLimit] = useState(20);

  const [purchaseFilter, setPurchaseFilter] = useState("all");
  const [mortalityFilter, setMortalityFilter] = useState("all");
  const [auditFilter, setAuditFilter] = useState("all");
  const [auditActionFilter, setAuditActionFilter] = useState("all");
  const [auditEntityFilter, setAuditEntityFilter] = useState("all");

  const [now, setNow] = useState(0);

  useEffect(() => {
    const updateNow = () => setNow(Date.now());

    updateNow();

    const interval = window.setInterval(updateNow, 60000);

    return () => window.clearInterval(interval);
  }, []);

  const defaultPurchaseFishId = purchase.fishId || fish[0]?._id || "";

  const totalPurchaseCost = purchases.reduce(
    (total, item) => total + Number(item.totalCost || 0),
    0,
  );

  const totalMortality = mortality.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0,
  );

  const getFilteredByDays = (items, days) => {
    if (days === "all" || !now) {
      return items;
    }

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

  const visiblePurchases = getFilteredByDays(
    purchases,
    purchaseFilter,
  ).slice(0, purchaseLimit);

  const visibleMortality = getFilteredByDays(
    mortality,
    mortalityFilter,
  ).slice(0, mortalityLimit);

  const visibleAuditLogs = getFilteredByDays(
    filteredAuditLogs,
    auditFilter,
  ).slice(0, auditLimit);

  const submitPurchase = async (event) => {
    event.preventDefault();

    if (!defaultPurchaseFishId) {
      return;
    }

    const result = await onPurchase({
      supplierName: purchase.supplierName.trim(),
      supplierContact: purchase.supplierContact.trim(),
      invoiceNumber: purchase.invoiceNumber.trim(),
      notes: purchase.notes.trim(),
      items: [
        {
          fishId: defaultPurchaseFishId,
          quantity: Number(purchase.quantity),
          unitCost: Number(purchase.unitCost),
        },
      ],
    });

    if (result === false) {
      return;
    }

    setPurchase({
      supplierName: "",
      supplierContact: "",
      invoiceNumber: "",
      fishId: fish[0]?._id || "",
      quantity: "",
      unitCost: "",
      notes: "",
    });

    setPurchaseFormOpen(false);
  };


  // all shared classes ng mga elements sa page
  const fieldLabelClass =
    "flex flex-col gap-1.5 font-['Poppins'] text-xs font-medium text-[#a9c8cf]";

  const inputClass =
    "min-h-11 w-full rounded-xl border border-sky-100/10 bg-white/[.06] px-3 py-2.5 font-['Poppins'] text-sm text-[#d9ecef] placeholder:text-[#7ea2aa] outline-none transition focus:border-[#73c4ca] focus:ring-2 focus:ring-[#73c4ca]/20";

  const textareaClass =
    "min-h-[92px] w-full resize-none rounded-xl border border-sky-100/10 bg-white/[.06] p-3 font-['Poppins'] text-sm text-[#d9ecef] placeholder:text-[#7ea2aa] outline-none transition focus:border-[#73c4ca] focus:ring-2 focus:ring-[#73c4ca]/20";

  const selectClass =
    "min-h-11 w-full cursor-pointer rounded-xl border border-sky-100/10 bg-white/[.06] px-3 py-2.5 font-['Poppins'] text-sm text-[#d9ecef] outline-none transition focus:border-[#73c4ca] focus:ring-2 focus:ring-[#73c4ca]/20";

  const actionButtonClass =
    "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-[#75bec4] px-4 py-2.5 font-['Poppins'] text-sm font-semibold text-[#052d45] outline-none transition hover:bg-[#91d2d5] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50";

  const secondaryButtonClass =
    "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-sky-100/15 bg-white/[.04] px-4 py-2.5 font-['Poppins'] text-sm font-medium text-[#c9e1e5] outline-none transition hover:border-[#73c4ca]/40 hover:bg-white/[.08] active:scale-[.98]";

  const tableHeaderClass =
    "border-b border-sky-100/10 bg-[#062d48] px-3 py-3 text-left font-['Poppins'] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#89afb9]";

  const tableCellClass =
    "border-b border-sky-100/[.07] px-3 py-3 align-top font-['Poppins'] text-sm text-[#b7d2d7]";

  const filterSelectClass =
    "w-full cursor-pointer rounded-xl border border-sky-100/10 bg-white/[.06] px-2.5 py-2 font-['Poppins'] text-xs font-medium text-[#d9ecef] outline-none transition focus:border-[#73c4ca]";

  // Shared by Purchase history, Mortality report, and Audit log — stays
  // neutral so the mortality identity lives only on the mortality-specific
  // accents below, not on every card that happens to reuse this class.
  const reportCardClass =
    "overflow-hidden rounded-2xl border border-sky-100/10 bg-[#062d48]/80 shadow-[0_10px_30px_rgba(0,12,31,.12)]";

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[0.16em] text-[#73c4ca]">
            Operations & Reports
          </p>

          <h2 className="mt-2 font-['Fraunces'] text-3xl font-medium text-[#d9ecef]">
            Business operations
          </h2>

          <p className="mt-2 font-['Poppins'] text-sm text-[#9bbec7]">
            Track purchases, stock losses, reports, and business
            accountability.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className={secondaryButtonClass}
            type="button"
            onClick={() =>
              downloadCsv("sales-report.csv", [
                ["Date", "Total", "Cost", "Profit"],
                ...sales.map((sale) => {
                  const cost = sale.items.reduce(
                    (sum, item) =>
                      sum + Number(item.costPrice || 0) * Number(item.quantity || 0),
                    0,
                  );

                  return [
                    sale.createdAt,
                    sale.total,
                    cost,
                    Number(sale.total || 0) - cost,
                  ];
                }),
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
                ["Date", "User Email", "Action", "Entity", "Details"],
                ...auditLogs.map((log) => [
                  log.createdAt,
                  log.actorId?.email || "",
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

      {/* QUICK SUMMARY */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-sky-100/10 bg-[#062d48]/65 p-4 shadow-[0_8px_24px_rgba(0,12,31,.1)]">
          <p className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#89afb9]">
            Purchase records
          </p>
          <p className="mt-2 font-['Fraunces'] text-3xl font-medium text-[#d9ecef]">
            {purchases.length}
          </p>
        </article>

        <article className="rounded-2xl border border-sky-100/10 bg-[#062d48]/65 p-4 shadow-[0_8px_24px_rgba(0,12,31,.1)]">
          <p className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#89afb9]">
            Purchase cost
          </p>
          <p className="mt-2 font-['Fraunces'] text-2xl font-medium text-[#73c4ca]">
            {formatPeso(totalPurchaseCost)}
          </p>
        </article>

        <article className="rounded-2xl border border-rose-300/15 bg-[#062d48]/65 p-4 shadow-[0_8px_24px_rgba(0,12,31,.1)]">
          <p className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#89afb9]">
            Mortality reports
          </p>
          <p className="mt-2 font-['Fraunces'] text-3xl font-medium text-[#d9ecef]">
            {mortality.length}
          </p>
        </article>

        <article className="rounded-2xl border border-rose-300/15 bg-[#062d48]/65 p-4 shadow-[0_8px_24px_rgba(0,12,31,.1)]">
          <p className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#89afb9]">
            Fish recorded dead
          </p>
          <p className="mt-2 font-['Fraunces'] text-3xl font-medium text-rose-300">
            {totalMortality}
          </p>
        </article>
      </div>

      {/* PURCHASE MODAL */}
      {purchaseFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#010d1c]/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setPurchaseFormOpen(false);
            }
          }}
        >
          <div
            className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-y-auto rounded-t-3xl border border-sky-100/15 bg-[#062d48] p-4 shadow-2xl sm:max-h-[88vh] sm:rounded-2xl sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="purchase-dialog-title"
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20 sm:hidden" />

            <div className="mb-5 flex items-center justify-between border-b border-sky-100/10 pb-4">
              <div>
                <p className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-[.15em] text-[#73c4ca]">
                  Operations
                </p>

                <h3
                  id="purchase-dialog-title"
                  className="mt-1 font-['Fraunces'] text-2xl font-medium text-[#d9ecef]"
                >
                  Record purchase
                </h3>

                <p className="mt-1 font-['Poppins'] text-xs text-[#9bbec7]">
                  Add new stock from a supplier.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPurchaseFormOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-xl border border-sky-100/10 bg-white/[.05] text-[#a8c6cc] transition hover:bg-white/[.1] hover:text-[#d9ecef]"
                aria-label="Close purchase form"
              >
                <CloseIcon />
              </button>
            </div>

            <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitPurchase}>
              <label className={fieldLabelClass}>
                Supplier name
                <input
                  className={inputClass}
                  type="text"
                  maxLength={120}
                  placeholder="Example: Dagupan Aquatic Supplier"
                  value={purchase.supplierName}
                  onChange={(event) =>
                    setPurchase((current) => ({
                      ...current,
                      supplierName: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className={fieldLabelClass}>
                Supplier contact
                <input
                  className={inputClass}
                  type="text"
                  maxLength={120}
                  placeholder="Optional. Example: 0917 123 4567"
                  value={purchase.supplierContact}
                  onChange={(event) =>
                    setPurchase((current) => ({
                      ...current,
                      supplierContact: event.target.value,
                    }))
                  }
                />
              </label>

              <label className={fieldLabelClass}>
                Invoice number
                <input
                  className={inputClass}
                  type="text"
                  maxLength={80}
                  placeholder="Optional. Example: INV-2026-001"
                  value={purchase.invoiceNumber}
                  onChange={(event) =>
                    setPurchase((current) => ({
                      ...current,
                      invoiceNumber: event.target.value,
                    }))
                  }
                />
              </label>

              <label className={fieldLabelClass}>
                Inventory item
                <select
                  className={selectClass}
                  value={defaultPurchaseFishId}
                  onChange={(event) =>
                    setPurchase((current) => ({
                      ...current,
                      fishId: event.target.value,
                    }))
                  }
                  required
                >
                  <option className="bg-[#062d48]" value="" disabled>
                    Select an inventory item
                  </option>

                  {fish.map((item) => (
                    <option
                      className="bg-[#062d48]"
                      key={item._id}
                      value={item._id}
                    >
                      {item.name}
                      {item.species ? ` · ${item.species}` : ""}
                      {item.tankId?.name ? ` · ${item.tankId.name}` : ""}
                      {` (stock ${item.quantity})`}
                    </option>
                  ))}
                </select>
              </label>

              <label className={fieldLabelClass}>
                Quantity
                <input
                  className={inputClass}
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  placeholder="Example: 10"
                  value={purchase.quantity}
                  onChange={(event) =>
                    setPurchase((current) => ({
                      ...current,
                      quantity: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className={fieldLabelClass}>
                Unit cost
                <input
                  className={inputClass}
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="Example: 25.00"
                  value={purchase.unitCost}
                  onChange={(event) =>
                    setPurchase((current) => ({
                      ...current,
                      unitCost: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className={`${fieldLabelClass} sm:col-span-2`}>
                Notes
                <textarea
                  className={textareaClass}
                  placeholder="Optional note, such as: Delivered in good condition."
                  value={purchase.notes}
                  onChange={(event) =>
                    setPurchase((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  maxLength={1000}
                />
              </label>

              <div className="col-span-full grid grid-cols-2 gap-2 border-t border-sky-100/10 pt-4">
                <button className={actionButtonClass} type="submit">
                  Save purchase
                </button>

                <button
                  className={secondaryButtonClass}
                  type="button"
                  onClick={() => setPurchaseFormOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MORTALITY MODAL */}
      {mortalityFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#010d1c]/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setMortalityFormOpen(false);
            }
          }}
        >
          <div
            className="max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-sky-100/15 bg-[#062d48] p-4 shadow-2xl sm:max-h-[88vh] sm:rounded-2xl sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mortality-dialog-title"
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20 sm:hidden" />

            <div className="mb-5 flex items-center justify-between border-b border-sky-100/10 pb-4">
              <div>
                <p className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-[.15em] text-rose-200">
                  Operations
                </p>

                <h3
                  id="mortality-dialog-title"
                  className="mt-1 font-['Fraunces'] text-2xl font-medium text-[#d9ecef]"
                >
                  Report mortality
                </h3>

                <p className="mt-1 font-['Poppins'] text-xs text-[#9bbec7]">
                  Record fish loss and update available stock.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMortalityFormOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-xl border border-sky-100/10 bg-white/[.05] text-[#a8c6cc] transition hover:bg-white/[.1] hover:text-[#d9ecef]"
                aria-label="Close mortality form"
              >
                <CloseIcon />
              </button>
            </div>

            <MortalityReportForm
              fish={fish}
              tanks={tanks}
              staff={staff}
              user={user}
              onSubmit={async (payload) => {
                const result = await onMortality(payload);

                if (result !== false) {
                  setMortalityFormOpen(false);
                }

                return result;
              }}
            />
          </div>
        </div>
      )}

      {/* PURCHASE AND MORTALITY REPORTS */}
      <div className="grid gap-6 xl:grid-cols-2">
        <div className={reportCardClass}>
          <div className="flex items-center justify-between gap-4 border-b border-sky-100/10 px-5 py-4">
            <div>
              <p className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-[.12em] text-[#73c4ca]">
                Stock activity
              </p>

              <h3 className="mt-1 font-['Fraunces'] text-2xl text-[#d9ecef]">
                Purchase history
              </h3>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 font-['Poppins'] text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-300">
                {purchases.length} records
              </span>

              <button
                type="button"
                onClick={() => setPurchaseFormOpen(true)}
                className="inline-flex items-center gap-1 rounded-full border border-[#73c4ca]/30 bg-[#73c4ca]/10 px-3 py-1.5 font-['Poppins'] text-xs font-semibold text-[#bce9e9] transition hover:bg-[#73c4ca]/20 active:scale-[.98]"
              >
                + Add Purchase
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <label className="w-full max-w-[170px] font-['Poppins'] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#789faa]">
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
                    Last 7 days
                  </option>
                  <option className="bg-[#062d48]" value="30">
                    Last 30 days
                  </option>
                  <option className="bg-[#062d48]" value="90">
                    Last 90 days
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
                    <th className={tableHeaderClass}>Items</th>
                    <th className={tableHeaderClass}>Total</th>
                  </tr>
                </thead>

                <tbody>
                  {visiblePurchases.length ? (
                    visiblePurchases.map((item) => (
                      <tr
                        key={item._id}
                        className="transition hover:bg-white/[.035]"
                      >
                        <td className={tableCellClass}>
                          {item.purchasedAt
                            ? new Date(item.purchasedAt).toLocaleDateString()
                            : "—"}
                        </td>

                        <td className={tableCellClass}>
                          {item.supplierName || "—"}
                        </td>

                        <td className={tableCellClass}>
                          {item.items?.length
                            ? item.items
                                .map((line) => `${line.name} × ${line.quantity}`)
                                .join(", ")
                            : "—"}
                        </td>

                        <td className="border-b border-sky-100/[.07] px-3 py-3 font-['Fraunces'] text-base font-bold text-[#73c4ca]">
                          {formatPeso(item.totalCost)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="4"
                        className="px-3 py-8 text-center font-['Poppins'] text-sm text-[#789faa]"
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

        <div className={reportCardClass}>
          <div className="flex items-center justify-between gap-4 border-b border-sky-100/10 px-5 py-4">
            <div>
              <p className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-[.12em] text-rose-300">
                Stock health
              </p>

              <h3 className="mt-1 font-['Fraunces'] text-2xl text-[#d9ecef]">
                Mortality report
              </h3>

              <p className="mt-1 font-['Poppins'] text-xs text-[#9bbec7]">
                {mortality.length} reports · {totalMortality} fish recorded dead
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-full border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 font-['Poppins'] text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-300">
                Monitor
              </span>

              <button
                type="button"
                onClick={() => setMortalityFormOpen(true)}
                className="inline-flex items-center gap-1 rounded-full border border-rose-300/30 bg-rose-300/10 px-3 py-1.5 font-['Poppins'] text-xs font-semibold text-rose-100 transition hover:bg-rose-300/20 active:scale-[.98]"
              >
                + Report Mortality
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <label className="w-full max-w-[170px] font-['Poppins'] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#789faa]">
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
                    Last 7 days
                  </option>
                  <option className="bg-[#062d48]" value="30">
                    Last 30 days
                  </option>
                  <option className="bg-[#062d48]" value="90">
                    Last 90 days
                  </option>
                </select>
              </label>
            </div>

            <div className="max-h-72 overflow-auto rounded-xl border border-sky-100/10 bg-white/[.025]">
              <table className="min-w-[780px] border-separate border-spacing-0">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className={tableHeaderClass}>Date</th>
                    <th className={tableHeaderClass}>Recorded by</th>
                    <th className={tableHeaderClass}>Facility</th>
                    <th className={tableHeaderClass}>Species / stage</th>
                    <th className={tableHeaderClass}>Dead / start</th>
                    <th className={tableHeaderClass}>Cause / treatment</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleMortality.length ? (
                    visibleMortality.map((item) => (
                      <tr
                        key={item._id}
                        className="transition hover:bg-white/[.035]"
                      >
                        <td className={tableCellClass}>
                          {item.recordedAt
                            ? new Date(item.recordedAt).toLocaleString()
                            : "—"}
                        </td>

                        <td className={tableCellClass}>
                          {item.recordedBy?.staffName ||
                            item.recordedBy?.ownerName ||
                            "Unknown"}
                        </td>

                        <td className={tableCellClass}>
                          {item.tankId?.name || "—"}
                        </td>

                        <td className={tableCellClass}>
                          {item.species || item.fishName || "—"} ·{" "}
                          {item.lifeStage || "—"}
                        </td>

                        <td className={tableCellClass}>
                          {item.quantity} / {item.initialStockCount ?? "—"}
                        </td>

                        <td className={tableCellClass}>
                          <span className="block">
                            {item.suspectedCause || item.reason || "—"}
                          </span>

                          {item.treatmentGiven &&
                            item.treatmentGiven !== "None" &&
                            item.treatmentGiven !==
                              "None / no treatment given" && (
                              <span className="mt-1 block text-xs text-[#89afb9]">
                                {item.treatmentGiven}
                              </span>
                            )}

                          {item.photoUrl && (
                            <a
                              className="mt-1 block w-fit text-xs text-[#73c4ca] underline"
                              href={item.photoUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              View photo
                            </a>
                          )}

                          <details className="mt-2 text-xs text-[#a9c8cf]">
                            <summary className="cursor-pointer text-[#73c4ca]">
                              Full report
                            </summary>

                            <dl className="mt-2 grid gap-1.5">
                              <div>
                                <dt className="inline text-[#789faa]">
                                  Batch:{" "}
                                </dt>
                                <dd className="inline">
                                  {item.batchNumber || "—"}
                                </dd>
                              </div>

                              <div>
                                <dt className="inline text-[#789faa]">
                                  Signs:{" "}
                                </dt>
                                <dd className="inline">
                                  {item.signsObserved?.length
                                    ? item.signsObserved.join(", ")
                                    : "None reported"}
                                </dd>
                              </div>

                              <div>
                                <dt className="inline text-[#789faa]">
                                  Disposal:{" "}
                                </dt>
                                <dd className="inline">
                                  {item.disposalMethod || "—"}
                                </dd>
                              </div>

                              <div>
                                <dt className="inline text-[#789faa]">
                                  Remarks:{" "}
                                </dt>
                                <dd className="inline">
                                  {item.remarks || "—"}
                                </dd>
                              </div>
                            </dl>
                          </details>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-3 py-8 text-center font-['Poppins'] text-sm text-[#789faa]"
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

      {/* AUDIT LOG */}
      <div className={reportCardClass}>
        <div className="flex items-center justify-between gap-4 border-b border-sky-100/10 px-5 py-4">
          <div>
            <p className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-[.12em] text-[#73c4ca]">
              Accountability
            </p>

            <h3 className="mt-1 font-['Fraunces'] text-2xl text-[#d9ecef]">
              Audit log
            </h3>
          </div>

          <span className="rounded-full border border-sky-100/20 bg-white/[.06] px-2.5 py-1 font-['Poppins'] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#73c4ca]">
            {auditLogs.length} entries
          </span>
        </div>

        <div className="p-4 sm:p-5">
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <label className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#789faa]">
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
                  Last 7 days
                </option>
                <option className="bg-[#062d48]" value="30">
                  Last 30 days
                </option>
                <option className="bg-[#062d48]" value="90">
                  Last 90 days
                </option>
              </select>
            </label>

            <label className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#789faa]">
              <span className="mb-1 block">Action</span>

              <select
                value={auditActionFilter}
                onChange={(event) =>
                  setAuditActionFilter(event.target.value)
                }
                className={filterSelectClass}
              >
                <option className="bg-[#062d48]" value="all">
                  All actions
                </option>

                {[...new Set(auditLogs.map((log) => log.action).filter(Boolean))].map(
                  (action) => (
                    <option
                      className="bg-[#062d48]"
                      key={action}
                      value={action}
                    >
                      {action}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#789faa]">
              <span className="mb-1 block">Entity</span>

              <select
                value={auditEntityFilter}
                onChange={(event) =>
                  setAuditEntityFilter(event.target.value)
                }
                className={filterSelectClass}
              >
                <option className="bg-[#062d48]" value="all">
                  All entities
                </option>

                {[
                  ...new Set(
                    auditLogs.map((log) => log.entityType).filter(Boolean),
                  ),
                ].map((entity) => (
                  <option
                    className="bg-[#062d48]"
                    key={entity}
                    value={entity}
                  >
                    {entity}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="max-h-72 overflow-auto rounded-xl border border-sky-100/10 bg-white/[.025]">
            <table className="min-w-[760px] w-full border-separate border-spacing-0">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className={tableHeaderClass}>Date</th>
                  <th className={tableHeaderClass}>User email</th>
                  <th className={tableHeaderClass}>Action</th>
                  <th className={tableHeaderClass}>Entity</th>
                  <th className={tableHeaderClass}>Details</th>
                </tr>
              </thead>

              <tbody>
                {visibleAuditLogs.length ? (
                  visibleAuditLogs.map((log) => (
                    <tr
                      key={log._id}
                      className="transition hover:bg-white/[.035]"
                    >
                      <td className={tableCellClass}>
                        {log.createdAt
                          ? new Date(log.createdAt).toLocaleString()
                          : "—"}
                      </td>

                      <td className={tableCellClass}>
                        {log.actorId?.email || "—"}
                      </td>

                      <td className={tableCellClass}>{log.action || "—"}</td>

                      <td className={tableCellClass}>
                        {log.entityType || "—"}
                      </td>

                      <td className={tableCellClass}>{log.details || "—"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-3 py-8 text-center font-['Poppins'] text-sm text-[#789faa]"
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
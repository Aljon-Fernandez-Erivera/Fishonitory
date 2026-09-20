import { useState, useMemo } from "react";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

function formatPeso(amount) {
  return peso.format(amount || 0);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getSalesForRange(sales, startDate, endDate) {
  if (!sales) return [];
  return sales.filter((sale) => {
    const saleDate = new Date(sale.createdAt || sale.date).toISOString().slice(0, 10);
    if (startDate && saleDate < startDate) return false;
    if (endDate && saleDate > endDate) return false;
    return true;
  });
}

function printIndividualReceipt(sale, businessName = "Fishonitory") {
  const popup = window.open("", "_blank", "width=400,height=600");
  if (!popup) return;

  const itemsHtml = (sale.items || [])
    .map(
      (item) => `
      <tr>
        <td style="padding: 4px 0;">${escapeHtml(item.name)} x${escapeHtml(item.quantity)}</td>
        <td style="text-align: right; padding: 4px 0;">${formatPeso(item.total || item.price * item.quantity)}</td>
      </tr>
    `
    )
    .join("");

  const cashierName =
    sale.soldBy?.staffName || sale.soldBy?.ownerName || sale.cashier || "Store Staff";
  const nameToUse = sale.businessName || businessName;

  popup.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(nameToUse)} - Receipt #${escapeHtml((sale._id || "").slice(-6))}</title>
        <style>
          body { font-family: monospace; font-size: 12px; margin: 12px; color: #000; }
          h2 { text-align: center; margin: 0 0 4px 0; font-size: 16px; }
          p { margin: 2px 0; text-align: center; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; }
          .right { text-align: right; }
          .bold { font-weight: bold; }
        </style>
      </head>
      <body>
        <h2>${escapeHtml(nameToUse)}</h2>
        <p>Official Sales Receipt</p>
        <p>Date: ${new Date(sale.createdAt || sale.date || Date.now()).toLocaleString()}</p>
        <p>Cashier: ${escapeHtml(cashierName)}</p>
        <div class="divider"></div>
        <table>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div class="divider"></div>
        <table>
          <tr>
            <td>Subtotal</td>
            <td class="right">${formatPeso(sale.subtotal)}</td>
          </tr>
          ${
            sale.discount > 0
              ? `<tr><td>Discount</td><td class="right">-${formatPeso(sale.discount)}</td></tr>`
              : ""
          }
          <tr class="bold">
            <td>Total Paid</td>
            <td class="right">${formatPeso(sale.total)}</td>
          </tr>
        </table>
        <div class="divider"></div>
        <p style="margin-top: 12px;">Thank you for your purchase!</p>
        <script>
          window.onload = function() { window.print(); window.close(); };
        </script>
      </body>
    </html>
  `);
  popup.document.close();
}

function printSummaryReport(filteredSales, totalRevenue, startDate, endDate, businessName = "Fishonitory") {
  const popup = window.open("", "_blank", "width=760,height=900");
  if (!popup) return;

  const dateRangeStr =
    startDate && endDate
      ? `${startDate} to ${endDate}`
      : startDate
      ? `From ${startDate}`
      : endDate
      ? `Until ${endDate}`
      : "All-Time Records";

  const rowsHtml = filteredSales
    .map((sale) => {
      const cashierName =
        sale.soldBy?.staffName || sale.soldBy?.ownerName || sale.cashier || "System";
      const itemsList = (sale.items || [])
        .map((i) => `${i.name} (x${i.quantity})`)
        .join(", ");
      return `
        <tr>
          <td>${escapeHtml(new Date(sale.createdAt || sale.date).toLocaleString())}</td>
          <td>${escapeHtml(cashierName)}</td>
          <td>${escapeHtml(itemsList)}</td>
          <td style="text-align: right;">${formatPeso(sale.total)}</td>
        </tr>
      `;
    })
    .join("");

  popup.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(businessName)} - Sales Summary Report</title>
        <style>
          body { font-family: Arial, sans-serif; color: #12313b; padding: 36px; max-width: 720px; margin: auto; }
          header { border-bottom: 3px solid #398e96; padding-bottom: 16px; margin-bottom: 24px; }
          h1 { margin: 0; color: #135867; font-size: 24px; }
          .meta { color: #52757e; font-size: 13px; margin-top: 4px; }
          .kpi-grid { display: flex; gap: 16px; margin-bottom: 24px; }
          .kpi-card { flex: 1; background: #f0f7f8; border: 1px solid #d0e3e5; padding: 14px; border-radius: 8px; }
          .kpi-title { font-size: 11px; text-transform: uppercase; color: #52757e; font-weight: bold; margin: 0 0 6px 0; }
          .kpi-value { font-size: 20px; font-weight: bold; color: #135867; margin: 0; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 16px; }
          th { text-align: left; padding: 8px; border-bottom: 2px solid #398e96; background: #e8f2f4; text-transform: uppercase; font-size: 10px; color: #135867; }
          td { padding: 8px; border-bottom: 1px solid #d9e5e6; color: #23434c; }
          .footer { margin-top: 32px; font-size: 11px; text-align: center; color: #789faa; border-top: 1px solid #d9e5e6; padding-top: 12px; }
        </style>
      </head>
      <body>
        <header>
          <h1>${escapeHtml(businessName)}</h1>
          <div class="meta">Sales Summary Report · <strong>${escapeHtml(dateRangeStr)}</strong></div>
          <div class="meta">Generated: ${new Date().toLocaleString()}</div>
        </header>

        <div class="kpi-grid">
          <div class="kpi-card">
            <p class="kpi-title">Total Revenue</p>
            <p class="kpi-value">${formatPeso(totalRevenue)}</p>
          </div>
          <div class="kpi-card">
            <p class="kpi-title">Transactions</p>
            <p class="kpi-value">${filteredSales.length}</p>
          </div>
          <div class="kpi-card">
            <p class="kpi-title">Avg. Transaction</p>
            <p class="kpi-value">${formatPeso(filteredSales.length ? totalRevenue / filteredSales.length : 0)}</p>
          </div>
        </div>

        <h3 style="margin-bottom: 4px; color: #135867;">Transaction Breakdown</h3>
        <table>
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Cashier</th>
              <th>Items</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="4" style="text-align:center;">No transaction records for this period.</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          End of Report — ${escapeHtml(businessName)}
        </div>

        <script>
          window.onload = function() { window.print(); window.close(); };
        </script>
      </body>
    </html>
  `);
  popup.document.close();
}

const inputClass =
  "min-h-10 rounded-xl border border-sky-100/10 bg-white/[.06] px-3 font-['Poppins'] text-sm text-[#d9ecef] outline-none [color-scheme:dark] focus:border-[#73c4ca]";

function Sales({ sales = [], startDate, endDate, onDateChange, businessName = "Fishonitory" }) {
  const [selectedSale, setSelectedSale] = useState(null);

  const filteredSales = useMemo(
    () => getSalesForRange(sales, startDate, endDate),
    [sales, startDate, endDate]
  );

  const totalRevenue = useMemo(
    () => filteredSales.reduce((sum, s) => sum + Number(s.total || 0), 0),
    [filteredSales]
  );

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6">
      {/* Header & Date Controls */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[.16em] text-[#73c4ca]">
            Revenue Tracker
          </p>
          <p className="mt-3 font-['Poppins'] text-sm text-[#9bbec7]">
            Sales Record
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="grid gap-1.5 font-['Poppins'] text-xs text-[#a9c8cf]">
            From
            <input
              className={inputClass}
              type="date"
              value={startDate || ""}
              max={endDate || undefined}
              onChange={(e) => onDateChange?.("startDate", e.target.value)}
            />
          </label>
          <label className="grid gap-1.5 font-['Poppins'] text-xs text-[#a9c8cf]">
            To
            <input
              className={inputClass}
              type="date"
              value={endDate || ""}
              min={startDate || undefined}
              onChange={(e) => onDateChange?.("endDate", e.target.value)}
            />
          </label>

          <button
            type="button"
            onClick={() =>
              printSummaryReport(filteredSales, totalRevenue, startDate, endDate, businessName)
            }
            className="h-10 rounded-xl bg-[#73c4ca] px-4 font-['Poppins'] text-xs font-semibold text-[#062d48] transition hover:bg-[#bce9e9]"
          >
            Print Sales Summary
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-sky-100/10 bg-white/[.035] p-5">
          <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[.14em] text-[#73c4ca]">
            Transactions Count
          </p>
          <p className="mt-2 font-['Fraunces'] text-3xl text-[#d9ecef]">
            {filteredSales.length}
          </p>
        </div>
        <div className="rounded-2xl border border-sky-100/10 bg-white/[.035] p-5">
          <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[.14em] text-[#73c4ca]">
            Period Total Revenue
          </p>
          <p className="mt-2 font-['Fraunces'] text-3xl text-[#73c4ca]">
            {formatPeso(totalRevenue)}
          </p>
        </div>
      </div>

      {/* Sales Table */}
      <div className="overflow-hidden rounded-2xl border border-sky-100/10 bg-[#062d48]/80 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse font-['Poppins'] text-sm">
            <thead className="bg-white/[.025] text-left text-xs uppercase tracking-[.1em] text-[#89afb9]">
              <tr>
                <th className="px-5 py-3">Date & Time</th>
                <th className="px-5 py-3">Cashier</th>
                <th className="px-5 py-3">Items Purchased</th>
                <th className="px-5 py-3">Subtotal</th>
                <th className="px-5 py-3">Discount</th>
                <th className="px-5 py-3">Total</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((sale) => (
                <tr
                  key={sale._id}
                  className="border-t border-sky-100/[.07] text-[#b7d2d7]"
                >
                  <td className="px-5 py-4">
                    {new Date(sale.createdAt || sale.date).toLocaleString()}
                  </td>
                  <td className="px-5 py-4 text-[#d9ecef]">
                    {sale.soldBy?.staffName ||
                      sale.soldBy?.ownerName ||
                      sale.cashier ||
                      "System"}
                  </td>
                  <td className="max-w-72 truncate px-5 py-4">
                    {sale.items
                      ?.map((i) => `${i.name} (x${i.quantity})`)
                      .join(", ")}
                  </td>
                  <td className="px-5 py-4">{formatPeso(sale.subtotal)}</td>
                  <td className="px-5 py-4">{formatPeso(sale.discount)}</td>
                  <td className="px-5 py-4 font-semibold text-[#d9ecef]">
                    {formatPeso(sale.total)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedSale(sale)}
                        className="rounded-full border border-sky-100/15 bg-white/[.04] px-3 py-1 font-['Poppins'] text-xs font-medium text-[#bce9e9] transition hover:bg-white/[.1]"
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        onClick={() => printIndividualReceipt(sale, businessName)}
                        className="rounded-full border border-[#73c4ca]/30 bg-[#73c4ca]/10 px-3 py-1 font-['Poppins'] text-xs font-medium text-[#73c4ca] transition hover:bg-[#73c4ca]/20"
                      >
                        Print Slip
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!filteredSales.length && (
          <p className="px-5 py-12 text-center font-['Poppins'] text-sm text-[#789faa]">
            No sales records found for this selected range.
          </p>
        )}
      </div>

      {/* Sale Details Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-sky-100/15 bg-[#062d48] p-6 text-[#d9ecef]">
            <div className="flex items-center justify-between">
              <h3 className="font-['Fraunces'] text-xl font-medium">
                Sale Summary
              </h3>
              <span className="font-mono text-xs text-[#73c4ca]">
                #{(selectedSale._id || "").slice(-6)}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#89afb9]">
              {new Date(selectedSale.createdAt || selectedSale.date).toLocaleString()}
            </p>

            <div className="my-4 max-h-60 overflow-y-auto divide-y divide-sky-100/10 pr-1">
              {selectedSale.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between py-2 text-sm">
                  <span>
                    {item.name} × {item.quantity}
                  </span>
                  <span>{formatPeso(item.total || item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-sky-100/10 pt-3 text-sm">
              <div className="flex justify-between text-[#89afb9]">
                <span>Subtotal</span>
                <span>{formatPeso(selectedSale.subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#89afb9]">
                <span>Discount</span>
                <span>-{formatPeso(selectedSale.discount)}</span>
              </div>
              <div className="mt-2 flex justify-between font-bold text-[#73c4ca]">
                <span>Total Paid</span>
                <span>{formatPeso(selectedSale.total)}</span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => printIndividualReceipt(selectedSale, businessName)}
                className="flex-1 rounded-full bg-[#73c4ca] py-2.5 font-['Poppins'] text-sm font-medium text-[#062d48] transition hover:bg-[#bce9e9]"
              >
                Print Receipt
              </button>
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="rounded-full bg-white/10 px-4 py-2.5 font-['Poppins'] text-sm text-[#d9ecef] hover:bg-white/20"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default Sales;

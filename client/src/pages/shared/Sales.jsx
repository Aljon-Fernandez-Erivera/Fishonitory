import { useMemo } from "react";
import { formatPeso, getSalesForRange } from "./salesUtils.js";

function Sales({ sales = [], startDate, endDate, onDateChange }) {
  const dailySales = useMemo(
    () => getSalesForRange(sales, startDate, endDate),
    [sales, startDate, endDate],
  );

  return (
    <section className="dashboard-page">
      <div className="page-heading sales-heading">
        <div>
          <h2>Sales Records</h2>
          <p>Transactions recorded for the selected date range.</p>
        </div>

        <div className="sales-date-range">
          <label className="sales-date-filter">
            From
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(event) =>
                onDateChange("startDate", event.target.value)
              }
            />
          </label>
          <span aria-hidden="true">to</span>
          <label className="sales-date-filter">
            To
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(event) => onDateChange("endDate", event.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="report-card">
        <div className="sales-table-wrap">
          <table className="sales-table">
            <thead>
              <tr>
                <th>Date and Time</th>
                <th>Cashier</th>
                <th>Items</th>
                <th>Subtotal</th>
                <th>Discount</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {dailySales.map((sale) => (
                <tr key={sale._id}>
                  <td>{new Date(sale.createdAt).toLocaleString()}</td>
                  <td>
                    {sale.soldBy?.staffName ||
                      sale.soldBy?.ownerName ||
                      "Owner"}
                  </td>
                  <td>
                    {sale.items
                      .map((item) => `${item.name} x${item.quantity}`)
                      .join(", ")}
                  </td>
                  <td>{formatPeso(sale.subtotal)}</td>
                  <td>{formatPeso(sale.discount)}</td>
                  <td>
                    <strong>{formatPeso(sale.total)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!dailySales.length && <p>No sales recorded for this date range.</p>}
        </div>
      </div>
    </section>
  );
}

export default Sales;

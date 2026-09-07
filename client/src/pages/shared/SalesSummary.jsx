import { useMemo } from "react";
import { formatPeso, getDatesInRange, getSalesForRange } from "./salesUtils.js";

function SalesSummary({ sales = [], startDate, endDate, onDateChange }) {
  const rangeSales = useMemo(
    () => getSalesForRange(sales, startDate, endDate),
    [sales, startDate, endDate],
  );

  const dailyTotal = rangeSales.reduce(
    (sum, sale) => sum + Number(sale.total || 0),
    0,
  );
  const totalCost = rangeSales.reduce(
    (sum, sale) =>
      sum + sale.items.reduce((itemSum, item) => itemSum + Number(item.costPrice || 0) * Number(item.quantity || 0), 0),
    0,
  );
  const profit = dailyTotal - totalCost;

  const dailySales = useMemo(() => {
    return getDatesInRange(startDate, endDate).map((date) => ({
      date,
      total: rangeSales
        .filter((sale) => {
          const saleDate = new Date(sale.createdAt);
          const year = saleDate.getFullYear();
          const month = String(saleDate.getMonth() + 1).padStart(2, "0");
          const day = String(saleDate.getDate()).padStart(2, "0");
          return `${year}-${month}-${day}` === date;
        })
        .reduce((sum, sale) => sum + Number(sale.total || 0), 0),
    }));
  }, [rangeSales, startDate, endDate]);

  const chartMaximum = Math.max(...dailySales.map((day) => day.total), 1);

  const updateDate = (field, value) => {
    if (field === "startDate" && value > endDate) {
      onDateChange("endDate", value);
    }

    onDateChange(field, value);
  };

  return (
    <div className="sales-overview">
      <div className="page-heading sales-heading">
        <div>
          <h3>Sales Overview</h3>
          <p>Choose a date range to review sales performance.</p>
        </div>

        <div className="sales-date-range">
          <label className="sales-date-filter">
            From
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(event) => updateDate("startDate", event.target.value)}
            />
          </label>
          <span aria-hidden="true">to</span>
          <label className="sales-date-filter">
            To
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(event) => updateDate("endDate", event.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="stats-grid sales-summary">
        <article className="stat-card">
          <span>Sales Total</span>
          <strong>{formatPeso(dailyTotal)}</strong>
          <small>{rangeSales.length} transaction(s) in selected range</small>
        </article>
        <article className="stat-card">
          <span>Estimated Profit</span>
          <strong>{formatPeso(profit)}</strong>
          <small>Sales less recorded item costs</small>
        </article>
      </div>

      <div className="report-card sales-chart-card">
        <div className="page-heading">
          <div>
            <h4>Daily Sales</h4>
            <p>Sales Summary</p>
          </div>
        </div>

        <div
          className="sales-chart"
          role="img"
          aria-label="Daily sales bar chart"
        >
          {dailySales.map(({ date, total }) => (
            <div className="sales-chart-column" key={date}>
              <span
                className="sales-chart-bar"
                style={{
                  height: `${(total / chartMaximum) * 100}%`,
                }}
                title={`${date}: ${formatPeso(total)}`}
              />
              <small>{date.slice(5)}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SalesSummary;

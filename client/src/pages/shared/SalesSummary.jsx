import { useMemo } from "react";
import { formatPeso, getDatesInRange, getSalesForRange } from "./salesUtils.js";

const formatRangeLabel = (start, end) => {
  const options = { month: "short", day: "numeric" };
  const startLabel = new Date(`${start}T00:00:00`).toLocaleDateString("en-PH", options);
  const endLabel = new Date(`${end}T00:00:00`).toLocaleDateString("en-PH", options);
  return start === end ? startLabel : `${startLabel} – ${endLabel}`;
};

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
    <section className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-5 shadow-[0_14px_35px_rgba(0,12,31,.14)] sm:p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[0.14em] text-[#73c4ca]">Sales overview</p>
          <h3 className="m-0 mt-2 font-['Fraunces'] text-2xl font-medium text-[#d9ecef]">Sales performance</h3>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="grid gap-1.5 font-['Poppins'] text-xs font-medium text-[#a9c8cf]">
            From
            <input
              className="box-border min-h-10 rounded-xl border border-sky-100/10 bg-white/[.06] px-3 font-['Poppins'] text-sm text-[#d9ecef] outline-none [color-scheme:dark] focus:border-[#73c4ca]"
              type="date"
              value={startDate}
              max={endDate}
              onChange={(event) => updateDate("startDate", event.target.value)}
            />
          </label>
          <span aria-hidden="true" className="hidden pb-2 font-['Poppins'] text-sm text-[#719ba8] sm:block">to</span>
          <label className="grid gap-1.5 font-['Poppins'] text-xs font-medium text-[#a9c8cf]">
            To
            <input
              className="box-border min-h-10 rounded-xl border border-sky-100/10 bg-white/[.06] px-3 font-['Poppins'] text-sm text-[#d9ecef] outline-none [color-scheme:dark] focus:border-[#73c4ca]"
              type="date"
              value={endDate}
              min={startDate}
              onChange={(event) => updateDate("endDate", event.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <article className="rounded-xl border border-sky-100/[.08] bg-white/[.035] p-4">
          <span className="font-['Poppins'] text-xs font-medium uppercase tracking-[0.12em] text-[#91b5bf]">Sales Total</span>
          <strong className="mt-2 block font-['Fraunces'] text-3xl font-medium text-[#d9ecef]">{formatPeso(dailyTotal)}</strong>
          <small className="mt-1.5 block font-['Poppins'] text-xs text-[#719ba8]">{rangeSales.length} transaction(s) in {formatRangeLabel(startDate, endDate)}</small>
        </article>
        <article className="rounded-xl border border-sky-100/[.08] bg-white/[.035] p-4">
          <span className="font-['Poppins'] text-xs font-medium uppercase tracking-[0.12em] text-[#91b5bf]">Estimated Profit</span>
          <strong className="mt-2 block font-['Fraunces'] text-3xl font-medium text-[#d9ecef]">{formatPeso(profit)}</strong>
          <small className="mt-1.5 block font-['Poppins'] text-xs text-[#719ba8]">In {rangeSales.length} transaction(s) for {formatRangeLabel(startDate, endDate)}</small>
        </article>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-sky-100/[.08] bg-white/[.025] p-4">
        <div>
          <div>
            <h4 className="m-0 font-['Fraunces'] text-xl font-medium text-[#d9ecef]">Daily Sales</h4>
            <p className="mt-1 font-['Poppins'] text-xs text-[#719ba8]">Sales Summary</p>
          </div>
        </div>

        <div
          className="mt-5 flex h-52 min-w-[560px] items-end gap-2 border-b border-sky-100/10 px-2 pt-4"
          role="img"
          aria-label="Daily sales bar chart"
        >
          {dailySales.map(({ date, total }) => (
            <div className="flex h-full min-w-5 flex-1 flex-col items-center justify-end gap-2" key={date}>
              <span
                className="block w-full min-h-[3px] rounded-t-md bg-[linear-gradient(180deg,#73c4ca,#276f87)]"
                style={{
                  height: `${(total / chartMaximum) * 100}%`,
                }}
                title={`${date}: ${formatPeso(total)}`}
              />
              <small className="font-['Poppins'] text-[0.65rem] text-[#719ba8]">{date.slice(5)}</small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default SalesSummary;

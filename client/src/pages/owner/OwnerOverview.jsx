import SalesSummary from "../shared/SalesSummary.jsx";

function OwnerOverview({
  staff,
  attendance,
  fish,
  tanks,
  notes = [],
  sales,
  salesRange,
  onSalesDateChange,
  onRefresh,
}) {

  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const presentCount = attendance.filter(
    (record) =>
      (record.dateKey === todayKey || record.date?.startsWith(todayKey)) &&
      ["Present", "Late"].includes(record.status),
  ).length;

  const fishInventory = fish.filter(
    (item) => (item.category || "Fish") !== "Fish Food",
  );
  const foodInventory = fish.filter((item) => item.category === "Fish Food");
  const totalFish = fishInventory.reduce(
    (total, item) => total + item.quantity,
    0,
  );
  const totalFood = foodInventory.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[0.16em] text-[#73c4ca]">
            Overview
          </p>
          <p className="mt-3 font-['Poppins'] text-sm text-[#9bbec7]">
            Here is what is happening in your store today.
          </p>
        </div>
        <button
          className="rounded-full border border-sky-100/15 bg-white/[.05] px-4 py-2.5 font-['Poppins'] text-sm font-medium text-[#d9ecef] transition hover:bg-white/[.1] focus:outline-none focus:ring-2 focus:ring-[#73c4ca]"
          type="button"
          onClick={onRefresh}
        >
          Refresh Data
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-5 shadow-[0_14px_35px_rgba(0,12,31,.14)]">
          <span className="font-['Poppins'] text-xs font-medium uppercase tracking-[0.12em] text-[#91b5bf]">
            Total Staff
          </span>
          <strong className="mt-3 block font-['Fraunces'] text-4xl font-medium text-[#d9ecef]">
            {staff.length}
          </strong>
          <small className="mt-2 block font-['Poppins'] text-xs text-[#719ba8]">
            Registered staff accounts
          </small>
        </article>
        <article className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-5 shadow-[0_14px_35px_rgba(0,12,31,.14)]">
          <span className="font-['Poppins'] text-xs font-medium uppercase tracking-[0.12em] text-[#91b5bf]">
            On duty
          </span>
          <strong className="mt-3 block font-['Fraunces'] text-4xl font-medium text-[#d9ecef]">
            {presentCount}
          </strong>
          <small className="mt-2 block font-['Poppins'] text-xs text-[#719ba8]">
            Present or late today
          </small>
        </article>
        <article className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-5 shadow-[0_14px_35px_rgba(0,12,31,.14)]">
          <span className="font-['Poppins'] text-xs font-medium uppercase tracking-[0.12em] text-[#91b5bf]">
            Fish Inventory
          </span>
          <strong className="mt-3 block font-['Fraunces'] text-4xl font-medium text-[#d9ecef]">
            {totalFish}
          </strong>
          <small className="mt-2 block font-['Poppins'] text-xs text-[#719ba8]">
            Available live units
          </small>
        </article>
        <article className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-5 shadow-[0_14px_35px_rgba(0,12,31,.14)]">
          <span className="font-['Poppins'] text-xs font-medium uppercase tracking-[0.12em] text-[#91b5bf]">
            Food Supplies
          </span>
          <strong className="mt-3 block font-['Fraunces'] text-4xl font-medium text-[#d9ecef]">
            {totalFood}
          </strong>
          <small className="mt-2 block font-['Poppins'] text-xs text-[#719ba8]">
            Feed inventory units
          </small>
        </article>
        <article className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-5 shadow-[0_14px_35px_rgba(0,12,31,.14)]">
          <span className="font-['Poppins'] text-xs font-medium uppercase tracking-[0.12em] text-[#91b5bf]">
            Active Tanks
          </span>
          <strong className="mt-3 block font-['Fraunces'] text-4xl font-medium text-[#d9ecef]">
            {tanks.length}
          </strong>
          <small className="mt-2 block font-['Poppins'] text-xs text-[#719ba8]">
            Managed tanks
          </small>
        </article>
      </div>
      <SalesSummary
        sales={sales}
        startDate={salesRange.startDate}
        endDate={salesRange.endDate}
        onDateChange={onSalesDateChange}
      />

      <div className="grid gap-6">
        <div className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-5 shadow-[0_14px_35px_rgba(0,12,31,.14)] sm:p-6">
          <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[0.14em] text-[#73c4ca]">
            Latest reports
          </p>
          <h3 className="m-0 mt-2 font-['Fraunces'] text-2xl font-medium text-[#d9ecef]">
            Recent attendance
          </h3>

          {attendance.length ? (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full border-collapse font-['Poppins'] text-sm text-[#a9c8cf]">
                <thead>
                  <tr className="border-b border-sky-100/10 text-left text-xs font-medium uppercase tracking-[0.08em] text-[#7dabb5]">
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Clock In</th>
                    <th className="px-4 py-2">Clock Out</th>
                    <th className="px-4 py-2">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.slice(0, 5).map((record) => {
                    const name =
                      record.userId?.staffName ||
                      record.userId?.ownerName ||
                      record.userId?.email;
                    const role =
                      record.userId?.role === "Owner"
                        ? "Owner"
                        : record.userId?.staffPosition || "Staff";

                    return (
                      <tr
                        className="border-b border-sky-100/[.07] last:border-0"
                        key={record._id}
                      >
                        <td className="px-4 py-3 text-[#d9ecef]">{name}</td>
                        <td className="px-4 py-3">{record.status}</td>
                        <td className="px-4 py-3">
                          {record.checkIn
                            ? new Date(record.checkIn).toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {record.checkOut
                            ? new Date(record.checkOut).toLocaleString()
                            : ""}
                        </td>
                        <td className="px-4 py-3">{role}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-5 rounded-xl border border-dashed border-sky-100/10 px-4 py-5 text-[#7dabb5]">
              No attendance records yet.
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-5 shadow-[0_14px_35px_rgba(0,12,31,.14)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[0.14em] text-[#73c4ca]">
                Shift communication
              </p>
              <h3 className="m-0 mt-2 font-['Fraunces'] text-2xl font-medium text-[#d9ecef]">
                Workspace updates
              </h3>
            </div>
          </div>
          <ul className="mt-4 grid gap-2 p-0">
            {notes.slice(0, 5).map((item) => (
              <li
                className="rounded-xl border border-sky-100/[.07] bg-white/[.035] px-4 py-3"
                key={item._id || item.id}
              >
                <strong className="block font-['Poppins'] text-sm font-medium text-[#d9ecef]">
                  {item.text}
                </strong>
                <small className="mt-1 block font-['Poppins'] text-xs text-[#7dabb5]">
                  {item.authorId?.staffName ||
                    item.authorId?.ownerName ||
                    "Owner"}{" "}
                  ·{" "}
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleString()
                    : "Just now"}
                </small>
              </li>
            ))}
            {!notes.length && (
              <li className="rounded-xl border border-dashed border-sky-100/10 px-4 py-5 font-['Poppins'] text-sm text-[#7dabb5]">
                No workspace updates yet.
              </li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default OwnerOverview;

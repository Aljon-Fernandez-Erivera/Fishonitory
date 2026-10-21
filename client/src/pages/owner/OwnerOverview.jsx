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
  refreshing = false,
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

  const todayAttendance = attendance.filter(
    (record) =>
      record.dateKey === todayKey || record.date?.startsWith(todayKey),
  );

  const attendanceStatuses = [
    { label: "Present", color: "bg-[#73c4ca]" },
    { label: "Late", color: "bg-amber-300" },
    { label: "Absent", color: "bg-rose-400" },
    { label: "Leave", color: "bg-violet-300" },
    { label: "Day Off", status: "DayOff", color: "bg-sky-300" },
  ].map((status) => ({
    ...status,
    count: todayAttendance.filter(
      (record) => record.status === (status.status || status.label),
    ).length,
  }));
 
  const fishInventory = fish.filter(
    (item) => (item.category || "Fish") !== "Fish Food",
  );

  const foodInventory = fish.filter(
    (item) => item.category === "Fish Food",
  );

  const totalFish = fishInventory.reduce(
    (total, item) => total + (Number(item.quantity) || 0),
    0,
  );

  const totalFood = foodInventory.reduce(
    (total, item) => total + (Number(item.quantity) || 0),
    0,
  );

  const inventoryByCategory = Object.values(
    fish.reduce((categories, item) => {
      const category = item.category || "Fish";
      categories[category] ??= { label: category, quantity: 0 };
      categories[category].quantity += Number(item.quantity) || 0;
      return categories;
    }, {}),
  ).sort((a, b) => b.quantity - a.quantity);
  const maxCategoryQuantity = Math.max(
    ...inventoryByCategory.map((category) => category.quantity),
    1,
  );
  const maxAttendanceCount = Math.max(
    ...attendanceStatuses.map((status) => status.count),
    1,
  );

  const stats = [
    {
      label: "Total Staff",
      value: staff.length,
      description: "Registered accounts",
    },
    {
      label: "On Duty",
      value: presentCount,
      description: "Present or late",
    },
    {
      label: "Fish",
      value: totalFish,
      description: "Live pieces",
    },
    {
      label: "Food",
      value: totalFood,
      description: "Feed stocks",
    },
    {
      label: "Tanks",
      value: tanks.length,
      description: "Active tanks",
    },
  ];

  return (
    <section className="mx-auto w-full min-w-0 max-w-7xl px-1 pb-8 sm:px-0">
      {/* ================= HEADER ================= */}
      <header className="mb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-['Poppins'] text-[11px] font-semibold uppercase tracking-[0.16em] text-[#73c4ca]">
              Overview
            </p>

            <p className="mt-1.5 font-['Poppins'] text-sm leading-5 text-[#9bbec7] sm:text-base">
              Here is what is happening in your store today.
            </p>
          </div>

          {/* Refresh */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh data"
            className="
              flex h-10 w-10 shrink-0 items-center justify-center
              rounded-full
              border border-sky-100/10
              bg-white/[.05]
              text-[#d9ecef]
              transition
              hover:bg-white/[.1]
              active:scale-95
              focus:outline-none
              focus:ring-2
              focus:ring-[#73c4ca]/50
              sm:h-auto
              sm:w-auto
              sm:px-4
              sm:py-2.5
            "
          >
            {refreshing ? <><img src="/LOGO.svg" alt="" className="h-6 w-6 animate-[pulse_1.3s_ease-in-out_infinite]" /><span className="hidden font-['Poppins'] text-sm font-medium sm:block">Refreshing…</span></> : <>
            {/* Refresh icon */}
            <svg
              className="h-4 w-4 sm:hidden"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20 11a8.1 8.1 0 0 0-14.9-3M4 5v4h4"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 13a8.1 8.1 0 0 0 14.9 3M20 19v-4h-4"
              />
            </svg>

            <span className="hidden font-['Poppins'] text-sm font-medium sm:block">
              Refresh Data
            </span>
            </>}
          </button>
        </div>
      </header>

      {/* ================= STAT CARDS ================= */}
      <div
        className="
          grid
          grid-cols-2
          gap-3
          sm:grid-cols-2
          lg:grid-cols-3
          xl:grid-cols-5
        "
      >
        {stats.map((stat, index) => (
          <article
            key={stat.label}
            className={`
              dashboard-stat-card
              min-w-0
              rounded-2xl
              border border-sky-100/15
              bg-[#062d48]/80
              px-4 py-4
              shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_8px_25px_rgba(0,12,31,.12)]
              sm:p-4

              ${index === 4 ? "col-span-2 sm:col-span-1" : ""}
            `}
          >
            <span
              className="
                block
                truncate
                font-['Poppins']
                text-[10px]
                font-semibold
                uppercase
                tracking-[0.12em]
                text-[#b0cbd1]
                sm:text-xs
              "
            >
              {stat.label}
            </span>

            <strong
              className="
                mt-2
                block
                font-['Fraunces']
                text-3xl
                font-medium
                leading-none
                text-[#d9ecef]
                sm:mt-3
                sm:text-4xl
              "
            >
              {Number(stat.value).toLocaleString("en-US")}
            </strong>

            <small
              className="
                mt-2
                block
                truncate
                font-['Poppins']
                text-[10px]
                leading-4
                text-[#a6c3cb]
                sm:text-xs
              "
            >
              {stat.description}
            </small>
          </article>
        ))}
      </div>

      {/* ================= SALES ================= */}
      <section className="mt-5 min-w-0">
        <SalesSummary
          sales={sales}
          startDate={salesRange.startDate}
          endDate={salesRange.endDate}
          onDateChange={onSalesDateChange}
        />
      </section>

      {/* ================= ADDITIONAL VISUALIZATIONS ================= */}
      <section className="mt-5 grid min-w-0 gap-5 lg:grid-cols-2">
        <article className="min-w-0 rounded-2xl border border-sky-100/15 bg-[#062d48]/80 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_8px_25px_rgba(0,12,31,.12)] sm:p-6">
          <p className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#73c4ca] sm:text-xs">
            Workforce
          </p>
          <h3 className="m-0 mt-1.5 font-['Fraunces'] text-xl font-medium text-[#d9ecef] sm:text-2xl">
            Today&apos;s Attendance by Status
          </h3>
          <p className="mt-1 font-['Poppins'] text-xs text-[#89afb9]">
            Staff attendance records for {todayKey} (Philippine time)
          </p>

          {todayAttendance.length ? (
            <div
              className="mt-5 space-y-4"
              role="img"
              aria-label={`Today's attendance by status: ${attendanceStatuses.map(({ label, count }) => `${label} ${count}`).join(", ")}`}
            >
              {attendanceStatuses.map(({ label, count, color }) => (
                <div key={label}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 font-['Poppins'] text-xs">
                    <span className="text-[#b7d2d7]">{label}</span>
                    <span className="font-semibold text-[#d9ecef]">{count}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/[.07]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${color}`}
                      style={{ width: `${(count / maxAttendanceCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-xl border border-dashed border-sky-100/10 px-4 py-5 font-['Poppins'] text-sm text-[#89afb9]">
              No attendance records for today yet.
            </p>
          )}
        </article>

        <article className="min-w-0 rounded-2xl border border-sky-100/15 bg-[#062d48]/80 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_8px_25px_rgba(0,12,31,.12)] sm:p-6">
          <p className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#73c4ca] sm:text-xs">
            Inventory
          </p>
          <h3 className="m-0 mt-1.5 font-['Fraunces'] text-xl font-medium text-[#d9ecef] sm:text-2xl">
            Stock by Category
          </h3>
          <p className="mt-1 font-['Poppins'] text-xs text-[#89afb9]">
            Current inventory quantity grouped by category
          </p>

          {inventoryByCategory.length ? (
            <div
              className="mt-5 space-y-4"
              role="img"
              aria-label={`Inventory quantity by category: ${inventoryByCategory.map(({ label, quantity }) => `${label} ${quantity} pieces`).join(", ")}`}
            >
              {inventoryByCategory.map(({ label, quantity }, index) => (
                <div key={label}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 font-['Poppins'] text-xs">
                    <span className="truncate text-[#b7d2d7]">{label}</span>
                    <span className="shrink-0 font-semibold text-[#d9ecef]">
                      {quantity.toLocaleString()} pieces
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/[.07]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${index % 2 === 0 ? "bg-[#73c4ca]" : "bg-[#7aa8f5]"}`}
                      style={{ width: `${(quantity / maxCategoryQuantity) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-xl border border-dashed border-sky-100/10 px-4 py-5 font-['Poppins'] text-sm text-[#89afb9]">
              No inventory categories to display.
            </p>
          )}
        </article>
      </section>

      {/* ================= ATTENDANCE ================= */}
      <section
        className="
          mt-5
          min-w-0
          overflow-hidden
          rounded-2xl
          border border-sky-100/15
          bg-[#062d48]/80
          shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_8px_25px_rgba(0,12,31,.12)]
        "
      >
        <div className="px-4 pt-5 sm:px-6 sm:pt-6">
          <p className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#73c4ca] sm:text-xs">
            Latest Reports
          </p>

          <h3 className="m-0 mt-1.5 font-['Fraunces'] text-xl font-medium text-[#d9ecef] sm:text-2xl">
            Recent Attendance
          </h3>
        </div>

        {attendance.length ? (
          <>
          <div className="mt-4 hidden w-full max-w-full overflow-x-auto lg:block">
            <table className="min-w-[620px] w-full border-collapse font-['Poppins'] text-xs text-[#a9c8cf] sm:text-sm">
              <thead>
                <tr className="border-b border-sky-100/10 text-left text-[10px] font-medium uppercase tracking-[0.08em] text-[#7dabb5] sm:text-xs">
                  <th className="whitespace-nowrap px-4 py-2.5">
                    Name
                  </th>
                  <th className="whitespace-nowrap px-4 py-2.5">
                    Status
                  </th>
                  <th className="whitespace-nowrap px-4 py-2.5">
                    Clock In
                  </th>
                  <th className="whitespace-nowrap px-4 py-2.5">
                    Clock Out
                  </th>
                  <th className="whitespace-nowrap px-4 py-2.5">
                    Role
                  </th>
                </tr>
              </thead>

              <tbody>
                {attendance.slice(0, 5).map((record) => {
                  const name =
                    record.userId?.staffName ||
                    record.userId?.ownerName ||
                    record.userId?.email ||
                    "Unknown";

                  const role =
                    record.userId?.role === "Owner"
                      ? "Owner"
                      : record.userId?.staffPosition || "Staff";

                  return (
                    <tr
                      key={record._id}
                      className="border-b border-sky-100/[.07] last:border-0"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-[#d9ecef]">
                        {name}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        {record.status}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        {record.checkIn
                          ? new Date(record.checkIn).toLocaleString()
                          : "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        {record.checkOut
                          ? new Date(record.checkOut).toLocaleString()
                          : "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        {role}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 divide-y divide-sky-100/[.08] overflow-hidden rounded-xl border border-sky-100/10 bg-white/[.025] lg:hidden">
            {attendance.slice(0, 5).map((record) => {
              const name = record.userId?.staffName || record.userId?.ownerName || record.userId?.email || "Unknown";
              const role = record.userId?.role === "Owner" ? "Owner" : record.userId?.staffPosition || "Staff";
              return (
                <article key={record._id} className="space-y-2.5 p-3.5 font-['Poppins'] text-xs text-[#a9c8cf]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="m-0 truncate text-sm font-medium text-[#d9ecef]">{name}</p>
                      <p className="m-0 mt-0.5 text-[#89afb9]">{role}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white/[.06] px-2.5 py-1">{record.status}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-t border-sky-100/[.07] pt-2">
                    <p className="m-0"><span className="block text-[#789faa]">Clock in</span>{record.checkIn ? new Date(record.checkIn).toLocaleString("en-PH") : "—"}</p>
                    <p className="m-0"><span className="block text-[#789faa]">Clock out</span>{record.checkOut ? new Date(record.checkOut).toLocaleString("en-PH") : "—"}</p>
                  </div>
                </article>
              );
            })}
          </div>
          </>
        ) : (
          <p className="m-4 rounded-xl border border-dashed border-sky-100/10 px-4 py-5 font-['Poppins'] text-sm text-[#7dabb5] sm:m-6">
            No attendance records yet.
          </p>
        )}
      </section>

      {/* ================= WORKSPACE UPDATES ================= */}
      <section
        className="
          mt-5
          min-w-0
          overflow-hidden
          rounded-2xl
          border border-sky-100/15
          bg-[#062d48]/80
          p-4
          shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_8px_25px_rgba(0,12,31,.12)]
          sm:p-6
        "
      >
        <p className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#73c4ca] sm:text-xs">
          Shift Communication
        </p>

        <h3 className="m-0 mt-1.5 font-['Fraunces'] text-xl font-medium text-[#d9ecef] sm:text-2xl">
          Workspace Updates
        </h3>

        <ul className="mt-4 grid gap-2 p-0">
          {notes.slice(0, 5).map((item) => (
            <li
              key={item._id || item.id}
              className="
                min-w-0
                rounded-xl
                border border-sky-100/[.07]
                bg-white/[.035]
                px-3.5
                py-3
              "
            >
              <strong className="block break-words font-['Poppins'] text-sm font-medium leading-5 text-[#d9ecef]">
                {item.text}
              </strong>

              <small className="mt-1 block break-words font-['Poppins'] text-[10px] leading-4 text-[#7dabb5] sm:text-xs">
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
      </section>
    </section>
  );
}

export default OwnerOverview;

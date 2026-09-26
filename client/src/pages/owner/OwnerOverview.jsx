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

  const foodInventory = fish.filter(
    (item) => item.category === "Fish Food",
  );

  const totalFish = fishInventory.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  const totalFood = foodInventory.reduce(
    (total, item) => total + item.quantity,
    0,
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
      description: "Live units",
    },
    {
      label: "Food",
      value: totalFood,
      description: "Feed units",
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
              min-w-0
              rounded-2xl
              border border-sky-100/[.09]
              bg-[#062d48]/80
              px-4 py-4
              shadow-[0_8px_25px_rgba(0,12,31,.12)]
              sm:p-5

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
                text-[#91b5bf]
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
              {stat.value}
            </strong>

            <small
              className="
                mt-2
                block
                truncate
                font-['Poppins']
                text-[10px]
                leading-4
                text-[#719ba8]
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

      {/* ================= ATTENDANCE ================= */}
      <section
        className="
          mt-5
          min-w-0
          overflow-hidden
          rounded-2xl
          border border-sky-100/[.09]
          bg-[#062d48]/80
          shadow-[0_8px_25px_rgba(0,12,31,.12)]
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
          <div className="mt-4 w-full max-w-full overflow-x-auto">
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
          border border-sky-100/[.09]
          bg-[#062d48]/80
          p-4
          shadow-[0_8px_25px_rgba(0,12,31,.12)]
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
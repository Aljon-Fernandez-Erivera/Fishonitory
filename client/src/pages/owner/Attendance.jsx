import { useMemo, useState } from "react";

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const statusStyles = {
  Present: "bg-[#6ebc9d] text-[#043429]",
  Late: "bg-[#e2b774] text-[#493000]",
  Absent: "bg-[#d8878a] text-[#4d151a]",
  Leave: "bg-[#b8a6d5] text-[#2f2046]",
  DayOff: "bg-[#91b5bf] text-[#173d48]",
};

const statusLabels = {
  Present: "P",
  Late: "L",
  Absent: "A",
  Leave: "Lv",
  DayOff: "D",
};

const fieldClass =
  "box-border w-full min-w-0 rounded-xl border border-sky-100/10 bg-white/[.06] px-3 py-2.5 font-['Poppins'] text-sm text-[#d9ecef] outline-none [color-scheme:dark] focus:border-[#73c4ca] focus:ring-1 focus:ring-[#73c4ca]/30";

function toDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(
    2,
    "0",
  )}`;
}

function getLocalDateKey(date) {
  return toDateKey(date.getFullYear(), date.getMonth(), date.getDate());
}

function todayISODate() {
  return getLocalDateKey(new Date());
}

function Attendance({
  records,
  staff,
  onSetStaffAttendance,
  onDelete,
  shiftTemplates,
  lateDeductionAmount,
  onSaveShiftTemplate,
  onDeleteShiftTemplate,
  onAssignStaffShift,
  onUpdateLateDeductionAmount,
  shiftAssignments = [],
  onSaveShiftAssignment,
  onDeleteShiftAssignment,
}) {
  const today = new Date();

  const [calendarMonth, setCalendarMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );

  const [selectedDate, setSelectedDate] = useState(
    getLocalDateKey(today),
  );

  const [dayFormOpen, setDayFormOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [shiftDraft, setShiftDraft] = useState({
    id: null,
    name: "",
    clockInTime: "07:00",
    graceMinutes: 15,
    cutoffTime: "18:00",
  });

  const [assignmentDraft, setAssignmentDraft] = useState({
    staffId: "",
    dateKey: "",
    shiftTemplateId: "",
  });

  const [deductionDraft, setDeductionDraft] = useState(
    String(lateDeductionAmount ?? 0),
  );

  const [lastSyncedDeduction, setLastSyncedDeduction] =
    useState(lateDeductionAmount);

  if (lateDeductionAmount !== lastSyncedDeduction) {
    setLastSyncedDeduction(lateDeductionAmount);
    setDeductionDraft(String(lateDeductionAmount ?? 0));
  }

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return Array.from(
      { length: firstDay + daysInMonth },
      (_, index) => {
        if (index < firstDay) return null;

        const day = index - firstDay + 1;

        return {
          day,
          dateKey: toDateKey(year, month, day),
        };
      },
    );
  }, [calendarMonth]);

  const selectedRecords = records.filter(
    (record) => record.dateKey === selectedDate,
  );

  const recordForStaff = (staffId) =>
    selectedRecords.find(
      (record) => record.userId?._id === staffId,
    );

  const monthLabel = calendarMonth.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const moveMonth = (amount) => {
    setCalendarMonth(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() + amount,
          1,
        ),
    );
  };

  const goToToday = () => {
    const now = new Date();

    setCalendarMonth(
      new Date(now.getFullYear(), now.getMonth(), 1),
    );

    setSelectedDate(getLocalDateKey(now));
  };

  return (
    <section className="mx-auto w-full min-w-0 max-w-7xl pb-8">
      {/* =========================================================
          PAGE HEADER
      ========================================================= */}
      <header className="mb-5">
        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="font-['Poppins'] text-[11px] font-semibold uppercase tracking-[0.16em] text-[#73c4ca] sm:text-xs">
              Attendance Calendar
            </p>

            <p className="mt-1.5 font-['Poppins'] text-sm leading-5 text-[#9bbec7] sm:text-base">
              Manage attendance for each staff member.
            </p>
          </div>

          {/* MOBILE / DESKTOP ACTIONS */}
          <div className="grid grid-cols-2 gap-2 lg:flex">
            <button
              className="
                min-w-0
                rounded-xl
                border border-sky-100/10
                bg-white/[.05]
                px-3
                py-2.5
                font-['Poppins']
                text-xs
                font-medium
                text-[#d9ecef]
                transition
                hover:bg-white/[.1]
                active:scale-[.98]
                focus:outline-none
                focus:ring-2
                focus:ring-[#73c4ca]/50
                sm:px-4
                sm:text-sm
              "
              type="button"
              onClick={() => setSettingsOpen(true)}
            >
              Shift Settings
            </button>

            <button
              className="
                min-w-0
                rounded-xl
                border border-[#73c4ca]/20
                bg-[#73c4ca]/10
                px-3
                py-2.5
                font-['Poppins']
                text-xs
                font-medium
                text-[#c9f0f1]
                transition
                hover:bg-[#73c4ca]/20
                active:scale-[.98]
                focus:outline-none
                focus:ring-2
                focus:ring-[#73c4ca]/50
                sm:px-4
                sm:text-sm
              "
              type="button"
              onClick={goToToday}
            >
              Today
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================
          CALENDAR CARD
      ========================================================= */}
      <section
        className="
          min-w-0
          overflow-hidden
          rounded-2xl
          border border-sky-100/[.09]
          bg-[#062d48]/80
          p-3
          shadow-[0_10px_30px_rgba(0,12,31,.14)]
          sm:p-5
          lg:p-6
        "
      >
        {/* Calendar header */}
        <div className="mb-4 flex items-center justify-between gap-2 sm:mb-5">
          <button
            className="
              grid
              h-9
              w-9
              shrink-0
              place-items-center
              rounded-xl
              border border-sky-100/10
              bg-white/[.05]
              font-['Poppins']
              text-sm
              text-[#bce9e9]
              transition
              hover:bg-white/[.1]
              active:scale-95
            "
            type="button"
            onClick={() => moveMonth(-1)}
            aria-label="Previous month"
          >
            ‹
          </button>

          <h3 className="m-0 truncate px-2 text-center font-['Fraunces'] text-xl font-medium text-[#d9ecef] sm:text-2xl">
            {monthLabel}
          </h3>

          <button
            className="
              grid
              h-9
              w-9
              shrink-0
              place-items-center
              rounded-xl
              border border-sky-100/10
              bg-white/[.05]
              font-['Poppins']
              text-sm
              text-[#bce9e9]
              transition
              hover:bg-white/[.1]
              active:scale-95
            "
            type="button"
            onClick={() => moveMonth(1)}
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        {/* Week days */}
        <div className="grid grid-cols-7 gap-1 text-center sm:gap-2">
          {weekDays.map((day) => (
            <strong
              className="
                overflow-hidden
                font-['Poppins']
                text-[9px]
                font-semibold
                uppercase
                tracking-[0.04em]
                text-[#80aab4]
                sm:text-[10px]
                sm:tracking-[0.08em]
              "
              key={day}
            >
              {day.slice(0, 1)}
              <span className="hidden sm:inline">
                {day.slice(1)}
              </span>
            </strong>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="mt-1.5 grid grid-cols-7 gap-1 sm:gap-2">
          {calendarDays.map((calendarDay, index) => {
            if (!calendarDay) {
              return (
                <div
                  className="min-h-[48px] sm:min-h-[76px]"
                  key={`empty-${index}`}
                />
              );
            }

            const dayRecords = records.filter(
              (record) =>
                record.dateKey === calendarDay.dateKey,
            );

            const isSelected =
              selectedDate === calendarDay.dateKey;

            const activeStatuses = Object.keys(statusStyles).filter(
              (status) =>
                dayRecords.some(
                  (record) => record.status === status,
                ),
            );

            return (
              <button
                className={`
                  flex
                  min-h-[48px]
                  min-w-0
                  flex-col
                  items-start
                  justify-between
                  rounded-lg
                  border
                  p-1.5
                  text-left
                  font-['Poppins']
                  transition
                  active:scale-[.97]
                  sm:min-h-[76px]
                  sm:rounded-xl
                  sm:p-2

                  ${
                    isSelected
                      ? "border-[#73c4ca] bg-[#73c4ca]/15 shadow-[0_0_0_1px_rgba(115,196,202,.15)]"
                      : "border-sky-100/10 bg-white/[.025] hover:border-[#73c4ca]/55 hover:bg-[#73c4ca]/[.09]"
                  }
                `}
                type="button"
                key={calendarDay.dateKey}
                onClick={() => {
                  setSelectedDate(calendarDay.dateKey);
                  setDayFormOpen(true);
                }}
              >
                <span className="text-xs font-medium text-[#c9e1e5] sm:text-sm">
                  {calendarDay.day}
                </span>

                {/* Desktop record count */}
                {dayRecords.length > 0 && (
                  <small className="hidden text-[10px] text-[#84aeb7] sm:block">
                    {dayRecords.length} record
                    {dayRecords.length === 1 ? "" : "s"}
                  </small>
                )}

                {/* Status indicators */}
                <div className="flex min-h-[14px] gap-0.5 sm:gap-1">
                  {activeStatuses.map((status) => (
                    <i
                      className={`
                        grid
                        h-[13px]
                        w-[13px]
                        place-items-center
                        rounded-full
                        text-[7px]
                        font-bold
                        not-italic

                        sm:h-[18px]
                        sm:w-[18px]
                        sm:text-[10px]

                        ${statusStyles[status]}
                      `}
                      key={status}
                    >
                      {statusLabels[status]}
                    </i>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Calendar legend */}
        <div className="mt-4 flex flex-wrap gap-x-3 gap-y-2 border-t border-sky-100/[.07] pt-3">
          {Object.entries(statusStyles).map(
            ([status, style]) => (
              <div
                key={status}
                className="flex items-center gap-1.5 font-['Poppins'] text-[9px] text-[#7dabb5] sm:text-[10px]"
              >
                <span
                  className={`grid h-4 w-4 place-items-center rounded-full text-[8px] font-bold ${style}`}
                >
                  {statusLabels[status]}
                </span>

                {status === "DayOff" ? "Day Off" : status}
              </div>
            ),
          )}
        </div>
      </section>

      {/* =========================================================
          ATTENDANCE DAY MODAL
      ========================================================= */}
      {dayFormOpen && (
        <div
          className="
            fixed
            inset-0
            z-50
            flex
            items-end
            justify-center
            bg-black/60
            backdrop-blur-sm
            sm:items-center
            sm:p-4
          "
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setDayFormOpen(false);
            }
          }}
        >
          <div
            aria-labelledby="selected-day-title"
            className="
              box-border
              flex
              w-full
              max-h-[92dvh]
              flex-col
              overflow-hidden
              rounded-t-3xl
              border
              border-sky-100/15
              bg-[#062d48]
              text-[#c9e1e5]
              shadow-2xl

              sm:max-w-[680px]
              sm:rounded-2xl
              sm:max-h-[calc(100dvh-2rem)]
            "
          >
            {/* Modal header */}
            <div className="shrink-0 border-b border-sky-100/[.08] px-5 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-[.14em] text-[#73c4ca]">
                    Daily Attendance
                  </p>

                  <h3
                    id="selected-day-title"
                    className="m-0 mt-1 font-['Fraunces'] text-2xl font-medium text-[#d9ecef]"
                  >
                    {selectedDate}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setDayFormOpen(false)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[.06] text-lg text-[#9bbec7] transition hover:bg-white/[.1]"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <p className="mt-2 font-['Poppins'] text-xs leading-5 text-[#9bbec7]">
                Choose the attendance status for each staff member.
              </p>
            </div>

            {/* Modal content */}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              <form onSubmit={(event) => event.preventDefault()}>
                <ul className="grid gap-2.5 p-0">
                  {staff.map((item) => {
                    const record = recordForStaff(item._id);

                    return (
                      <li
                        className="
                          min-w-0
                          rounded-2xl
                          border border-sky-100/[.07]
                          bg-white/[.035]
                          p-3.5
                        "
                        key={item._id}
                      >
                        {/* Staff information */}
                        <div className="min-w-0">
                          <strong className="block truncate font-['Poppins'] text-sm font-medium text-[#d9ecef]">
                            {item.staffName}
                          </strong>

                          <span className="block truncate font-['Poppins'] text-[11px] text-[#7dabb5]">
                            {item.staffPosition}
                          </span>

                          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 font-['Poppins'] text-[10px] text-[#89afb9]">
                            <span>
                              In:{" "}
                              <span className="text-[#bce9e9]">
                                {record?.checkIn
                                  ? new Date(
                                      record.checkIn,
                                    ).toLocaleTimeString(
                                      "en-PH",
                                      {
                                        hour: "numeric",
                                        minute: "2-digit",
                                      },
                                    )
                                  : "—"}
                              </span>
                            </span>

                            <span>
                              Out:{" "}
                              <span className="text-[#bce9e9]">
                                {record?.checkOut
                                  ? new Date(
                                      record.checkOut,
                                    ).toLocaleTimeString(
                                      "en-PH",
                                      {
                                        hour: "numeric",
                                        minute: "2-digit",
                                      },
                                    )
                                  : "—"}
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                          <label className="block font-['Poppins'] text-[10px] font-medium uppercase tracking-wide text-[#89afb9]">
                            Attendance Status

                            <select
                              className="mt-1.5 box-border w-full rounded-xl border border-sky-100/10 bg-white/[.06] px-3 py-2.5 font-['Poppins'] text-sm text-[#d9ecef] outline-none [color-scheme:dark] focus:border-[#73c4ca]"
                              aria-label={`Attendance status for ${item.staffName}`}
                              value={record?.status || ""}
                              onChange={(event) =>
                                onSetStaffAttendance(
                                  item._id,
                                  selectedDate,
                                  event.target.value,
                                )
                              }
                            >
                              <option
                                className="bg-[#062d48]"
                                value=""
                              >
                                Choose status
                              </option>

                              <option
                                className="bg-[#062d48]"
                                value="Present"
                              >
                                Present
                              </option>

                              <option
                                className="bg-[#062d48]"
                                value="Late"
                              >
                                Late
                              </option>

                              <option
                                className="bg-[#062d48]"
                                value="Absent"
                              >
                                Absent
                              </option>

                              <option
                                className="bg-[#062d48]"
                                value="Leave"
                              >
                                Leave
                              </option>

                              <option
                                className="bg-[#062d48]"
                                value="DayOff"
                              >
                                Day Off
                              </option>
                            </select>
                          </label>

                          {record && (
                            <button
                              className="
                                rounded-xl
                                border
                                border-red-200/20
                                bg-red-200/[.08]
                                px-3
                                py-2.5
                                font-['Poppins']
                                text-xs
                                font-medium
                                text-red-200
                                transition
                                hover:bg-red-200/[.15]
                              "
                              type="button"
                              onClick={() => onDelete(record._id)}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}

                  {!staff.length && (
                    <li className="rounded-xl border border-sky-100/[.07] bg-white/[.035] px-4 py-8 text-center font-['Poppins'] text-sm text-[#789faa]">
                      No staff members yet.
                    </li>
                  )}
                </ul>
              </form>
            </div>

            {/* Modal footer */}
            <div className="shrink-0 border-t border-sky-100/[.08] px-4 py-3 sm:px-6">
              <button
                className="
                  w-full
                  rounded-xl
                  border
                  border-sky-100/15
                  bg-white/[.04]
                  px-5
                  py-2.5
                  font-['Poppins']
                  text-sm
                  font-medium
                  text-[#c9e1e5]
                  transition
                  hover:bg-white/[.08]
                "
                type="button"
                onClick={() => setDayFormOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          SHIFT SETTINGS MODAL
      ========================================================= */}
      {settingsOpen && (
        <div
          className="
            fixed
            inset-0
            z-50
            flex
            items-end
            justify-center
            bg-black/60
            backdrop-blur-sm
            sm:items-center
            sm:p-4
          "
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSettingsOpen(false);
            }
          }}
        >
          <div
            className="
              box-border
              flex
              w-full
              max-h-[94dvh]
              flex-col
              overflow-hidden
              rounded-t-3xl
              border
              border-sky-100/15
              bg-[#062d48]
              text-[#c9e1e5]
              shadow-2xl

              sm:max-w-[720px]
              sm:rounded-2xl
              sm:max-h-[calc(100dvh-2rem)]
            "
          >
            {/* Settings header */}
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-sky-100/[.08] px-5 py-4 sm:px-6">
              <div>
                <p className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-[.14em] text-[#73c4ca]">
                  Configuration
                </p>

                <h3 className="m-0 mt-1 font-['Fraunces'] text-2xl font-medium text-[#d9ecef]">
                  Shift Settings
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[.06] text-lg text-[#9bbec7] transition hover:bg-white/[.1]"
                aria-label="Close settings"
              >
                ×
              </button>
            </div>

            {/* Settings content */}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              {/* =====================================================
                  LATE DEDUCTION
              ===================================================== */}
              <div className="rounded-2xl border border-sky-100/[.08] bg-white/[.03] p-4">
                <p className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-[.1em] text-[#73c4ca]">
                  Automatic late deduction
                </p>

                <p className="mt-1.5 font-['Poppins'] text-xs leading-5 text-[#9bbec7]">
                  Amount automatically added as a payroll deduction whenever a
                  staff member is marked Late.
                </p>

                <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                  <input
                    className={fieldClass}
                    type="number"
                    min="0"
                    step="0.01"
                    value={deductionDraft}
                    onChange={(event) =>
                      setDeductionDraft(event.target.value)
                    }
                  />

                  <button
                    className="
                      rounded-xl
                      bg-[#75bec4]
                      px-4
                      py-2.5
                      font-['Poppins']
                      text-sm
                      font-bold
                      text-[#052d45]
                      transition
                      hover:bg-[#91d2d5]
                      active:scale-[.98]
                    "
                    type="button"
                    onClick={() => {
                      const amount = Number(deductionDraft);

                      if (
                        !Number.isFinite(amount) ||
                        amount < 0
                      ) {
                        return;
                      }

                      onUpdateLateDeductionAmount(amount);
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* =====================================================
                  SHIFT TEMPLATES
              ===================================================== */}
              <div className="mt-4 rounded-2xl border border-sky-100/[.08] bg-white/[.03] p-4">
                <p className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-[.1em] text-[#73c4ca]">
                  Shift Templates
                </p>

                <ul className="mt-3 grid gap-2 p-0">
                  {shiftTemplates.map((template) => (
                    <li
                      key={template._id}
                      className="
                        rounded-xl
                        border
                        border-sky-100/[.06]
                        bg-white/[.035]
                        p-3
                      "
                    >
                      <div className="min-w-0">
                        <strong className="block truncate font-['Poppins'] text-sm text-[#d9ecef]">
                          {template.name}
                        </strong>

                        <span className="mt-1 block font-['Poppins'] text-[10px] leading-4 text-[#89afb9]">
                          {template.clockInTime} · +
                          {template.graceMinutes}m grace · cutoff{" "}
                          {template.cutoffTime}
                        </span>
                      </div>

                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          className="
                            rounded-lg
                            border
                            border-sky-100/15
                            bg-white/[.05]
                            px-3
                            py-1.5
                            font-['Poppins']
                            text-[11px]
                            font-medium
                            text-[#d9ecef]
                            transition
                            hover:bg-white/[.1]
                          "
                          onClick={() =>
                            setShiftDraft({
                              id: template._id,
                              name: template.name,
                              clockInTime:
                                template.clockInTime,
                              graceMinutes:
                                template.graceMinutes,
                              cutoffTime:
                                template.cutoffTime,
                            })
                          }
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="
                            rounded-lg
                            border
                            border-red-400/20
                            bg-red-500/10
                            px-3
                            py-1.5
                            font-['Poppins']
                            text-[11px]
                            font-medium
                            text-red-300
                            transition
                            hover:bg-red-500/20
                          "
                          onClick={() =>
                            onDeleteShiftTemplate(template._id)
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}

                  {!shiftTemplates.length && (
                    <li className="rounded-xl bg-white/[.04] px-3 py-4 text-center font-['Poppins'] text-xs text-[#789faa]">
                      No shift templates yet.
                    </li>
                  )}
                </ul>

                {/* Add / edit template */}
                <div className="mt-4 grid gap-3">
                  <input
                    className={fieldClass}
                    placeholder="Shift name (e.g. Night)"
                    value={shiftDraft.name}
                    onChange={(event) =>
                      setShiftDraft((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    maxLength={40}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <label className="font-['Poppins'] text-[10px] text-[#89afb9]">
                      Clock-in

                      <input
                        className="mt-1.5 box-border w-full rounded-xl border border-sky-100/10 bg-white/[.06] px-3 py-2.5 font-['Poppins'] text-sm text-[#d9ecef] outline-none [color-scheme:dark] focus:border-[#73c4ca]"
                        type="time"
                        value={shiftDraft.clockInTime}
                        onChange={(event) =>
                          setShiftDraft((current) => ({
                            ...current,
                            clockInTime:
                              event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="font-['Poppins'] text-[10px] text-[#89afb9]">
                      Cutoff

                      <input
                        className="mt-1.5 box-border w-full rounded-xl border border-sky-100/10 bg-white/[.06] px-3 py-2.5 font-['Poppins'] text-sm text-[#d9ecef] outline-none [color-scheme:dark] focus:border-[#73c4ca]"
                        type="time"
                        value={shiftDraft.cutoffTime}
                        onChange={(event) =>
                          setShiftDraft((current) => ({
                            ...current,
                            cutoffTime:
                              event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>

                  <label className="font-['Poppins'] text-[10px] text-[#89afb9]">
                    Grace period (minutes)

                    <input
                      className="mt-1.5 box-border w-full rounded-xl border border-sky-100/10 bg-white/[.06] px-3 py-2.5 font-['Poppins'] text-sm text-[#d9ecef] outline-none [color-scheme:dark] focus:border-[#73c4ca]"
                      type="number"
                      min="0"
                      value={shiftDraft.graceMinutes}
                      onChange={(event) =>
                        setShiftDraft((current) => ({
                          ...current,
                          graceMinutes:
                            event.target.value,
                        }))
                      }
                    />
                  </label>

                  <button
                    type="button"
                    className="
                      w-full
                      rounded-xl
                      bg-[#75bec4]
                      px-4
                      py-2.5
                      font-['Poppins']
                      text-sm
                      font-bold
                      text-[#052d45]
                      transition
                      hover:bg-[#91d2d5]
                      active:scale-[.98]
                    "
                    onClick={() => {
                      if (!shiftDraft.name.trim()) return;

                      onSaveShiftTemplate(shiftDraft);

                      setShiftDraft({
                        id: null,
                        name: "",
                        clockInTime: "07:00",
                        graceMinutes: 15,
                        cutoffTime: "18:00",
                      });
                    }}
                  >
                    {shiftDraft.id
                      ? "Update Shift"
                      : "Add Shift"}
                  </button>
                </div>
              </div>

              {/* =====================================================
                  DATE-SPECIFIC ASSIGNMENT
              ===================================================== */}
              <div className="mt-4 rounded-2xl border border-sky-100/[.08] bg-white/[.03] p-4">
                <p className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-[.12em] text-[#73c4ca]">
                  Date-specific shift
                </p>

                <p className="mt-1.5 font-['Poppins'] text-xs leading-5 text-[#9bbec7]">
                  Assign a different shift to a staff member for one
                  specific date.
                </p>

                <div className="mt-3 grid gap-2">
                  <select
                    className={fieldClass}
                    value={assignmentDraft.staffId}
                    onChange={(event) =>
                      setAssignmentDraft((current) => ({
                        ...current,
                        staffId: event.target.value,
                      }))
                    }
                  >
                    <option
                      className="bg-[#062d48]"
                      value=""
                    >
                      Choose staff
                    </option>

                    {staff.map((person) => (
                      <option
                        className="bg-[#062d48]"
                        key={person._id}
                        value={person._id}
                      >
                        {person.staffName}
                      </option>
                    ))}
                  </select>

                  <input
                    className={fieldClass}
                    type="date"
                    min={todayISODate()}
                    value={assignmentDraft.dateKey}
                    onChange={(event) =>
                      setAssignmentDraft((current) => ({
                        ...current,
                        dateKey: event.target.value,
                      }))
                    }
                  />

                  <select
                    className={fieldClass}
                    value={assignmentDraft.shiftTemplateId}
                    onChange={(event) =>
                      setAssignmentDraft((current) => ({
                        ...current,
                        shiftTemplateId:
                          event.target.value,
                      }))
                    }
                  >
                    <option
                      className="bg-[#062d48]"
                      value=""
                    >
                      Choose shift
                    </option>

                    {shiftTemplates.map((template) => (
                      <option
                        className="bg-[#062d48]"
                        key={template._id}
                        value={template._id}
                      >
                        {template.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="
                      w-full
                      rounded-xl
                      bg-[#75bec4]
                      px-4
                      py-2.5
                      font-['Poppins']
                      text-sm
                      font-bold
                      text-[#052d45]
                      transition
                      hover:bg-[#91d2d5]
                      disabled:cursor-not-allowed
                      disabled:opacity-40
                    "
                    disabled={
                      !assignmentDraft.staffId ||
                      !assignmentDraft.dateKey ||
                      !assignmentDraft.shiftTemplateId
                    }
                    onClick={() => {
                      onSaveShiftAssignment(
                        assignmentDraft,
                      );

                      setAssignmentDraft({
                        staffId: "",
                        dateKey: "",
                        shiftTemplateId: "",
                      });
                    }}
                  >
                    Assign Shift
                  </button>
                </div>

                <ul className="mt-3 grid gap-2 p-0">
                  {shiftAssignments.map((assignment) => {
                    const person = staff.find(
                      (item) =>
                        item._id ===
                        (assignment.staffId?._id ||
                          assignment.staffId),
                    );

                    const template =
                      shiftTemplates.find(
                        (item) =>
                          item._id ===
                          (assignment.shiftTemplateId?._id ||
                            assignment.shiftTemplateId),
                      );

                    return (
                      <li
                        key={assignment._id}
                        className="rounded-xl bg-white/[.04] p-3 font-['Poppins'] text-xs text-[#c9e1e5]"
                      >
                        <div className="min-w-0">
                          <strong className="block truncate text-[#d9ecef]">
                            {person?.staffName ||
                              "Unknown staff"}
                          </strong>

                          <span className="mt-1 block text-[10px] text-[#89afb9]">
                            {assignment.dateKey} ·{" "}
                            {template?.name ||
                              "Unknown shift"}
                          </span>
                        </div>

                        <button
                          type="button"
                          className="mt-2 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-1.5 text-[11px] font-medium text-red-300 transition hover:bg-red-500/20"
                          onClick={() =>
                            onDeleteShiftAssignment(
                              assignment._id,
                            )
                          }
                        >
                          Remove
                        </button>
                      </li>
                    );
                  })}

                  {!shiftAssignments.length && (
                    <li className="rounded-xl bg-white/[.04] px-3 py-4 text-center text-xs text-[#789faa]">
                      No date-specific assignments yet.
                    </li>
                  )}
                </ul>
              </div>

              {/* =====================================================
                  DEFAULT STAFF SHIFT
              ===================================================== */}
              <div className="mt-4 rounded-2xl border border-sky-100/[.08] bg-white/[.03] p-4">
                <p className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-[.1em] text-[#73c4ca]">
                  Default shift per staff
                </p>

                <ul className="mt-3 grid gap-2 p-0">
                  {staff.map((person) => (
                    <li
                      key={person._id}
                      className="rounded-xl bg-white/[.04] p-3"
                    >
                      <span className="block truncate font-['Poppins'] text-sm text-[#d9ecef]">
                        {person.staffName}
                      </span>

                      <select
                        className={`${fieldClass} mt-2`}
                        value={person.shiftTemplateId || ""}
                        onChange={(event) =>
                          onAssignStaffShift(
                            person._id,
                            event.target.value || null,
                          )
                        }
                      >
                        <option
                          className="bg-[#062d48]"
                          value=""
                        >
                          Default schedule
                        </option>

                        {shiftTemplates.map((template) => (
                          <option
                            className="bg-[#062d48]"
                            key={template._id}
                            value={template._id}
                          >
                            {template.name}
                          </option>
                        ))}
                      </select>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Settings footer */}
            <div className="shrink-0 border-t border-sky-100/[.08] px-4 py-3 sm:px-6">
              <button
                className="
                  w-full
                  rounded-xl
                  border
                  border-sky-100/15
                  bg-white/[.04]
                  px-5
                  py-2.5
                  font-['Poppins']
                  text-sm
                  font-medium
                  text-[#c9e1e5]
                  transition
                  hover:bg-white/[.08]
                "
                type="button"
                onClick={() => setSettingsOpen(false)}
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

export default Attendance;
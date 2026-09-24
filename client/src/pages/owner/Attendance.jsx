import { useEffect, useMemo, useState } from "react";

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
  "mt-1.5 box-border w-full rounded-xl border border-sky-100/10 bg-white/[.06] px-3 py-2.5 font-['Poppins'] text-sm text-[#d9ecef] outline-none [color-scheme:dark] focus:border-[#73c4ca]";

function toDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getLocalDateKey(date) {
  return toDateKey(date.getFullYear(), date.getMonth(), date.getDate());
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
}) {
  const today = new Date();
  const [calendarMonth, setCalendarMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(getLocalDateKey(today));
  const [dayFormOpen, setDayFormOpen] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shiftDraft, setShiftDraft] = useState({
    id: null,
    name: "",
    clockInTime: "07:00",
    graceMinutes: 15,
    cutoffTime: "18:00",
  });
  const [deductionDraft, setDeductionDraft] = useState(
    String(lateDeductionAmount ?? 0),
  );

  useEffect(() => {
    setDeductionDraft(String(lateDeductionAmount ?? 0));
  }, [lateDeductionAmount]);

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: firstDay + daysInMonth }, (_, index) => {
      if (index < firstDay) return null;
      const day = index - firstDay + 1;
      return { day, dateKey: toDateKey(year, month, day) };
    });
  }, [calendarMonth]);

  const selectedRecords = records.filter(
    (record) => record.dateKey === selectedDate,
  );
  // A selected day is a check-in view: only staff who actually logged a
  // present/late attendance record on that date are shown.
  const recordForStaff = (staffId) =>
    selectedRecords.find((record) => record.userId?._id === staffId);
  const monthLabel = calendarMonth.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const moveMonth = (amount) => {
    setCalendarMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + amount, 1),
    );
  };

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[0.16em] text-[#73c4ca]">
            Attendance Calendar
          </p>
          <p className="mt-3 font-['Poppins'] text-sm text-[#9bbec7]">
            Manage attendance for each staff member.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-full border border-sky-100/15 bg-white/[.05] px-4 py-2.5 font-['Poppins'] text-sm font-medium text-[#d9ecef] transition hover:bg-white/[.1] focus:outline-none focus:ring-2 focus:ring-[#73c4ca]"
            type="button"
            onClick={() => setSettingsOpen(true)}
          >
            Shift Settings
          </button>
          <button
            className="rounded-full border border-sky-100/15 bg-white/[.05] px-4 py-2.5 font-['Poppins'] text-sm font-medium text-[#d9ecef] transition hover:bg-white/[.1] focus:outline-none focus:ring-2 focus:ring-[#73c4ca]"
            type="button"
            onClick={() => {
              const now = new Date();
              setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
              setSelectedDate(getLocalDateKey(now));
              setDayFormOpen(false);
            }}
          >
            Today
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-5 shadow-[0_14px_35px_rgba(0,12,31,.14)] sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <button
            className="grid h-9 w-9 place-items-center rounded-lg border border-sky-100/10 bg-white/[.05] font-['Poppins'] text-sm text-[#bce9e9] transition hover:bg-white/[.1]"
            type="button"
            onClick={() => moveMonth(-1)}
            aria-label="Previous month"
          >
            &lt;
          </button>
          <h3 className="m-0 font-['Fraunces'] text-2xl font-medium text-[#d9ecef]">
            {monthLabel}
          </h3>
          <button
            className="grid h-9 w-9 place-items-center rounded-lg border border-sky-100/10 bg-white/[.05] font-['Poppins'] text-sm text-[#bce9e9] transition hover:bg-white/[.1]"
            type="button"
            onClick={() => moveMonth(1)}
            aria-label="Next month"
          >
            &gt;
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center sm:gap-2">
          {weekDays.map((day) => (
            <strong
              className="font-['Poppins'] text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-[#80aab4]"
              key={day}
            >
              {day}
            </strong>
          ))}
        </div>

        <div className="mt-1.5 grid grid-cols-7 gap-1.5 sm:gap-2">
          {calendarDays.map((calendarDay, index) => {
            if (!calendarDay)
              return (
                <div
                  className="min-h-[58px] sm:min-h-[76px]"
                  key={`empty-${index}`}
                />
              );
            const dayRecords = records.filter(
              (record) => record.dateKey === calendarDay.dateKey,
            );
            const isSelected = selectedDate === calendarDay.dateKey;
            const activeStatuses = Object.keys(statusStyles).filter((status) =>
              dayRecords.some((record) => record.status === status),
            );
            return (
              <button
                className={`flex min-h-[58px] flex-col items-start gap-1 rounded-lg border p-1.5 text-left font-['Poppins'] transition sm:min-h-[76px] sm:rounded-xl sm:p-2 ${
                  isSelected
                    ? "border-[#73c4ca] bg-[#73c4ca]/15"
                    : "border-sky-100/10 bg-white/[.025] hover:border-[#73c4ca]/55 hover:bg-[#73c4ca]/[.09]"
                }`}
                type="button"
                key={calendarDay.dateKey}
                onClick={() => {
                  setSelectedDate(calendarDay.dateKey);
                  setDayFormOpen(true);
                }}
              >
                <span className="text-sm text-[#c9e1e5]">
                  {calendarDay.day}
                </span>
                {dayRecords.length > 0 && (
                  <small className="hidden text-[10px] text-[#84aeb7] sm:block">
                    {dayRecords.length} record
                    {dayRecords.length === 1 ? "" : "s"}
                  </small>
                )}
                <div className="flex gap-1">
                  {activeStatuses.map((status) => (
                    <i
                      className={`grid h-[15px] w-[15px] place-items-center rounded-full text-[9px] font-bold not-italic sm:h-[18px] sm:w-[18px] sm:text-[10px] ${statusStyles[status]}`}
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
      </div>

      {dayFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={(event) => {
            if (event.target === event.currentTarget) setDayFormOpen(false);
          }}
        >
          <div
            aria-labelledby="selected-day-title"
            className="box-border w-full max-w-[680px] max-h-[min(760px,calc(100dvh-2rem))] overflow-y-auto rounded-2xl border border-sky-100/15 bg-[#062d48] p-5 text-[#c9e1e5] shadow-2xl"
          >
            <h3
              id="selected-day-title"
              className="m-0 mb-2 font-['Fraunces'] text-2xl font-medium text-[#d9ecef]"
            >
              Attendance for {selectedDate}
            </h3>
            <p className="font-['Poppins'] text-sm text-[#9bbec7]">
              Choose the attendance status for each staff member on day{" "}
              {selectedDate}.
            </p>
            <form onSubmit={(event) => event.preventDefault()}>
              <ul className="mt-5 grid gap-3 p-0">
                {staff.map((item) => {
                  const record = recordForStaff(item._id);
                  return (
                    <li
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-sky-100/[.07] bg-white/[.035] px-4 py-3"
                      key={item._id}
                    >
                      <div className="min-w-0 flex-1">
                        <strong className="block font-['Poppins'] text-sm font-medium text-[#d9ecef]">
                          {item.staffName}
                        </strong>
                        <span className="font-['Poppins'] text-xs text-[#7dabb5]">
                          {item.staffPosition}
                        </span>
                        <div className="mt-1 flex flex-wrap gap-x-3 font-['Poppins'] text-[11px] text-[#89afb9]">
                          <span>
                            In:{" "}
                            <span className="text-[#bce9e9]">
                              {record?.checkIn
                                ? new Date(record.checkIn).toLocaleTimeString(
                                    "en-PH",
                                    { hour: "numeric", minute: "2-digit" },
                                  )
                                : "—"}
                            </span>
                          </span>
                          <span>
                            Out:{" "}
                            <span className="text-[#bce9e9]">
                              {record?.checkOut
                                ? new Date(record.checkOut).toLocaleTimeString(
                                    "en-PH",
                                    { hour: "numeric", minute: "2-digit" },
                                  )
                                : "—"}
                            </span>
                          </span>
                        </div>
                      </div>

                      <label className="font-['Poppins'] text-xs font-medium text-[#a9c8cf]">
                        Attendance Status
                        <select
                          className={fieldClass}
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
                          <option className="bg-[#062d48]" value="">
                            Choose status
                          </option>
                          <option className="bg-[#062d48]" value="Present">
                            Present
                          </option>
                          <option className="bg-[#062d48]" value="Late">
                            Late
                          </option>
                          <option className="bg-[#062d48]" value="Absent">
                            Absent
                          </option>
                          <option className="bg-[#062d48]" value="Leave">
                            Leave
                          </option>
                          <option className="bg-[#062d48]" value="DayOff">
                            Day Off
                          </option>
                        </select>
                      </label>
                      {record && (
                        <button
                          className="rounded-full border border-red-200/25 bg-red-200/10 px-3 py-1.5 font-['Poppins'] text-xs font-medium text-red-100 transition hover:bg-red-200/20"
                          type="button"
                          onClick={() => onDelete(record._id)}
                        >
                          Delete record
                        </button>
                      )}
                    </li>
                  );
                })}
                {!staff.length && (
                  <li className="rounded-xl border border-sky-100/[.07] bg-white/[.035] px-4 py-8 text-center font-['Poppins'] text-sm text-[#789faa]">
                    No staff members yet.
                  </li>
                )}
              </ul>
              <button
                className="bg-transparent mt-5 rounded-full border border-sky-100/15 px-5 py-2.5 font-['Poppins'] text-sm text-[#c9e1e5] transition hover:bg-[#73c4ca] hover:text-black"
                type="button"
                onClick={() => setDayFormOpen(false)}
              >
                Close
              </button>
            </form>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSettingsOpen(false);
          }}
        >
          <div className="box-border w-full max-w-[720px] max-h-[min(820px,calc(100dvh-2rem))] overflow-y-auto rounded-2xl border border-sky-100/15 bg-[#062d48] p-5 text-[#c9e1e5] shadow-2xl">
            <h3 className="m-0 mb-4 font-['Fraunces'] text-2xl font-medium text-[#d9ecef]">
              Shift & attendance settings
            </h3>

            {/* Late deduction amount */}
            <div className="rounded-xl border border-sky-100/[.08] bg-white/[.03] p-4">
              <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[.1em] text-[#73c4ca]">
                Automatic late deduction
              </p>
              <p className="mt-1 font-['Poppins'] text-xs text-[#9bbec7]">
                This amount is automatically added as a payroll deduction for each day a staff member is marked Late.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <input
                  className={fieldClass}
                  type="number"
                  min="0"
                  step="0.01"
                  value={deductionDraft}
                  onChange={(event) => setDeductionDraft(event.target.value)}
                />
                <button
                  className="shrink-0 rounded-full bg-[#75bec4] px-4 py-2.5 font-['Poppins'] text-sm font-medium text-[#052d45] transition hover:bg-[#91d2d5]"
                  type="button"
                  onClick={() => {
                    const amount = Number(deductionDraft);
                    if (!Number.isFinite(amount) || amount < 0) return;
                    onUpdateLateDeductionAmount(amount);
                  }}
                >
                  Save
                </button>
              </div>
            </div>

            {/* Shift templates */}
            <div className="mt-5 rounded-xl border border-sky-100/[.08] bg-white/[.03] p-4">
              <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[.1em] text-[#73c4ca]">
                Shift templates
              </p>
              <ul className="mt-3 grid gap-2 p-0">
                {shiftTemplates.map((template) => (
                  <li
                    key={template._id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/[.04] px-3 py-2 font-['Poppins'] text-xs text-[#c9e1e5]"
                  >
                    <span>
                      <strong className="text-[#d9ecef]">{template.name}</strong>
                      {" · "}
                      {template.clockInTime} (+{template.graceMinutes}m grace) → cutoff {template.cutoffTime}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-full border border-sky-100/15 bg-white/[.05] px-2.5 py-1 text-[11px] font-medium text-[#d9ecef] transition hover:bg-white/[.1]"
                        onClick={() =>
                          setShiftDraft({
                            id: template._id,
                            name: template.name,
                            clockInTime: template.clockInTime,
                            graceMinutes: template.graceMinutes,
                            cutoffTime: template.cutoffTime,
                          })
                        }
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-red-400/20 bg-red-500/10 px-2.5 py-1 text-[11px] font-medium text-red-300 transition hover:bg-red-500/20"
                        onClick={() => onDeleteShiftTemplate(template._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
                {!shiftTemplates.length && (
                  <li className="rounded-lg bg-white/[.04] px-3 py-3 text-center text-xs text-[#789faa]">
                    No shift templates yet. Add one below (e.g. "Morning", "Night").
                  </li>
                )}
              </ul>

              <div className="mt-4 grid gap-2 sm:grid-cols-[1.2fr_1fr_.8fr_1fr_auto]">
                <input
                  className={fieldClass}
                  placeholder="Shift name (e.g. Night)"
                  value={shiftDraft.name}
                  onChange={(event) => setShiftDraft((current) => ({ ...current, name: event.target.value }))}
                  maxLength={40}
                />
                <label className="font-['Poppins'] text-[10px] text-[#89afb9]">
                  Clock-in
                  <input
                    className={fieldClass}
                    type="time"
                    value={shiftDraft.clockInTime}
                    onChange={(event) => setShiftDraft((current) => ({ ...current, clockInTime: event.target.value }))}
                  />
                </label>
                <label className="font-['Poppins'] text-[10px] text-[#89afb9]">
                  Grace (min)
                  <input
                    className={fieldClass}
                    type="number"
                    min="0"
                    value={shiftDraft.graceMinutes}
                    onChange={(event) => setShiftDraft((current) => ({ ...current, graceMinutes: event.target.value }))}
                  />
                </label>
                <label className="font-['Poppins'] text-[10px] text-[#89afb9]">
                  Cutoff
                  <input
                    className={fieldClass}
                    type="time"
                    value={shiftDraft.cutoffTime}
                    onChange={(event) => setShiftDraft((current) => ({ ...current, cutoffTime: event.target.value }))}
                  />
                </label>
                <button
                  type="button"
                  className="self-end rounded-full bg-[#75bec4] px-4 py-2.5 font-['Poppins'] text-sm font-medium text-[#052d45] transition hover:bg-[#91d2d5]"
                  onClick={() => {
                    if (!shiftDraft.name.trim()) return;
                    onSaveShiftTemplate(shiftDraft);
                    setShiftDraft({ id: null, name: "", clockInTime: "07:00", graceMinutes: 15, cutoffTime: "18:00" });
                  }}
                >
                  {shiftDraft.id ? "Update" : "Add"}
                </button>
              </div>
            </div>

            {/* Per-staff assignment */}
            <div className="mt-5 rounded-xl border border-sky-100/[.08] bg-white/[.03] p-4">
              <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[.1em] text-[#73c4ca]">
                Assign staff to a shift
              </p>
              <ul className="mt-3 grid gap-2 p-0">
                {staff.map((person) => (
                  <li
                    key={person._id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/[.04] px-3 py-2 font-['Poppins'] text-xs text-[#c9e1e5]"
                  >
                    <span>{person.staffName}</span>
                    <select
                      className={fieldClass}
                      value={person.shiftTemplateId || ""}
                      onChange={(event) => onAssignStaffShift(person._id, event.target.value || null)}
                    >
                      <option className="bg-[#062d48]" value="">
                        Default schedule
                      </option>
                      {shiftTemplates.map((template) => (
                        <option className="bg-[#062d48]" key={template._id} value={template._id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </div>

            <button
              className="bg-transparent mt-5 rounded-full border border-sky-100/15 px-5 py-2.5 font-['Poppins'] text-sm text-[#c9e1e5] transition hover:bg-[#73c4ca] hover:text-black"
              type="button"
              onClick={() => setSettingsOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default Attendance;
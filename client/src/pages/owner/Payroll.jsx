import { useMemo, useState } from "react";
import SwalAlert from "sweetalert2";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});
const dateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const today = () => dateKey(new Date());
const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const money = (value) => asNumber(value, 0).toFixed(2);
const formatDisplayDate = (value) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const [year, month, day] = value.split("-").map(Number);
  const safeDate = new Date(year, month - 1, day);
  if (Number.isNaN(safeDate.getTime())) return "";
  return safeDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );

const ADDITION_PRESETS = [
  "Overtime",
  "Holiday Pay",
  "Night Differential",
  "Performance Bonus",
  "Allowance",
];

const DEDUCTION_PRESETS = [
  "SSS Contribution",
  "PhilHealth",
  "Pag-IBIG",
  "Cash Advance (Vale)",
  "Late / Undertime",
  "Uniform Fee",
];

function getSelectedStaffRecords(attendance, staffId, startDate, endDate) {
  if (!staffId) return [];
  return (attendance || []).filter((record) => {
    const recordStaffId = record.userId?._id || record.userId;
    return (
      String(recordStaffId) === String(staffId) &&
      record.dateKey >= startDate &&
      record.dateKey <= endDate
    );
  });
}

function formatTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getHoursWorked(checkIn, checkOut) {
  if (!checkIn || !checkOut) return "-";
  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return "-";
  const totalMinutes = Math.max(0, Math.round((end - start) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function getRange(type, value) {
  const safeValue = value || today();
  const [year, month, day] = safeValue.split("-").map(Number);
  const initial = new Date(year, month - 1, type === "monthly" ? 1 : day);
  const start = new Date(initial);
  if (type === "weekly") {
    const dayOffset = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - dayOffset);
  }
  const end = new Date(start);
  if (type === "weekly") end.setDate(end.getDate() + 6);
  else if (type === "fifteenDays") end.setDate(end.getDate() + 14);
  else end.setMonth(end.getMonth() + 1, 0);
  return { start: dateKey(start), end: dateKey(end) };
}

function normalizePeriodStart(value, type) {
  if (!value) return value;
  if (type !== "weekly") return value;

  const [year, month, day] = value.split("-").map(Number);
  const entryDate = new Date(year, month - 1, day);
  if (Number.isNaN(entryDate.getTime())) return value;

  const startOfWeek = new Date(entryDate);
  const dayOffset = (startOfWeek.getDay() + 6) % 7;
  startOfWeek.setDate(startOfWeek.getDate() - dayOffset);
  return dateKey(startOfWeek);
}

function printSlip(entry, owner, attendance, staff) {
  const popup = window.open("", "_blank", "width=980,height=980");
  if (!popup) return;

  const businessName = owner?.businessName || "Payroll Slip";
  const ownerName = owner?.ownerName || owner?.email || "";
  const printedOn = new Date().toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const selectedStaff = staff.find((person) =>
    String(person._id) === String(entry.staffId?._id || entry.staffId),
  );
  const staffRecords = (attendance || []).filter((record) => {
    const recordStaffId = record.userId?._id || record.userId;
    return (
      String(recordStaffId) === String(entry.staffId?._id || entry.staffId) &&
      record.dateKey >= entry.periodStart &&
      record.dateKey <= entry.periodEnd
    );
  });

  const baseGross = asNumber(
    entry.baseGross,
    asNumber(entry.grossPay, 0) - asNumber(entry.benefits, 0),
  );
  const netPay = asNumber(
    entry.netPay,
    baseGross + asNumber(entry.benefits, 0) - asNumber(entry.deductions, 0),
  );

  const dtrRows = staffRecords
    .map((record) => {
      const totalMinutes =
        record.checkIn && record.checkOut
          ? Math.max(
              0,
              Math.round(
                (new Date(record.checkOut).getTime() -
                  new Date(record.checkIn).getTime()) /
                  60000,
              ),
            )
          : 0;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `
        <tr>
          <td>${escapeHtml(selectedStaff?.staffName || entry.staffName || "-")}</td>
          <td>${escapeHtml(selectedStaff?.staffPosition || "-")}</td>
          <td>${escapeHtml(record.dateKey || "-")}</td>
          <td>${escapeHtml(formatTime(record.checkIn))}</td>
          <td>${escapeHtml(formatTime(record.checkOut))}</td>
          <td>${escapeHtml(record.status || "-")}</td>
          <td>${escapeHtml(totalMinutes ? `${hours}h ${minutes}m` : "-")}</td>
          <td>${escapeHtml(record.lateDeductionAmount ? peso.format(record.lateDeductionAmount) : "₱0.00")}</td>
        </tr>
      `;
    })
    .join("");

  const additionRows = (entry.benefitItems || [])
    .filter((item) => item.type === "addition")
    .map(
      (item) =>
        `<tr><td>${escapeHtml(item.name)}</td><td>+${peso.format(asNumber(item.amount, 0))}</td></tr>`,
    )
    .join("");

  const deductionRows = (entry.benefitItems || [])
    .filter((item) => item.type !== "addition")
    .map(
      (item) =>
        `<tr><td>${escapeHtml(item.name)}</td><td>-${peso.format(asNumber(item.amount, 0))}</td></tr>`,
    )
    .join("");

  popup.document.write(`
    <!doctype html>
    <title>${escapeHtml(businessName)} Payroll Slip</title>
    <style>
      body { font-family: Arial; color: #12313b; padding: 32px; max-width: 980px; margin: auto; }
      header { border-bottom: 3px solid #398e96; padding-bottom: 18px; }
      h1 { margin: 0; color: #135867; }
      h2 { font-size: 18px; margin: 24px 0 10px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th, td { padding: 10px 8px; border-bottom: 1px solid #d9e5e6; text-align: left; font-size: 12px; }
      th { background: #edf5f6; color: #12313b; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
      td:last-child, th:last-child { text-align: right; }
      .total { font-size: 18px; color: #135867; }
      .meta { margin-top: 6px; font-size: 12px; color: #5a7a82; }
      .summary { margin-top: 18px; }
    </style>

    <header>
      <h1>${escapeHtml(businessName)}</h1>
      <small>Payroll Slip · ${escapeHtml(entry.period)} · ${escapeHtml(selectedStaff?.staffName || entry.staffName)}</small>
      <p class="meta">Employee: ${escapeHtml(selectedStaff?.staffName || entry.staffName)} · Position: ${escapeHtml(selectedStaff?.staffPosition || "-")} · Approved by: ${escapeHtml(ownerName)} · Printed on: ${escapeHtml(printedOn)}</p>
    </header>

    <h2>Daily Time Record (DTR)</h2>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Position</th>
          <th>Date</th>
          <th>Clock In</th>
          <th>Clock Out</th>
          <th>Status</th>
          <th>Total</th>
          <th>Late</th>
        </tr>
      </thead>
      <tbody>
        ${dtrRows || "<tr><td colspan='8'>No attendance records found for this period.</td></tr>"}
      </tbody>
    </table>

    <div class="summary">
      <h2>Payroll Summary</h2>
      <table>
        <tr><td>Payable days</td><td>${entry.payableDays}</td></tr>
        <tr><td>Daily rate</td><td>${peso.format(entry.dailyRate)}</td></tr>
        <tr><td>Base pay</td><td>${peso.format(baseGross)}</td></tr>
        ${additionRows || "<tr><td>No additions</td><td>₱0.00</td></tr>"}
        ${deductionRows || "<tr><td>No deductions</td><td>₱0.00</td></tr>"}
        <tr class="total"><td>Net pay</td><td>${peso.format(netPay)}</td></tr>
      </table>
    </div>
  `);
  popup.document.close();
  popup.focus();
  popup.print();
}

function Field({ children }) {
  return (
    <label className="grid gap-1.5 font-['Poppins'] text-xs text-[#a9c8cf]">
      {children}
    </label>
  );
}

const input =
  "min-h-10 rounded-xl border border-sky-100/10 bg-white/[.06] px-3 font-['Poppins'] text-sm text-[#d9ecef] [color-scheme:dark] outline-none focus:border-[#73c4ca]";

function Payroll({ staff, attendance, payroll, onSave, onDelete, toast, owner }) {
  const [form, setForm] = useState({
    staffId: "",
    periodType: "monthly",
    periodStart: today(),
    dailyRate: "",
    notes: "",
  });
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState({
    name: "",
    amount: "",
    type: "addition",
  });

  const workers = staff.filter(
    (person) =>
      person.role === "Staff" && person.staffPosition !== "Master Staff",
  );
  const range = getRange(form.periodType, form.periodStart);
  const canAddItem = draft.name.trim().length > 0 && Number.isFinite(Number(draft.amount)) && Number(draft.amount) > 0;
  const [editingIndex, setEditingIndex] = useState(null);
  const [editDraft, setEditDraft] = useState({ name: "", amount: "", type: "addition" });

  const selectedRecords = useMemo(
    () => getSelectedStaffRecords(attendance, form.staffId, range.start, range.end),
    [attendance, form.staffId, range.end, range.start],
  );

  const autoLateItem = useMemo(() => {
    if (!form.staffId) return null;
    const lateRecords = selectedRecords.filter((record) => record.status === "Late");
    if (!lateRecords.length) return null;
    const lateTotal = lateRecords.reduce(
      (total, record) => total + Number(record.lateDeductionAmount || 0),
      0,
    );
    if (lateTotal <= 0) return null;
    return {
      name: `Late (${lateRecords.length} day${lateRecords.length > 1 ? "s" : ""})`,
      amount: lateTotal,
      type: "deduction",
      autoGenerated: true,
    };
  }, [form.staffId, selectedRecords]);

  const visibleItems = useMemo(() => {
    if (!autoLateItem) return items;
    return [autoLateItem, ...items];
  }, [autoLateItem, items]);

  const summary = useMemo(() => {
    const records = selectedRecords;
    const payableDays = records.filter((record) =>
      ["Present", "Late"].includes(record.status),
    ).length;

    const baseGross = payableDays * Number(form.dailyRate || 0);
    const totalAdditions = visibleItems
      .filter((item) => item.type === "addition")
      .reduce((total, item) => total + Number(item.amount), 0);

    const grossPay = baseGross + totalAdditions;

    const deductions = visibleItems
      .filter((item) => item.type === "deduction")
      .reduce((total, item) => total + Number(item.amount), 0);

    return {
      payableDays,
      baseGross,
      totalAdditions,
      grossPay,
      deductions,
      netPay: grossPay - deductions,
      lateRecords: records.filter((record) => record.status === "Late"),
      lateDeduction: autoLateItem ? Number(autoLateItem.amount) : 0,
    };
  }, [autoLateItem, form.dailyRate, selectedRecords, visibleItems]);

  const update = (event) => {
    const { name, value } = event.target;
    setForm((current) => {
      if (name === "periodStart") {
        return {
          ...current,
          periodStart: normalizePeriodStart(value, current.periodType),
        };
      }
      if (name === "periodType") {
        return {
          ...current,
          periodType: value,
          periodStart: normalizePeriodStart(current.periodStart, value),
        };
      }
      return {
        ...current,
        [name]: value,
      };
    });
  };

  const addItem = () => {
    const trimmedName = draft.name.trim();
    const parsedAmount = Number(draft.amount);

    if (!trimmedName) {
      SwalAlert.fire({
        title: "Invalid Input",
        text: "Please enter an item description.",
        icon: "warning",
        background: "#062d48",
        color: "#d9ecef",
      });
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      SwalAlert.fire({
        title: "Invalid Amount",
        text: "Please enter a positive numeric amount.",
        icon: "warning",
        background: "#062d48",
        color: "#d9ecef",
      });
      return;
    }

    setItems((current) => [
      ...current,
      { name: trimmedName, amount: Number(parsedAmount.toFixed(2)), type: draft.type },
    ]);
    setDraft((prev) => ({ ...prev, name: "", amount: "" }));
  };

  const beginEditItem = (index) => {
    const item = items[index];
    setEditingIndex(index);
    setEditDraft({
      name: item.name,
      amount: String(item.amount),
      type: item.type,
    });
  };

  const saveEditedItem = () => {
    const trimmedName = editDraft.name.trim();
    const parsedAmount = Number(editDraft.amount);

    if (!trimmedName || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      SwalAlert.fire({
        title: "Invalid Amount",
        text: "Please enter a valid item name and positive amount before saving.",
        icon: "warning",
        background: "#062d48",
        color: "#d9ecef",
      });
      return;
    }

    setItems((current) =>
      current.map((item, index) =>
        index === editingIndex
          ? {
              ...item,
              name: trimmedName,
              amount: Number(parsedAmount.toFixed(2)),
              type: editDraft.type,
            }
          : item,
      ),
    );
    setEditingIndex(null);
    setEditDraft({ name: "", amount: "", type: "addition" });
  };

  const confirmDelete = async (id) => {
    const result = await SwalAlert.fire({
      title: "Delete record?",
      text: "Delete this payroll record? This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      background: "#062d48",
      color: "#d9ecef",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#173d48",
    });

    if (result.isConfirmed) {
      onDelete(id);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (summary.netPay < 0) {
      SwalAlert.fire({
        title: "Invalid Calculation",
        text: "Deductions cannot exceed total gross pay.",
        icon: "error",
        background: "#062d48",
        color: "#d9ecef",
      });
      return;
    }
    onSave({
      ...form,
      periodStart: range.start,
      periodEnd: range.end,
      benefitItems: items,
      payableDays: summary.payableDays,
      baseGross: summary.baseGross,
      benefits: summary.totalAdditions,
      grossPay: summary.grossPay,
      deductions: summary.deductions,
      netPay: summary.netPay,
    });
  };

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6">
      {toast && (
        <div className="dashboard-toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
      <div>
        <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[0.16em] text-[#73c4ca]">
          Payroll
        </p>
        <p className="mt-3 font-['Poppins'] text-sm text-[#9bbec7]">
          Choose a pay schedule and calculate payroll from recorded attendance.
        </p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <form
          className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-5 shadow-[0_14px_35px_rgba(0,12,31,.14)] sm:p-6"
          onSubmit={handleSubmit}
        >
          <h3 className="m-0 font-['Fraunces'] text-2xl text-[#d9ecef]">
            Prepare payroll
          </h3>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field>
              Staff
              <select
                className={input}
                name="staffId"
                value={form.staffId}
                onChange={update}
                required
              >
                <option className="bg-[#062d48]" value="">
                  Select staff
                </option>
                {workers.map((person) => (
                  <option
                    className="bg-[#062d48]"
                    key={person._id}
                    value={person._id}
                  >
                    {person.staffName}
                  </option>
                ))}
              </select>
            </Field>
            <Field>
              Pay Schedule
              <select
                className={input}
                name="periodType"
                value={form.periodType}
                onChange={update}
              >
                <option className="bg-[#062d48]" value="weekly">
                  Weekly
                </option>
                <option className="bg-[#062d48]" value="fifteenDays">
                  Every 15 days
                </option>
                <option className="bg-[#062d48]" value="monthly">
                  Monthly
                </option>
              </select>
            </Field>
            <Field>
              Period starts
              <input
                className={input}
                name="periodStart"
                type="date"
                value={form.periodStart}
                onChange={update}
                required
              />
              {form.periodType === "weekly" && (
                <span className="text-[10px] uppercase tracking-[.1em] text-[#73c4ca]">
                  Week starts Monday
                </span>
              )}
            </Field>
            <Field>
              Payroll period
              <output className={`${input} py-2.5`}>
                {formatDisplayDate(range.start)} to {formatDisplayDate(range.end)}
              </output>
            </Field>
            <Field>
              Daily rate
              <span className="relative">
                <span className="absolute left-3 top-2.5 text-sm text-[#73c4ca]">
                  ₱
                </span>
                <input
                  className={`${input} w-full pl-7`}
                  name="dailyRate"
                  type="number"
                  min="0"
                  max="100000"
                  step="0.01"
                  value={form.dailyRate}
                  onChange={update}
                  onBlur={() =>
                    setForm((current) => ({
                      ...current,
                      dailyRate:
                        current.dailyRate === ""
                          ? ""
                          : money(current.dailyRate),
                    }))
                  }
                  placeholder="0.00"
                  required
                />
              </span>
            </Field>
          </div>

          {/* Adjustments: Additions & Deductions Section */}
          <div className="mt-5 rounded-xl border border-sky-100/[.08] bg-white/[.025] p-4">
            <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[.12em] text-[#73c4ca]">
              Additions & Deductions
            </p>

            {/* Adjustment Type Switcher */}
            <div className="mt-3 flex gap-3 font-['Poppins'] text-xs">
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({ ...prev, type: "addition" }))
                }
                className={`rounded-xl px-3 py-1.5 transition ${
                  draft.type === "addition"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                    : "bg-white/[.04] text-[#789faa] hover:bg-white/[.08]"
                }`}
              >
                + Addition (Overtime / Bonus)
              </button>
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({ ...prev, type: "deduction" }))
                }
                className={`rounded-xl px-3 py-1.5 transition ${
                  draft.type === "deduction"
                    ? "bg-red-500/20 text-red-300 border border-red-400/30"
                    : "bg-white/[.04] text-[#789faa] hover:bg-white/[.08]"
                }`}
              >
                - Deduction (SSS / Vale)
              </button>
            </div>

            {/* Quick Labels */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="font-['Poppins'] text-[11px] text-[#789faa]">
                Quick labels:
              </span>
              {(draft.type === "addition"
                ? ADDITION_PRESETS
                : DEDUCTION_PRESETS
              ).map((label) => (
                <button
                  key={label}
                  type="button"
                  className={`rounded-lg border px-2 py-0.5 font-['Poppins'] text-[11px] transition ${
                    draft.type === "addition"
                      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                      : "border-sky-100/10 bg-white/[.04] text-[#bce9e9] hover:bg-white/[.1]"
                  }`}
                  onClick={() =>
                    setDraft((current) => ({ ...current, name: label }))
                  }
                >
                  {draft.type === "addition" ? `+ ${label}` : `- ${label}`}
                </button>
              ))}
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_140px_auto]">
              <input
                className={input}
                value={draft.name}
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
                placeholder={
                  draft.type === "addition"
                    ? "e.g. Overtime pay"
                    : "e.g. SSS contribution"
                }
                maxLength={80}
              />
              <input
                className={input}
                type="number"
                min="0"
                max="100000"
                step="0.01"
                value={draft.amount}
                onChange={(event) =>
                  setDraft({ ...draft, amount: event.target.value })
                }
                onBlur={() =>
                  setDraft((current) => ({
                    ...current,
                    amount: current.amount === "" ? "" : money(current.amount),
                  }))
                }
                placeholder="₱0.00"
              />
              <button
                className="rounded-full border border-sky-100/15 bg-white/[.05] px-4 py-2.5 font-['Poppins'] text-sm font-medium text-[#d9ecef] transition hover:bg-white/[.1] focus:outline-none focus:ring-2 focus:ring-[#73c4ca] disabled:cursor-not-allowed disabled:opacity-40"
                type="button"
                onClick={addItem}
                disabled={!canAddItem}
              >
                Add
              </button>
            </div>

            <ul className="mt-3 grid gap-2 p-0">
              {visibleItems.map((item, index) => {
                const isAutoLate = item.autoGenerated;
                const itemIndex = items.findIndex((entry) => entry.name === item.name && entry.amount === item.amount && entry.type === item.type);
                const actualIndex = isAutoLate ? -1 : itemIndex;

                return (
                  <li
                    className="rounded-lg bg-white/[.04] px-3 py-2 font-['Poppins'] text-xs text-[#c9e1e5]"
                    key={`${item.name}-${index}`}
                  >
                    {editingIndex === actualIndex && !isAutoLate ? (
                      <div className="grid gap-2 sm:grid-cols-[1fr_130px_auto_auto]">
                        <input
                          className={input}
                          value={editDraft.name}
                          onChange={(event) =>
                            setEditDraft((current) => ({
                              ...current,
                              name: event.target.value,
                            }))
                          }
                          maxLength={80}
                        />
                        <input
                          className={input}
                          type="number"
                          min="0"
                          max="100000"
                          step="0.01"
                          value={editDraft.amount}
                          onChange={(event) =>
                            setEditDraft((current) => ({
                              ...current,
                              amount: event.target.value,
                            }))
                          }
                        />
                        <select
                          className={input}
                          value={editDraft.type}
                          onChange={(event) =>
                            setEditDraft((current) => ({
                              ...current,
                              type: event.target.value,
                            }))
                          }
                        >
                          <option value="addition">Addition</option>
                          <option value="deduction">Deduction</option>
                        </select>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={saveEditedItem}
                            className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-200"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingIndex(null);
                              setEditDraft({ name: "", amount: "", type: "addition" });
                            }}
                            className="rounded-full border border-sky-100/15 bg-white/[.05] px-2.5 py-1 text-[11px] font-medium text-[#d9ecef]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <span>
                          <strong
                            className={
                              item.type === "addition"
                                ? "text-emerald-300 mr-1"
                                : "text-amber-300 mr-1"
                            }
                          >
                            {item.type === "addition" ? "+ " : "- "}
                          </strong>
                          {item.name} · {peso.format(item.amount)}
                          {isAutoLate && (
                            <span className="ml-2 text-[10px] uppercase tracking-[.08em] text-[#73c4ca]">
                              auto
                            </span>
                          )}
                        </span>
                        {!isAutoLate && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => beginEditItem(actualIndex)}
                              className="rounded-full border border-sky-100/15 bg-white/[.05] px-2.5 py-1 font-['Poppins'] text-[11px] font-medium text-[#d9ecef] transition hover:bg-white/[.1]"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setItems((current) =>
                                  current.filter((_, itemIndex) => itemIndex !== actualIndex),
                                )
                              }
                              className="rounded-full border border-red-400/20 bg-red-500/10 px-2.5 py-1 font-['Poppins'] text-[11px] font-medium text-red-300 transition hover:border-red-400/40 hover:bg-red-500/20 hover:text-red-200 focus:outline-none focus:ring-1 focus:ring-red-400/50"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <Field>
            <span className="mt-4">Notes</span>
            <textarea
              className={`${input} min-h-20 p-3`}
              name="notes"
              value={form.notes}
              onChange={update}
              maxLength={1000}
            />
          </Field>
          <button
            className="mt-5 rounded-full bg-[#75bec4] px-5 py-2.5 font-['Poppins'] text-sm font-medium text-[#052d45] transition hover:bg-[#91d2d5]"
            type="submit"
          >
            Save Payroll
          </button>
        </form>

        <aside className="rounded-2xl border border-sky-100/10 bg-white/[.035] p-5 sm:p-6">
          <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[.14em] text-[#73c4ca]">
            Payroll preview
          </p>
          <h3 className="m-0 mt-2 font-['Fraunces'] text-2xl text-[#d9ecef]">
            {form.periodType === "monthly"
              ? "Monthly"
              : form.periodType === "weekly"
                ? "Weekly"
                : "15-day"}{" "}
            summary
          </h3>
          <dl className="mt-5 grid gap-3 font-['Poppins'] text-sm">
            <div className="flex justify-between border-b border-sky-100/[.08] pb-3 text-[#a9c8cf]">
              <dt>Payable days</dt>
              <dd>{summary.payableDays}</dd>
            </div>
            <div className="flex justify-between border-b border-sky-100/[.08] pb-3 text-[#a9c8cf]">
              <dt>Late days</dt>
              <dd>{summary.lateRecords.length}</dd>
            </div>
            <div className="flex justify-between border-b border-sky-100/[.08] pb-3 text-[#a9c8cf]">
              <dt>Base Pay</dt>
              <dd>{peso.format(summary.baseGross)}</dd>
            </div>
            <div className="flex justify-between border-b border-sky-100/[.08] pb-3 text-emerald-300">
              <dt>Additions (Overtime / Bonuses)</dt>
              <dd>+{peso.format(summary.totalAdditions)}</dd>
            </div>
            {autoLateItem && (
              <div className="flex justify-between border-b border-sky-100/[.08] pb-3 text-amber-300">
                <dt>{autoLateItem.name}</dt>
                <dd>-{peso.format(autoLateItem.amount)}</dd>
              </div>
            )}
            <div className="flex justify-between border-b border-sky-100/[.08] pb-3 text-[#a9c8cf]">
              <dt>Gross Pay</dt>
              <dd className="font-semibold text-[#d9ecef]">
                {peso.format(summary.grossPay)}
              </dd>
            </div>
            <div className="flex justify-between border-b border-sky-100/[.08] pb-3 text-[#a9c8cf]">
              <dt>Deductions</dt>
              <dd>-{peso.format(summary.deductions)}</dd>
            </div>
            <div className="flex justify-between pt-2 text-lg font-medium text-[#d9ecef]">
              <dt>Net pay</dt>
              <dd
                className={
                  summary.netPay < 0 ? "text-red-400" : "text-[#d9ecef]"
                }
              >
                {peso.format(summary.netPay)}
              </dd>
            </div>
          </dl>

          {summary.netPay < 0 && (
            <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 font-['Poppins'] text-xs text-red-200">
              Total deductions exceed total gross pay. Net pay cannot be
              negative.
            </div>
          )}
        </aside>
      </div>

      <div className="overflow-hidden rounded-2xl border border-sky-100/10 bg-[#062d48]/80">
        <div className="border-b border-sky-100/10 px-5 py-4">
          <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[.14em] text-[#73c4ca]">
            Saved payroll
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] border-collapse font-['Poppins'] text-sm">
            <thead className="bg-white/[.025] text-left text-xs uppercase tracking-[.1em] text-[#89afb9]">
              <tr>
                <th className="px-5 py-3">Staff</th>
                <th className="px-5 py-3">Period</th>
                <th className="px-5 py-3">Payable days</th>
                <th className="px-5 py-3">Gross Pay</th>
                <th className="px-5 py-3">Deductions</th>
                <th className="px-5 py-3">Net pay</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payroll.map((entry) => (
                <tr
                  className="border-t border-sky-100/[.07] text-[#b7d2d7]"
                  key={entry._id}
                >
                  <td className="px-5 py-4 text-[#d9ecef]">
                    {entry.staffId?.staffName || entry.staffName}
                  </td>
                  <td className="px-5 py-4">{entry.period}</td>
                  <td className="px-5 py-4">{entry.payableDays}</td>
                  <td className="px-5 py-4">{peso.format(entry.grossPay)}</td>
                  <td className="px-5 py-4">{peso.format(entry.deductions)}</td>
                  <td className="px-5 py-4 text-[#d9ecef]">
                    {peso.format(entry.netPay)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button
                        className="rounded-lg border border-sky-100/15 px-3 py-1.5 text-xs text-[#bce9e9] transition hover:bg-white/[.08]"
                        type="button"
                        onClick={() => printSlip(entry, owner, attendance, staff)}
                      >
                        Print slip
                      </button>
                      <button
                        className="rounded-lg border border-red-200/25 px-3 py-1.5 text-xs text-red-200 transition hover:bg-red-400/10"
                        type="button"
                        onClick={() => confirmDelete(entry._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default Payroll;
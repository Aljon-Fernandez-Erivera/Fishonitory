import { useMemo, useState } from "react";
import SwalAlert from "sweetalert2";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});
const dateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const today = () => dateKey(new Date());
const money = (value) => Number(value || 0).toFixed(2);

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

function getRange(type, value) {
  const [year, month, day] = (value || today()).split("-").map(Number);
  const start = new Date(year, month - 1, type === "monthly" ? 1 : day);
  const end = new Date(start);
  if (type === "weekly") end.setDate(end.getDate() + 6);
  else if (type === "fifteenDays") end.setDate(end.getDate() + 14);
  else end.setMonth(end.getMonth() + 1, 0);
  return { start: dateKey(start), end: dateKey(end) };
}

function printSlip(entry, owner) {
  const popup = window.open("", "_blank", "width=760,height=900");
  if (!popup) return;

  const businessName = owner?.businessName || "Payroll Slip";
  const ownerName = owner?.ownerName || owner?.email || "";
  const printedOn = new Date().toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const additionRows = (entry.benefitItems || [])
    .filter((item) => item.type === "addition")
    .map(
      (item) =>
        `<tr><td>${escapeHtml(item.name)}</td><td>+${peso.format(item.amount)}</td></tr>`,
    )
    .join("");

  const deductionRows = (entry.benefitItems || [])
    .filter((item) => item.type !== "addition")
    .map(
      (item) =>
        `<tr><td>${escapeHtml(item.name)}</td><td>-${peso.format(item.amount)}</td></tr>`,
    )
    .join("");

  popup.document.write(`
    <!doctype html>
    <title>${escapeHtml(businessName)} Payroll Slip</title>
    <style>
      body { font-family: Arial; color: #12313b; padding: 42px; max-width: 680px; margin: auto; }
      header { border-bottom: 3px solid #398e96; padding-bottom: 18px; }
      h1 { margin: 0; color: #135867; }
      h2 { font-size: 18px; margin: 28px 0 10px; }
      table { width: 100%; border-collapse: collapse; }
      td { padding: 10px 0; border-bottom: 1px solid #d9e5e6; }
      td:last-child { text-align: right; font-weight: 600; }
      .total { font-size: 20px; color: #135867; }
      .meta { margin-top: 6px; font-size: 12px; color: #5a7a82; }
    </style>

    <header>
      <h1>${escapeHtml(businessName)}</h1>
      <small>Payroll Slip · ${escapeHtml(entry.period)} · ${escapeHtml(entry.staffId?.staffName || entry.staffName)}</small>
      <p class="meta">Approved by: ${escapeHtml(ownerName)} · Printed on: ${escapeHtml(printedOn)}</p>
    </header>

    <h2>Basic Earnings</h2>
    <table>
      <tr><td>Payable days</td><td>${entry.payableDays}</td></tr>
      <tr><td>Daily rate</td><td>${peso.format(entry.dailyRate)}</td></tr>
      <tr><td>Base pay</td><td>${peso.format(entry.baseGross)}</td></tr>
    </table>

    <h2>Additions (Overtime / Bonuses)</h2>
    <table>${additionRows || "<tr><td>No additions</td><td>₱0.00</td></tr>"}</table>

    <h2>Deductions</h2>
    <table>
      ${deductionRows || "<tr><td>No deductions</td><td>₱0.00</td></tr>"}
      <tr class="total"><td>Net pay</td><td>${peso.format(entry.netPay)}</td></tr>
    </table>
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

  const summary = useMemo(() => {
    const records = attendance.filter(
      (record) =>
        (record.userId?._id || record.userId) === form.staffId &&
        record.dateKey >= range.start &&
        record.dateKey <= range.end,
    );
    const payableDays = records.filter((record) =>
      ["Present", "Late"].includes(record.status),
    ).length;

    const baseGross = payableDays * Number(form.dailyRate || 0);
    const totalAdditions = items
      .filter((item) => item.type === "addition")
      .reduce((total, item) => total + Number(item.amount), 0);

    const grossPay = baseGross + totalAdditions;

    const deductions = items
      .filter((item) => item.type === "deduction")
      .reduce((total, item) => total + Number(item.amount), 0);

    return {
      payableDays,
      baseGross,
      totalAdditions,
      grossPay,
      deductions,
      netPay: grossPay - deductions,
    };
  }, [attendance, form.dailyRate, form.staffId, items, range.end, range.start]);

  const update = (event) =>
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));

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
      { name: trimmedName, amount: money(parsedAmount), type: draft.type },
    ]);
    setDraft((prev) => ({ ...prev, name: "", amount: "" }));
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
              Sahuran
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
            </Field>
            <Field>
              Payroll period
              <output className={`${input} py-2.5`}>
                {range.start} to {range.end}
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
                className="rounded-full border border-sky-100/15 bg-white/[.05] px-4 py-2.5 font-['Poppins'] text-sm font-medium text-[#d9ecef] transition hover:bg-white/[.1] focus:outline-none focus:ring-2 focus:ring-[#73c4ca]"
                type="button"
                onClick={addItem}
              >
                Add
              </button>
            </div>

            <ul className="mt-3 grid gap-2 p-0">
              {items.map((item, index) => (
                <li
                  className="flex items-center justify-between rounded-lg bg-white/[.04] px-3 py-2 font-['Poppins'] text-xs text-[#c9e1e5]"
                  key={`${item.name}-${index}`}
                >
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
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setItems((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                    className="rounded-full border border-red-400/20 bg-red-500/10 px-2.5 py-1 font-['Poppins'] text-[11px] font-medium text-red-300 transition hover:border-red-400/40 hover:bg-red-500/20 hover:text-red-200 focus:outline-none focus:ring-1 focus:ring-red-400/50"
                  >
                    Remove
                  </button>
                </li>
              ))}
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
              <dt>Base Pay</dt>
              <dd>{peso.format(summary.baseGross)}</dd>
            </div>
            <div className="flex justify-between border-b border-sky-100/[.08] pb-3 text-emerald-300">
              <dt>Additions (Overtime / Bonuses)</dt>
              <dd>+{peso.format(summary.totalAdditions)}</dd>
            </div>
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
                        onClick={() => printSlip(entry, owner)}
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
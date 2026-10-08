import { useCallback, useEffect, useState } from "react";

const ALLOWED = /[^A-Za-z0-9@#$!]/g;
const MAX_LEN = 64;

const COMMON = new Set([
  "password1", "password12", "password123", "password1!", "passw0rd",
  "qwerty123", "qwerty12345", "welcome123", "admin1234", "admin12345",
  "letmein123", "iloveyou1", "abc12345", "abcd1234", "12345678a",
  "a12345678", "fishonitory1", "fishonitory123", "changeme1", "p@ssw0rd",
  "p@ssword1", "p@ssw0rd1", "pa$$w0rd", "monkey123", "dragon123",
]);

const sanitizePassword = (raw) => {
  const cleaned = String(raw ?? "").replace(ALLOWED, "");
  return {
    value: cleaned.slice(0, MAX_LEN),
    changed: cleaned.length !== String(raw ?? "").length || cleaned.length > MAX_LEN,
  };
};

function getRules(next, { current, email }) {
  const local = String(email || "").split("@")[0].toLowerCase();
  return [
    { id: "len", label: "8-64 characters", ok: next.length >= 8 && next.length <= MAX_LEN },
    { id: "letter", label: "At least one letter", ok: /[A-Za-z]/.test(next) },
    { id: "digit", label: "At least one number", ok: /\d/.test(next) },
    {
      id: "weak",
      label: "Not a common or repeated password",
      ok: next.length > 0 && !COMMON.has(next.toLowerCase()) && !/^(.)\1+$/.test(next),
    },
    {
      id: "email",
      label: "Does not contain your email name",
      ok: next.length > 0 && !(local.length >= 4 && next.toLowerCase().includes(local)),
    },
    {
      id: "diff",
      label: "Different from current password",
      ok: next.length > 0 && next !== current,
    },
  ];
}

function validate(values, ctx) {
  const errors = {};
  if (!values.current) errors.current = "Enter your current password.";

  if (!values.next) {
    errors.next = "Enter a new password.";
  } else {
    const failed = getRules(values.next, ctx).find((rule) => !rule.ok);
    if (failed) errors.next = `Password rule not met: ${failed.label.toLowerCase()}.`;
  }

  if (!errors.next) {
    if (!values.confirm) errors.confirm = "Re-enter the new password.";
    else if (values.confirm !== values.next) errors.confirm = "Passwords do not match.";
  }
  return errors;
}

const inputClass =
  "mt-1.5 box-border w-full rounded-xl border border-sky-100/10 bg-white/[.07] px-3.5 py-2.5 font-['Poppins'] text-sm text-[#d8f1f1] outline-none transition-all placeholder:text-[#6f96a0] focus:border-[#73c4ca] focus:ring-2 focus:ring-[#73c4ca]/20 disabled:cursor-not-allowed disabled:opacity-50";
const labelClass =
  "block font-['Poppins'] text-[10px] font-semibold tracking-[0.14em] text-[#9ebfc8]";
const errorClass = "mt-1.5 font-['Poppins'] text-xs text-[#ffb4b4]";
const noteClass = "mt-1.5 font-['Poppins'] text-[11px] text-[#e7c77a]";
const primaryButton =
  "cursor-pointer rounded-full border-0 bg-[#75bec4] px-6 py-2.5 font-['Poppins'] text-sm font-semibold text-[#052d45] transition hover:bg-[#91d2d5] disabled:cursor-not-allowed disabled:opacity-60";
const ghostButton =
  "cursor-pointer rounded-full border border-sky-100/15 bg-white/[.05] px-5 py-2.5 font-['Poppins'] text-sm text-[#cfe6ea] transition hover:bg-white/[.1] disabled:cursor-not-allowed disabled:opacity-60";
const sectionTitle =
  "font-['Poppins'] text-xs font-semibold uppercase tracking-[0.12em] text-[#73c4ca]";

function ChangePasswordDialog({ email, onClose, onRequestCode, onChangePassword }) {
  const [step, setStep] = useState(1);
  const [values, setValues] = useState({ current: "", next: "", confirm: "", code: "" });
  const [errors, setErrors] = useState({});
  const [stripped, setStripped] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const close = useCallback(() => {
    if (!busy) onClose();
  }, [busy, onClose]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const setField = (name) => (event) => {
    let value = event.target.value;
    let removed = false;

    if (name === "code") {
      value = value.replace(/\D/g, "").slice(0, 6);
    } else {
      const result = sanitizePassword(value);
      value = result.value;
      removed = result.changed;
    }

    setValues((previous) => ({ ...previous, [name]: value }));
    setStripped((previous) => ({ ...previous, [name]: removed }));
    setErrors((previous) => ({ ...previous, [name]: "" }));
    setFormError("");
  };

  const sendCode = async () => {
    const data = await onRequestCode(values.current);
    setCooldown(Number(data?.resendAfterSeconds) || 60);
  };

  const submitDetails = async (event) => {
    event.preventDefault();
    if (busy) return;

    const nextErrors = validate(values, { current: values.current, email });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setBusy(true);
    setFormError("");
    try {
      await sendCode();
      setStep(2);
    } catch (error) {
      setFormError(error.message || "We could not send the code.");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (busy || cooldown > 0) return;
    setBusy(true);
    setFormError("");
    try {
      await sendCode();
    } catch (error) {
      setFormError(error.message || "We could not send the code.");
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (event) => {
    event.preventDefault();
    if (busy) return;

    if (!/^\d{6}$/.test(values.code)) {
      setErrors({ code: "Enter the 6-digit code from your email." });
      return;
    }

    setBusy(true);
    setFormError("");
    try {
      await onChangePassword(values.current, values.next, values.code);
      onClose();
    } catch (error) {
      setFormError(error.message || "We could not change your password.");
    } finally {
      setBusy(false);
    }
  };

  const type = show ? "text" : "password";
  const rules = getRules(values.next, { current: values.current, email });
  const passed = rules.filter((rule) => rule.ok).length;
  const strengthTone =
    passed <= 3 ? "bg-red-400" : passed < rules.length ? "bg-amber-400" : "bg-emerald-400";

  const strippedNote = (name) =>
    stripped[name] && (
      <p className={noteClass}>
        Unsupported characters were removed. Use letters, numbers, and @ # $ ! only (max {MAX_LEN}).
      </p>
    );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#021a2b]/80 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-pw-title"
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl border border-sky-100/10 bg-[#062d48] p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={sectionTitle}>Step {step} of 2</p>
            <h2
              id="change-pw-title"
              className="m-0 mt-2 font-['Fraunces'] text-xl font-semibold text-[#e4f4f6]"
            >
              {step === 1 ? "Change password" : "Confirm it's you"}
            </h2>
          </div>

          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="cursor-pointer rounded-full border-0 bg-white/[.06] px-3 py-1 text-lg leading-none text-[#a9c8cf] hover:bg-white/[.12]"
          >
            ×
          </button>
        </div>

        {step === 1 && (
          <form className="mt-5 grid gap-4" onSubmit={submitDetails} noValidate>
            <div>
              <label className={labelClass} htmlFor="cp-current">
                CURRENT PASSWORD
              </label>
              <input
                id="cp-current"
                className={inputClass}
                type={type}
                autoComplete="current-password"
                autoFocus
                maxLength={MAX_LEN}
                spellCheck={false}
                autoCapitalize="none"
                value={values.current}
                onChange={setField("current")}
                disabled={busy}
              />
              {strippedNote("current")}
              {errors.current && <p className={errorClass}>{errors.current}</p>}
            </div>

            <div>
              <label className={labelClass} htmlFor="cp-new">
                NEW PASSWORD
              </label>
              <input
                id="cp-new"
                className={inputClass}
                type={type}
                autoComplete="new-password"
                maxLength={MAX_LEN}
                spellCheck={false}
                autoCapitalize="none"
                value={values.next}
                onChange={setField("next")}
                disabled={busy}
              />
              {strippedNote("next")}
              {errors.next && <p className={errorClass}>{errors.next}</p>}

              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[.08]">
                <div
                  className={`h-full rounded-full transition-all ${strengthTone}`}
                  style={{ width: `${(passed / rules.length) * 100}%` }}
                />
              </div>

              <ul className="m-0 mt-2 grid list-none gap-1 p-0 font-['Poppins'] text-[11px]">
                {rules.map((rule) => (
                  <li
                    key={rule.id}
                    className={rule.ok ? "text-emerald-300" : "text-[#7fa3ad]"}
                  >
                    {rule.ok ? "✓" : "○"} {rule.label}
                  </li>
                ))}
              </ul>
              <p className="m-0 mt-2 font-['Poppins'] text-[11px] text-[#719ba8]">
                Allowed symbols: @ # $ !
              </p>
            </div>

            <div>
              <label className={labelClass} htmlFor="cp-confirm">
                CONFIRM NEW PASSWORD
              </label>
              <input
                id="cp-confirm"
                className={inputClass}
                type={type}
                autoComplete="new-password"
                maxLength={MAX_LEN}
                spellCheck={false}
                autoCapitalize="none"
                value={values.confirm}
                onChange={setField("confirm")}
                disabled={busy}
              />
              {strippedNote("confirm")}
              {errors.confirm && <p className={errorClass}>{errors.confirm}</p>}
            </div>

            <label className="flex cursor-pointer items-center gap-2 font-['Poppins'] text-xs text-[#9bbec7]">
              <input
                type="checkbox"
                checked={show}
                onChange={(event) => setShow(event.target.checked)}
              />
              Show passwords
            </label>

            {formError && (
              <p className="m-0 rounded-xl border border-red-300/20 bg-red-400/10 p-3 font-['Poppins'] text-xs text-[#ffb4b4]">
                {formError}
              </p>
            )}

            <p className="m-0 font-['Poppins'] text-xs leading-relaxed text-[#9bbec7]">
              We will email a 6-digit confirmation code to your account address
              before the password is changed.
            </p>

            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className={ghostButton} onClick={close} disabled={busy}>
                Cancel
              </button>
              <button type="submit" className={primaryButton} disabled={busy}>
                {busy ? "Sending…" : "Send code"}
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form className="mt-5 grid gap-4" onSubmit={submitCode} noValidate>
            <p className="m-0 font-['Poppins'] text-sm leading-relaxed text-[#b7d4da]">
              We sent a 6-digit code to{" "}
              <span className="break-all font-semibold text-[#e4f4f6]">
                {email || "your email"}
              </span>
              . It expires in 10 minutes.
            </p>

            <div>
              <label className={labelClass} htmlFor="cp-code">
                CONFIRMATION CODE
              </label>
              <input
                id="cp-code"
                className={`${inputClass} text-center text-lg tracking-[0.5em]`}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                placeholder="000000"
                value={values.code}
                onChange={setField("code")}
                disabled={busy}
              />
              {errors.code && <p className={errorClass}>{errors.code}</p>}
            </div>

            {formError && (
              <p className="m-0 rounded-xl border border-red-300/20 bg-red-400/10 p-3 font-['Poppins'] text-xs text-[#ffb4b4]">
                {formError}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 font-['Poppins'] text-xs text-[#9bbec7]">
              <button
                type="button"
                onClick={resend}
                disabled={busy || cooldown > 0}
                className="cursor-pointer border-0 bg-transparent p-0 text-[#8cc7cc] underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setFormError("");
                  setValues((previous) => ({ ...previous, code: "" }));
                }}
                disabled={busy}
                className="cursor-pointer border-0 bg-transparent p-0 text-[#8cc7cc] underline disabled:opacity-60"
              >
                Back
              </button>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className={ghostButton} onClick={close} disabled={busy}>
                Cancel
              </button>
              <button type="submit" className={primaryButton} disabled={busy}>
                {busy ? "Saving…" : "Change password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ChangePasswordDialog;
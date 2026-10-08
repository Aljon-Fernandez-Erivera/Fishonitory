import { useCallback, useEffect, useState } from "react";
import ChangePasswordDialog from "../../components/ChangePasswordDialog.jsx";

// Same rules as the server (server/utils/validators.js).
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u;

// Strips control / zero-width characters, collapses spaces.
const isHiddenChar = (code) =>
  code <= 0x1f ||
  (code >= 0x7f && code <= 0x9f) ||
  (code >= 0x200b && code <= 0x200f) ||
  (code >= 0x202a && code <= 0x202e) ||
  (code >= 0x2060 && code <= 0x206f) ||
  code === 0xfeff;

const cleanText = (value) =>
  Array.from(
    String(value ?? "")
      .normalize("NFKC")
      .replace(/[\t\n\r]/g, " "),
  )
    .filter((char) => !isHiddenChar(char.codePointAt(0)))
    .join("")
    .replace(/\s+/g, " ");

function validateProfile({ displayName, phoneNumber }) {
  const errors = {};
  const name = cleanText(displayName).trim();
  if (name.length < 2 || name.length > 60) {
    errors.displayName = "Name must be 2-60 characters.";
  } else if (!NAME_PATTERN.test(name)) {
    errors.displayName =
      "Name can only contain letters, spaces, apostrophes, periods, and hyphens.";
  }

  const phone = String(phoneNumber ?? "").replace(/[\s.()-]/g, "");
  if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
    errors.phoneNumber = "Use international format, for example +639171234567.";
  }
  return { errors, name, phone };
}

const inputClass =
  "mt-1.5 box-border w-full rounded-xl border border-sky-100/10 bg-white/[.07] px-3.5 py-2.5 font-['Poppins'] text-sm text-[#d8f1f1] outline-none transition-all placeholder:text-[#6f96a0] focus:border-[#73c4ca] focus:ring-2 focus:ring-[#73c4ca]/20 disabled:cursor-not-allowed disabled:opacity-50";

const labelClass =
  "block font-['Poppins'] text-[10px] font-semibold tracking-[0.14em] text-[#9ebfc8]";

const errorClass = "mt-1.5 font-['Poppins'] text-xs text-[#ffb4b4]";

const primaryButton =
  "cursor-pointer rounded-full border-0 bg-[#75bec4] px-6 py-2.5 font-['Poppins'] text-sm font-semibold text-[#052d45] transition hover:bg-[#91d2d5] disabled:cursor-not-allowed disabled:opacity-60";

const ghostButton =
  "cursor-pointer rounded-full border border-sky-100/15 bg-white/[.05] px-5 py-2.5 font-['Poppins'] text-sm text-[#cfe6ea] transition hover:bg-white/[.1] disabled:cursor-not-allowed disabled:opacity-60";

const cardClass =
  "rounded-2xl border border-sky-100/15 bg-[#062d48]/80 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_14px_35px_rgba(0,12,31,.14)]";

/* ------------------------------------------------------------------ */
/* Edit profile dialog                                                 */
/* ------------------------------------------------------------------ */

function EditProfileDialog({ profile, onClose, onSave }) {
  const [values, setValues] = useState({
    displayName: profile?.displayName || "",
    phoneNumber: profile?.phoneNumber || "",
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

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

  const setField = (name) => (event) => {
    let value = cleanText(event.target.value);
    if (name === "phoneNumber") value = value.replace(/[^\d+\s.()-]/g, "").slice(0, 24);
    else value = value.slice(0, 60);

    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: "" }));
    setFormError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;

    const result = validateProfile(values);
    setErrors(result.errors);
    if (Object.keys(result.errors).length) return;

    setBusy(true);
    setFormError("");
    try {
      await onSave({ displayName: result.name, phoneNumber: result.phone });
      onClose();
    } catch (error) {
      setFormError(error.message || "We could not save your profile.");
    } finally {
      setBusy(false);
    }
  };

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
        aria-labelledby="edit-profile-title"
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl border border-sky-100/10 bg-[#062d48] p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id="edit-profile-title"
            className="m-0 font-['Fraunces'] text-xl font-semibold text-[#e4f4f6]"
          >
            Edit profile
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="cursor-pointer rounded-full border-0 bg-white/[.06] px-3 py-1 text-lg leading-none text-[#a9c8cf] hover:bg-white/[.12]"
          >
            ×
          </button>
        </div>

        <form className="mt-5 grid gap-4" onSubmit={submit} noValidate>
          <div>
            <label className={labelClass} htmlFor="ep-name">
              DISPLAY NAME
            </label>
            <input
              id="ep-name"
              className={inputClass}
              type="text"
              autoComplete="name"
              autoFocus
              maxLength={60}
              value={values.displayName}
              onChange={setField("displayName")}
              disabled={busy}
            />
            {errors.displayName && <p className={errorClass}>{errors.displayName}</p>}
          </div>

          <div>
            <label className={labelClass} htmlFor="ep-phone">
              CONTACT NUMBER
            </label>
            <input
              id="ep-phone"
              className={inputClass}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+63912345678"
              maxLength={13}
              value={values.phoneNumber}
              onChange={setField("phoneNumber")}
              disabled={busy}
            />
            {errors.phoneNumber && <p className={errorClass}>{errors.phoneNumber}</p>}
          </div>

          <p className="m-0 font-['Poppins'] text-xs leading-relaxed text-[#9bbec7]">
            Your sign-in email cannot be changed here. It is also where
            confirmation codes are sent.
          </p>

          {formError && (
            <p className="m-0 rounded-xl border border-red-300/20 bg-red-400/10 p-3 font-['Poppins'] text-xs text-[#ffb4b4]">
              {formError}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={ghostButton} onClick={close} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className={primaryButton} disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Settings page (same layout as the Owner settings)                   */
/* ------------------------------------------------------------------ */

const detailLabel =
  "font-['Poppins'] text-[10px] font-semibold uppercase tracking-wider text-[#6f9ca5]";

function AdminAccount({
  email,
  profile,
  mfaEnabled,
  onSaveProfile,
  onRequestCode,
  onChangePassword,
}) {
  const [activeTab, setActiveTab] = useState("profile");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const displayName = profile?.displayName || "";
  const phoneNumber = profile?.phoneNumber || "";

  const tabButtonClass = (tab) =>
    `cursor-pointer rounded-xl border-0 px-4 py-2 font-['Poppins'] text-xs font-medium transition sm:text-sm ${
      activeTab === tab
        ? "bg-[#65c9c9] text-[#073047] shadow-sm"
        : "bg-white/[.04] text-[#8fb7be] hover:bg-white/[.08] hover:text-[#d9ecef]"
    }`;

  const mfaLabel =
    mfaEnabled === true
      ? "2FA Enabled"
      : mfaEnabled === false
        ? "2FA Inactive"
        : "Checking…";

  const mfaTone =
    mfaEnabled === true
      ? "border border-emerald-400/30 bg-emerald-400/15 text-emerald-300"
      : "border border-sky-100/15 bg-white/[.05] text-[#9bbec7]";

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6 pb-12">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 border-b border-sky-100/10 pb-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[0.16em] text-[#73c4ca]">
            Settings
          </p>

          <p className="mt-1 font-['Poppins'] text-xs text-[#9bbec7] sm:text-sm">
            Manage your administrator profile and account security.
          </p>
        </div>

        <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 font-['Poppins'] text-xs font-medium text-emerald-300 sm:self-auto">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
          Super Admin Authorized
        </span>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={tabButtonClass("profile")}
        >
          Profile
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={tabButtonClass("security")}
        >
          Account Security
        </button>
      </div>

      {/* PROFILE */}
      {activeTab === "profile" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className={`${cardClass} lg:col-span-1`}>
            <div className="flex flex-col items-center text-center">
              <span className="grid h-20 w-20 place-items-center rounded-full bg-[#75bec4]/20 font-['Poppins'] text-3xl font-semibold text-[#bce9e9] shadow-inner">
                {(displayName || email || "A").trim().charAt(0).toUpperCase()}
              </span>
              <h3 className="m-0 mt-4 font-['Fraunces'] text-xl font-medium text-[#d9ecef]">
                {displayName || "Super Administrator"}
              </h3>
              <p className="m-0 mt-1 break-all font-['Poppins'] text-xs text-[#7fa7ae]">
                {email || "—"}
              </p>
              <span className="mt-3 rounded-full border border-sky-100/15 bg-white/[.06] px-3 py-1 font-['Poppins'] text-[0.7rem] font-medium text-[#73c4ca]">
                Platform Administrator
              </span>
            </div>

            <div className="mt-6 space-y-2.5 border-t border-sky-100/10 pt-4 font-['Poppins'] text-xs text-[#9abcc5]">
              <div className="flex justify-between gap-3">
                <span className="text-[#6f9ca5]">Account Role</span>
                <span className="font-medium text-[#73c4ca]">superAdmin</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[#6f9ca5]">Two-factor</span>
                <span className="font-medium text-[#d9ecef]">
                  {mfaEnabled === true
                    ? "Enabled"
                    : mfaEnabled === false
                      ? "Not enabled"
                      : "Checking…"}
                </span>
              </div>
            </div>
          </div>

          <div className={`${cardClass} lg:col-span-2`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="m-0 font-['Fraunces'] text-xl font-medium text-[#d9ecef]">
                  Account Details
                </h3>
                <p className="mt-1 font-['Poppins'] text-xs text-[#9bbec7]">
                  Your administrator sign-in information.
                </p>
              </div>

              <button
                type="button"
                className={ghostButton}
                onClick={() => setProfileOpen(true)}
              >
                Edit profile
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-sky-100/10 bg-white/[.03] p-4">
                <span className={detailLabel}>Display Name</span>
                <p className="m-0 mt-1 break-words font-['Poppins'] text-sm font-medium text-[#d9ecef]">
                  {displayName || "Not set"}
                </p>
              </div>

              <div className="rounded-xl border border-sky-100/10 bg-white/[.03] p-4">
                <span className={detailLabel}>Contact Number</span>
                <p className="m-0 mt-1 break-words font-['Poppins'] text-sm font-medium text-[#d9ecef]">
                  {phoneNumber || "Not set"}
                </p>
              </div>

              <div className="rounded-xl border border-sky-100/10 bg-white/[.03] p-4">
                <span className={detailLabel}>Email Address</span>
                <p className="m-0 mt-1 break-all font-['Poppins'] text-sm font-medium text-[#d9ecef]">
                  {email || "Not specified"}
                </p>
              </div>

              <div className="rounded-xl border border-sky-100/10 bg-white/[.03] p-4">
                <span className={detailLabel}>Role</span>
                <p className="m-0 mt-1 font-['Poppins'] text-sm font-medium text-[#d9ecef]">
                  Super Admin
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-[#75bec4]/20 bg-[#75bec4]/10 p-4">
              <h4 className="m-0 font-['Poppins'] text-xs font-semibold uppercase tracking-wider text-[#73c4ca]">
                Administrator Notice
              </h4>
              <p className="m-0 mt-1.5 font-['Poppins'] text-xs leading-relaxed text-[#c9e8e9]">
                This account can approve or reject businesses and manage every
                account on the platform. Keep your password and authenticator
                codes private.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ACCOUNT SECURITY */}
      {activeTab === "security" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className={`${cardClass} lg:col-span-2`}>
            {/* Password */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-sky-100/10 pb-4">
              <div className="min-w-0 flex-1 basis-60">
                <h3 className="m-0 font-['Fraunces'] text-xl font-medium text-[#d9ecef]">
                  Change Password
                </h3>
                <p className="mt-1 font-['Poppins'] text-xs text-[#9bbec7]">
                  **********
                </p>
              </div>

              <button
                type="button"
                className={primaryButton}
                onClick={() => setDialogOpen(true)}
              >
                Change password
              </button>
            </div>

            {/* Two-factor */}
            <div className="flex flex-wrap items-start justify-between gap-4 pt-5">
              <div className="min-w-0 flex-1 basis-60">
                <h3 className="m-0 font-['Fraunces'] text-xl font-medium text-[#d9ecef]">
                  Two-Factor Authentication (TOTP)
                </h3>
                <p className="mt-1 font-['Poppins'] text-xs text-[#9bbec7]">
                  A 6-digit code from your authenticator app is required every
                  time you sign in.
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 font-['Poppins'] text-xs font-medium ${mfaTone}`}
              >
                {mfaLabel}
              </span>
            </div>

            <p className="mt-4 font-['Poppins'] text-xs leading-relaxed text-[#c9e1e5]">
              Lost your phone or authenticator app? Choose &quot;Reset
              authenticator&quot; on the sign-in screen and a reset code will be
              emailed to your account address.
            </p>
          </div>

          <div className={`${cardClass} lg:col-span-1`}>
            <h3 className="m-0 font-['Fraunces'] text-xl font-medium text-[#d9ecef]">
              Security Best Practices
            </h3>
            <ul className="m-0 mt-4 list-none space-y-3 p-0 font-['Poppins'] text-xs leading-relaxed text-[#9bbec7]">
              <li className="flex gap-2">
                <span className="font-bold text-[#73c4ca]">1.</span>
                <span>
                  <strong>Lockout Protection:</strong> Accounts are locked for 5
                  minutes after repeated wrong passwords, including wrong
                  current-password attempts here.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-[#73c4ca]">2.</span>
                <span>
                  <strong>Strong Password:</strong> Use 8 or more characters with
                  letters and numbers, and never reuse it elsewhere.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-[#73c4ca]">3.</span>
                <span>
                  <strong>Session Expiry:</strong> Always click <em>Logout</em>{" "}
                  before leaving a shared computer.
                </span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {profileOpen && (
        <EditProfileDialog
          profile={profile}
          onClose={() => setProfileOpen(false)}
          onSave={onSaveProfile}
        />
      )}

      {dialogOpen && (
        <ChangePasswordDialog
          email={email}
          onClose={() => setDialogOpen(false)}
          onRequestCode={onRequestCode}
          onChangePassword={onChangePassword}
        />
      )}
    </section>
  );
}

export default AdminAccount;
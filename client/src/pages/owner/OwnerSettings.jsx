import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { API_URL } from "../../config.js";

async function ownerRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Session-Role": "Owner",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data;
}

function OwnerSettings({ user, onLogout, features, onEditWorkspace }) {
  const [activeTab, setActiveTab] = useState("profile");

  // TOTP / Security state
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [securityMessage, setSecurityMessage] = useState("");
  const [securityError, setSecurityError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user?.role !== "Owner") return;
    ownerRequest("/auth/totp/status")
      .then((data) => setTotpEnabled(Boolean(data.enabled)))
      .catch((err) => setSecurityError(err.message));
  }, [user?.role]);

  const handleStartTotpSetup = async () => {
    setBusy(true);
    setSecurityError("");
    setSecurityMessage("");
    try {
      const data = await ownerRequest("/auth/totp/setup", { method: "POST" });
      const qrDataUrl = await QRCode.toDataURL(data.otpauthUri, {
        width: 220,
        margin: 1,
        errorCorrectionLevel: "M",
      });
      setSetup({ ...data, qrDataUrl });
      setCode("");
    } catch (err) {
      setSecurityError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmTotp = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      return setSecurityError("Please enter a valid 6-digit authenticator code.");
    }
    setBusy(true);
    setSecurityError("");
    try {
      const data = await ownerRequest("/auth/totp/confirm", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      setRecoveryCodes(data.recoveryCodes || []);
      setSetup(null);
      setCode("");
      setTotpEnabled(true);
      setSecurityMessage("Two-factor authentication (TOTP) is now active! Please save your recovery codes below.");
    } catch (err) {
      setSecurityError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCancelTotpSetup = async () => {
    setBusy(true);
    setSecurityError("");
    try {
      await ownerRequest("/auth/totp/setup/cancel", { method: "POST" });
      setSetup(null);
      setCode("");
      setSecurityMessage("Authenticator setup was cancelled. No MFA code was activated.");
    } catch (err) {
      setSecurityError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    "box-border w-full rounded-xl border border-sky-100/10 bg-white/[.07] px-3.5 py-2.5 font-['Poppins'] text-sm text-[#d8f1f1] outline-none transition focus:border-[#73c4ca] focus:ring-1 focus:ring-[#73c4ca]";

  const tabButtonClass = (tab) =>
    `rounded-xl px-4 py-2 font-['Poppins'] text-xs sm:text-sm font-medium transition cursor-pointer ${
      activeTab === tab
        ? "bg-[#65c9c9] text-[#073047] shadow-sm"
        : "bg-white/[.04] text-[#8fb7be] hover:bg-white/[.08] hover:text-[#d9ecef]"
    }`;

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6 pb-12">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 border-b border-sky-100/10 pb-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-['Poppins'] text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#73c4ca]">
            PREFERENCES & MANAGEMENT
          </p>
          <h2 className="mt-1 font-['Fraunces'] text-2xl sm:text-3xl font-medium text-[#d9ecef]">
            Settings
          </h2>
          <p className="mt-1 font-['Poppins'] text-xs sm:text-sm text-[#9bbec7]">
            Manage your account security, personal profile, and system information.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 font-['Poppins'] text-xs font-medium text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            Owner Authorized
          </span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("workspace")}
          className={tabButtonClass("workspace")}
        >
          Workspace
        </button>
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
        <button
          type="button"
          onClick={() => setActiveTab("about")}
          className={tabButtonClass("about")}
        >
          About
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("contact")}
          className={tabButtonClass("contact")}
        >
          Contact & Support
        </button>
      </div>

      {/* TAB 1: PROFILE */}
      {activeTab === "profile" && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main profile summary card */}
          <div className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-6 shadow-[0_14px_35px_rgba(0,12,31,.14)] lg:col-span-1">
            <div className="flex flex-col items-center text-center">
              <span className="grid h-20 w-20 place-items-center rounded-full bg-[#75bec4]/20 font-['Poppins'] text-3xl font-semibold text-[#bce9e9] shadow-inner">
                {(user?.ownerName || user?.email || "O").trim().charAt(0).toUpperCase()}
              </span>
              <h3 className="mt-4 font-['Fraunces'] text-xl font-medium text-[#d9ecef]">
                {user?.ownerName || "Business Owner"}
              </h3>
              <p className="font-['Poppins'] text-xs text-[#7fa7ae]">
                {user?.email || "owner@fishonitory.com"}
              </p>
              <span className="mt-3 rounded-full border border-sky-100/15 bg-white/[.06] px-3 py-1 font-['Poppins'] text-[0.7rem] font-medium text-[#73c4ca]">
                Primary Owner Account
              </span>
            </div>

            <div className="mt-6 border-t border-sky-100/10 pt-4 font-['Poppins'] text-xs text-[#9abcc5] space-y-2.5">
              <div className="flex justify-between">
                <span className="text-[#6f9ca5]">Business Name</span>
                <span className="font-medium text-[#d9ecef]">{user?.businessName || "Fishonitory Aquatic Hub"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6f9ca5]">Business Type</span>
                <span className="font-medium text-[#d9ecef]">{user?.businessType || "Ornamental Fish Farm"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6f9ca5]">Account Role</span>
                <span className="font-medium text-[#73c4ca]">{user?.role || "Owner"}</span>
              </div>
            </div>
          </div>

          {/* Detailed information card */}
          <div className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-6 shadow-[0_14px_35px_rgba(0,12,31,.14)] lg:col-span-2">
            <h3 className="font-['Fraunces'] text-xl font-medium text-[#d9ecef]">
              Account Details
            </h3>
            <p className="mt-1 font-['Poppins'] text-xs text-[#9bbec7]">
              Your administrative credentials and store identity information.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-sky-100/10 bg-white/[.03] p-4">
                <label className="font-['Poppins'] text-[10px] font-semibold tracking-wider text-[#6f9ca5] uppercase">
                  Owner Full Name
                </label>
                <p className="mt-1 font-['Poppins'] text-sm font-medium text-[#d9ecef]">
                  {user?.ownerName || "Not specified"}
                </p>
              </div>

              <div className="rounded-xl border border-sky-100/10 bg-white/[.03] p-4">
                <label className="font-['Poppins'] text-[10px] font-semibold tracking-wider text-[#6f9ca5] uppercase">
                  Primary Email Address
                </label>
                <p className="mt-1 font-['Poppins'] text-sm font-medium text-[#d9ecef]">
                  {user?.email || "Not specified"}
                </p>
              </div>

              <div className="rounded-xl border border-sky-100/10 bg-white/[.03] p-4">
                <label className="font-['Poppins'] text-[10px] font-semibold tracking-wider text-[#6f9ca5] uppercase">
                  Contact Phone Number
                </label>
                <p className="mt-1 font-['Poppins'] text-sm font-medium text-[#d9ecef]">
                  {user?.phoneNumber || "Registered on file"}
                </p>
              </div>

              <div className="rounded-xl border border-sky-100/10 bg-white/[.03] p-4">
                <label className="font-['Poppins'] text-[10px] font-semibold tracking-wider text-[#6f9ca5] uppercase">
                  Business Entity
                </label>
                <p className="mt-1 font-['Poppins'] text-sm font-medium text-[#d9ecef]">
                  {user?.businessName || "Fishonitory Business"}
                </p>
              </div>

              <div className="rounded-xl border border-sky-100/10 bg-white/[.03] p-4 sm:col-span-2">
                <label className="font-['Poppins'] text-[10px] font-semibold tracking-wider text-[#6f9ca5] uppercase">
                  Business Address
                </label>
                <p className="mt-1 font-['Poppins'] text-sm font-medium text-[#d9ecef]">
                  {user?.businessAddress || "Not specified"}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-[#75bec4]/20 bg-[#75bec4]/10 p-4">
              <h4 className="font-['Poppins'] text-xs font-semibold uppercase tracking-wider text-[#73c4ca]">
                Owner Privilege Notice
              </h4>
              <p className="mt-1.5 font-['Poppins'] text-xs leading-relaxed text-[#c9e8e9]">
                As the registered business owner, this account holds full authority over financial sales, staff payroll, inventory cost adjustments, and staff accounts. Keep your login details confidential.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "workspace" && (
        <div className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-6 shadow-[0_14px_35px_rgba(0,12,31,.14)]">
          <h3 className="font-['Fraunces'] text-xl font-medium text-[#d9ecef]">Business tools</h3>
          <p className="mt-1 font-['Poppins'] text-sm text-[#9bbec7]">Select only the tools this business needs. Turning a tool off hides it but keeps all existing records for later.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(features || {}).map(([key, enabled]) => (
              <div key={key} className="rounded-xl border border-sky-100/10 bg-white/[.03] p-4">
                <p className="font-['Poppins'] text-sm font-medium capitalize text-[#d9ecef]">{key === "tanks" ? "Tank management" : key === "staff" ? "Staff management" : key === "operations" ? "Operations & reports" : key}</p>
                <p className={`mt-1 font-['Poppins'] text-xs ${enabled ? "text-emerald-300" : "text-[#8fb7be]"}`}>{enabled ? "Enabled" : "Hidden"}</p>
              </div>
            ))}
          </div>
          <button type="button" onClick={onEditWorkspace} className="mt-6 rounded-full bg-[#75bec4] px-5 py-2.5 font-['Poppins'] text-sm font-medium text-[#052d45] transition hover:bg-[#86d0d6]">Change workspace tools</button>
        </div>
      )}

      {/* TAB 2: ACCOUNT SECURITY */}
      {activeTab === "security" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-6 shadow-[0_14px_35px_rgba(0,12,31,.14)] lg:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-sky-100/10 pb-4">
              <div>
                <h3 className="font-['Fraunces'] text-xl font-medium text-[#d9ecef]">
                  Two-Factor Authentication (TOTP)
                </h3>
                <p className="mt-1 font-['Poppins'] text-xs text-[#9bbec7]">
                  Protect your owner dashboard with an authenticator app (e.g. Google Authenticator, Authy).
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 font-['Poppins'] text-xs font-medium ${
                  totpEnabled
                    ? "border border-emerald-400/30 bg-emerald-400/15 text-emerald-300"
                    : "border border-sky-100/15 bg-white/[.05] text-[#9bbec7]"
                }`}
              >
                {totpEnabled ? "2FA Enabled" : "2FA Inactive"}
              </span>
            </div>

            {securityMessage && (
              <p className="mt-4 rounded-xl border border-[#75bec4]/30 bg-[#75bec4]/10 px-4 py-3 font-['Poppins'] text-xs text-[#c9e8e9]">
                {securityMessage}
              </p>
            )}
            {securityError && (
              <p className="mt-4 rounded-xl border border-red-200/25 bg-red-200/10 px-4 py-3 font-['Poppins'] text-xs text-red-100">
                {securityError}
              </p>
            )}

            {/* Setup prompt if not enabled and setup not started */}
            {!totpEnabled && !setup && (
              <div className="mt-5 space-y-4">
                <p className="font-['Poppins'] text-xs leading-relaxed text-[#c9e1e5]">
                  Enabling two-factor authentication requires entering a 6-digit code from your phone whenever you log in. This prevents unauthorized access even if someone knows your password.
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleStartTotpSetup}
                  className="rounded-full bg-[#75bec4] px-5 py-2.5 font-['Poppins'] text-xs font-medium text-[#052d45] transition hover:bg-[#86d0d6] disabled:opacity-60 cursor-pointer"
                >
                  {busy ? "Starting setup…" : "Set Up Authenticator App"}
                </button>
              </div>
            )}

            {/* Setup QR code active */}
            {setup && (
              <div className="mt-5 grid gap-5 sm:grid-cols-[220px_1fr]">
                <div className="flex flex-col items-center justify-center rounded-xl bg-white p-3">
                  <img
                    src={setup.qrDataUrl}
                    alt="Authenticator QR Code"
                    className="h-44 w-44 object-contain"
                  />
                  <p className="mt-1 font-['Poppins'] text-[10px] text-slate-600">
                    Scan with Authenticator
                  </p>
                </div>
                <div>
                  <p className="font-['Poppins'] text-xs leading-relaxed text-[#c9e1e5]">
                    1. Scan the QR code using Google Authenticator, Microsoft Authenticator, or 1Password.
                  </p>
                  <p className="mt-2.5 break-all font-mono text-xs text-[#8cc7cc]">
                    Manual key: <span className="font-bold">{setup.manualKey}</span>
                  </p>
                  <form className="mt-4 space-y-3" onSubmit={handleConfirmTotp}>
                    <div>
                      <label className="block font-['Poppins'] text-[10px] font-semibold tracking-wider text-[#9ebfc8] uppercase">
                        Enter 6-Digit Code from App
                      </label>
                      <input
                        className={inputClass}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="000000"
                        maxLength={6}
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        required
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="submit"
                        disabled={busy}
                        className="rounded-full bg-[#75bec4] px-5 py-2 font-['Poppins'] text-xs font-medium text-[#052d45] transition hover:bg-[#86d0d6] disabled:opacity-60 cursor-pointer"
                      >
                        {busy ? "Verifying…" : "Verify and Enable"}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelTotpSetup}
                        disabled={busy}
                        className="font-['Poppins'] text-xs text-[#8fb7be] hover:text-[#d9ecef] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {false && (
              <form
                className="mt-6 grid gap-4 border-t border-sky-100/10 pt-5 sm:grid-cols-2"
                onSubmit={(event) => event.preventDefault()}
              >
                <div className="sm:col-span-2">
                  <h4 className="font-['Poppins'] text-xs font-semibold uppercase tracking-wider text-[#73c4ca]">
                    Disable Two-Factor Authentication
                  </h4>
                  <p className="mt-1 font-['Poppins'] text-xs text-[#9bbec7]">
                    To turn off 2FA, please verify your account password and provide a current authenticator code.
                  </p>
                </div>
                <div>
                  <label className="font-['Poppins'] text-[10px] font-semibold tracking-wider text-[#9ebfc8] uppercase">
                    Account Password
                  </label>
                  <input
                    type="password"
                    autoComplete="current-password"
                    className={inputClass}
                    placeholder="Enter password"
                    value={disableForm.password}
                    onChange={(e) =>
                      setDisableForm((prev) => ({ ...prev, password: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="font-['Poppins'] text-[10px] font-semibold tracking-wider text-[#9ebfc8] uppercase">
                    Current 6-Digit Code
                  </label>
                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className={inputClass}
                    placeholder="000000"
                    maxLength={6}
                    value={disableForm.code}
                    onChange={(e) =>
                      setDisableForm((prev) => ({
                        ...prev,
                        code: e.target.value.replace(/\D/g, "").slice(0, 6),
                      }))
                    }
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-full border border-red-400/30 bg-red-500/10 px-4 py-2 font-['Poppins'] text-xs font-medium text-red-200 transition hover:bg-red-500/20 disabled:opacity-60 cursor-pointer"
                  >
                    {busy ? "Disabling…" : "Disable 2FA"}
                  </button>
                </div>
              </form>
            )}

            {/* Recovery Codes Box */}
            {recoveryCodes.length > 0 && (
              <div className="mt-6 rounded-xl border border-amber-300/30 bg-amber-400/10 p-5">
                <h4 className="font-['Poppins'] text-xs font-bold uppercase tracking-wider text-amber-200">
                  Save Your One-Time Recovery Codes
                </h4>
                <p className="mt-1 font-['Poppins'] text-xs text-amber-100/80">
                  If you ever lose access to your phone or authenticator app, these codes are your only backup. Store them in a secure offline location.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {recoveryCodes.map((c) => (
                    <code
                      key={c}
                      className="rounded-lg bg-black/30 px-3 py-1.5 text-center font-mono text-xs font-bold text-amber-200"
                    >
                      {c}
                    </code>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setRecoveryCodes([])}
                  className="mt-3 rounded-full border border-amber-300/30 px-4 py-1.5 font-['Poppins'] text-xs text-amber-200 hover:bg-amber-300/10 cursor-pointer"
                >
                  I have saved these codes safely
                </button>
              </div>
            )}
          </div>

          {/* Security tips sidebar */}
          <div className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-6 shadow-[0_14px_35px_rgba(0,12,31,.14)] lg:col-span-1">
            <h3 className="font-['Fraunces'] text-xl font-medium text-[#d9ecef]">
              Security Best Practices
            </h3>
            <ul className="mt-4 space-y-3 font-['Poppins'] text-xs leading-relaxed text-[#9bbec7]">
              <li className="flex gap-2">
                <span className="text-[#73c4ca] font-bold">1.</span>
                <span>
                  <strong>Lockout Protection:</strong> Accounts are automatically locked for 5 minutes after 5 consecutive failed login attempts.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#73c4ca] font-bold">2.</span>
                <span>
                  <strong>Staff Separation:</strong> Never share your Owner credentials with regular or master staff. Use Staff Management to issue their individual logins.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#73c4ca] font-bold">3.</span>
                <span>
                  <strong>Session Expiry:</strong> Always click <em>Logout</em> before leaving public or shared shop terminals.
                </span>
              </li>
            </ul>
          </div>
        </div>
      )}    

      {/* TAB 4: ABOUT */}
      {activeTab === "about" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-6 shadow-[0_14px_35px_rgba(0,12,31,.14)] lg:col-span-2">
            <h3 className="font-['Fraunces'] text-2xl font-medium text-[#d9ecef]">
              About Fishonitory
            </h3>
            <p className="mt-2 font-['Poppins'] text-xs sm:text-sm leading-relaxed text-[#9bbec7]">
              Fishonitory is a dedicated management suite crafted specifically for ornamental fish hatcheries, breeders, and aquarium retail stores. It streamlines complex inventory tracking, tank water conditions, staff scheduling, sales POS, and payroll in a unified, modern interface.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-sky-100/10 bg-white/[.03] p-4">
                <h4 className="font-['Poppins'] text-xs font-semibold text-[#73c4ca]">
                  🐠 Livestock & Batch Tracking
                </h4>
                <p className="mt-1 font-['Poppins'] text-[11px] leading-relaxed text-[#9abcc5]">
                  Track species categories, unit costs, selling prices, supplier purchases, and mortality records with complete accountability.
                </p>
              </div>

              <div className="rounded-xl border border-sky-100/10 bg-white/[.03] p-4">
                <h4 className="font-['Poppins'] text-xs font-semibold text-[#73c4ca]">
                  🌊 Tank & Habitat Care
                </h4>
                <p className="mt-1 font-['Poppins'] text-[11px] leading-relaxed text-[#9abcc5]">
                  Maintain tank sanitation cycles, filter maintenance intervals, and specialized aquatic notes for fish health.
                </p>
              </div>

              <div className="rounded-xl border border-sky-100/10 bg-white/[.03] p-4">
                <h4 className="font-['Poppins'] text-xs font-semibold text-[#73c4ca]">
                  💰 Point of Sale & Payroll
                </h4>
                <p className="mt-1 font-['Poppins'] text-[11px] leading-relaxed text-[#9abcc5]">
                  Record live cash and online payments, generate sales receipts, track gross profits, and compute staff wages accurately.
                </p>
              </div>

              <div className="rounded-xl border border-sky-100/10 bg-white/[.03] p-4">
                <h4 className="font-['Poppins'] text-xs font-semibold text-[#73c4ca]">
                  🛡️ Role-Based Access Control
                </h4>
                <p className="mt-1 font-['Poppins'] text-[11px] leading-relaxed text-[#9abcc5]">
                  Strict segregation of duties between Owner, Master Staff, and standard Staff with audit logging for key actions.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-6 shadow-[0_14px_35px_rgba(0,12,31,.14)] lg:col-span-1">
            <h3 className="font-['Fraunces'] text-xl font-medium text-[#d9ecef]">
              System Information
            </h3>
            <div className="mt-4 space-y-3 font-['Poppins'] text-xs text-[#9bbec7]">
              <div className="flex justify-between border-b border-sky-100/10 pb-2">
                <span>Version</span>
                <span className="font-mono text-[#d9ecef]">v1.0.0 (Final)</span>
              </div>
              <div className="flex justify-between border-b border-sky-100/10 pb-2">
                <span>Release Type</span>
                <span className="text-emerald-300">Production</span>
              </div>
              <div className="flex justify-between border-b border-sky-100/10 pb-2">
                <span>Frontend</span>
                <span className="text-[#d9ecef]">React 19 + Tailwind v4</span>
              </div>
              <div className="flex justify-between border-b border-sky-100/10 pb-2">
                <span>Backend</span>
                <span className="text-[#d9ecef]">Node.js + Express API</span>
              </div>
              <div className="flex justify-between">
                <span>Database</span>
                <span className="text-[#d9ecef]">MongoDB Atlas</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CONTACT & SUPPORT */}
      {activeTab === "contact" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-6 shadow-[0_14px_35px_rgba(0,12,31,.14)] lg:col-span-2">
            <h3 className="font-['Fraunces'] text-2xl font-medium text-[#d9ecef]">
              Help & Support Center
            </h3>
            <p className="mt-2 font-['Poppins'] text-xs sm:text-sm text-[#9bbec7]">
              Need assistance with system operations, staff roles, or hardware integration? We are here to help.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-sky-100/10 bg-white/[.03] p-4">
                <p className="font-['Poppins'] text-[10px] font-bold uppercase tracking-wider text-[#73c4ca]">
                  TECHNICAL SUPPORT EMAIL
                </p>
                <p className="mt-1 font-['Poppins'] text-sm font-medium text-[#d9ecef]">
                  support@fishonitory.com
                </p>
                <p className="mt-1 font-['Poppins'] text-[11px] text-[#7fa7ae]">
                  Typically responds within 2 business hours.
                </p>
              </div>

              <div className="rounded-xl border border-sky-100/10 bg-white/[.03] p-4">
                <p className="font-['Poppins'] text-[10px] font-bold uppercase tracking-wider text-[#73c4ca]">
                  SUPPORT HELPLINE
                </p>
                <p className="mt-1 font-['Poppins'] text-sm font-medium text-[#d9ecef]">
                  +63 (02) 8123-4567
                </p>
                <p className="mt-1 font-['Poppins'] text-[11px] text-[#7fa7ae]">
                  Monday to Saturday, 8:00 AM – 6:00 PM PHT.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="font-['Fraunces'] text-lg font-medium text-[#d9ecef]">
                Frequently Asked Owner Questions
              </h4>
              <div className="mt-3 space-y-3 font-['Poppins'] text-xs text-[#9bbec7]">
                <details className="rounded-xl border border-sky-100/10 bg-white/[.02] p-3.5">
                  <summary className="font-medium text-[#d9ecef] cursor-pointer">
                    How do I export sales and audit reports for tax or accounting?
                  </summary>
                  <p className="mt-2 text-[#9abcc5] leading-relaxed">
                    Navigate to <strong>Operations & Reports</strong> in the sidebar. At the top right, use the "Export Sales" and "Export Audit" buttons to download structured CSV spreadsheets.
                  </p>
                </details>

                <details className="rounded-xl border border-sky-100/10 bg-white/[.02] p-3.5">
                  <summary className="font-medium text-[#d9ecef] cursor-pointer">
                    Can staff members access the payroll or sales profit margins?
                  </summary>
                  <p className="mt-2 text-[#9abcc5] leading-relaxed">
                    No. Staff members are limited to the Staff Dashboard where they can record sales and log tank updates. They cannot see supplier costs, profits, or payroll computations.
                  </p>
                </details>

                <details className="rounded-xl border border-sky-100/10 bg-white/[.02] p-3.5">
                  <summary className="font-medium text-[#d9ecef] cursor-pointer">
                    What happens if I lose my 2FA Authenticator phone?
                  </summary>
                  <p className="mt-2 text-[#9abcc5] leading-relaxed">
                    Use one of the one-time emergency recovery codes provided when you first set up two-factor authentication in the Account Security tab.
                  </p>
                </details>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-6 shadow-[0_14px_35px_rgba(0,12,31,.14)] lg:col-span-1">
            <h3 className="font-['Fraunces'] text-xl font-medium text-[#d9ecef]">
              Quick Actions
            </h3>
            <div className="mt-4 space-y-3">
              <a
                href="/help"
                className="block rounded-xl border border-sky-100/10 bg-white/[.04] p-3.5 font-['Poppins'] text-xs font-medium text-[#c9e1e5] no-underline transition hover:bg-white/[.08] hover:text-[#d9ecef]"
              >
                📖 Open Full Help Guide
              </a>
              <button
                type="button"
                onClick={onLogout}
                className="w-full rounded-xl border border-red-300/20 bg-red-400/10 p-3.5 text-left font-['Poppins'] text-xs font-medium text-red-200 transition hover:bg-red-400/20 cursor-pointer"
              >
                🚪 Sign Out of Current Session
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default OwnerSettings;

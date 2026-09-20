import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { API_URL } from "../../config.js";
import { useAuth } from "./useAuth.js";

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

function AccountPage() {
  const { user, authReady } = useAuth();
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authReady || user?.role !== "Owner") return;
    ownerRequest("/auth/totp/status")
      .then((data) => setTotpEnabled(data.enabled))
      .catch((requestError) => setError(requestError.message));
  }, [authReady, user?.role]);

  if (!authReady) return null;
  if (user?.role !== "Owner") {
    window.location.replace(
      user?.role === "masterStaff" ? "/staff-dashboard" : "/login",
    );
    return null;
  }

  const startSetup = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const data = await ownerRequest("/auth/totp/setup", { method: "POST" });
      const qrDataUrl = await QRCode.toDataURL(data.otpauthUri, {
        width: 240,
        margin: 1,
        errorCorrectionLevel: "M",
      });
      setSetup({ ...data, qrDataUrl });
      setCode("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmSetup = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code))
      return setError("Enter the current 6-digit authenticator code.");
    setBusy(true);
    setError("");
    try {
      const data = await ownerRequest("/auth/totp/confirm", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      setRecoveryCodes(data.recoveryCodes || []);
      setSetup(null);
      setCode("");
      setTotpEnabled(true);
      setMessage(
        "TOTP is enabled. Save the recovery codes below before leaving this page.",
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const cancelSetup = async () => {
    setBusy(true);
    setError("");
    try {
      await ownerRequest("/auth/totp/setup/cancel", { method: "POST" });
      setSetup(null);
      setCode("");
      setMessage("Authenticator setup was cancelled.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    "mt-1.5 box-border w-full rounded-xl border border-sky-100/10 bg-white/[.07] px-3 py-2.5 font-['Poppins'] text-sm text-[#d8f1f1] outline-none focus:border-[#73c4ca]";

  return (
    <main className="min-h-[100dvh] bg-[#021a31] px-4 py-8 text-[#c9e1e5] sm:px-6">
      <section className="mx-auto w-full max-w-2xl rounded-2xl border border-sky-100/10 bg-[#062d48]/85 p-5 shadow-[0_24px_70px_rgba(0,12,31,.25)] sm:p-8">
        <p className="font-['Poppins'] text-[0.65rem] font-medium tracking-[0.16em] text-[#73c4ca]">
          OWNER ACCOUNT
        </p>
        <h1 className="mt-2 font-['Fraunces'] text-3xl font-medium text-[#d9ecef]">
          Account security
        </h1>
        <p className="mt-2 font-['Poppins'] text-sm text-[#9abcc5]">
          Protect the administrator account for{" "}
          {user?.businessName || "your business"}.
        </p>
        {message && (
          <p
            className="mt-5 rounded-xl border border-[#75bec4]/30 bg-[#75bec4]/10 px-4 py-3 font-['Poppins'] text-sm text-[#c9e8e9]"
            role="status"
          >
            {message}
          </p>
        )}
        {error && (
          <p
            className="mt-5 rounded-xl border border-red-200/25 bg-red-200/10 px-4 py-3 font-['Poppins'] text-sm text-red-100"
            role="alert"
          >
            {error}
          </p>
        )}
        <div className="mt-6 rounded-2xl border border-sky-100/10 bg-white/[.035] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-['Poppins'] text-base font-medium text-[#d9ecef]">
                Authenticator app
              </h2>
              <p className="mt-1 font-['Poppins'] text-xs text-[#9abcc5]">
                A second code is required only for this Owner account.
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 font-['Poppins'] text-xs ${totpEnabled ? "bg-[#75bec4]/15 text-[#bce9e9]" : "bg-white/[.07] text-[#9abcc5]"}`}
            >
              {totpEnabled ? "Enabled" : "Not enabled"}
            </span>
          </div>
          {!totpEnabled && !setup && (
            <button
              className="mt-5 rounded-full bg-[#75bec4] px-4 py-2.5 font-['Poppins'] text-sm font-medium text-[#052d45] disabled:opacity-60"
              type="button"
              disabled={busy}
              onClick={startSetup}
            >
              Set up authenticator app
            </button>
          )}
          {setup && (
            <div className="mt-5 grid gap-5 sm:grid-cols-[240px_1fr]">
              <img
                className="w-full max-w-[240px] rounded-xl bg-white p-2"
                src={setup.qrDataUrl}
                alt="Scan this QR code using an authenticator app"
              />
              <div>
                <p className="font-['Poppins'] text-sm text-[#c9e1e5]">
                  Scan the QR code, then enter the current code from your app to
                  finish setup.
                </p>
                <p className="mt-3 break-all font-mono text-xs text-[#8cc7cc]">
                  Manual key: {setup.manualKey}
                </p>
                <form className="mt-4 space-y-3" onSubmit={confirmSetup}>
                  <label className="block font-['Poppins'] text-[10px] font-medium tracking-[0.12em] text-[#9ebfc8]">
                    6-DIGIT CODE
                    <input
                      className={inputClass}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={code}
                      onChange={(event) =>
                        setCode(
                          event.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                    />
                  </label>
                  <button
                    className="rounded-full bg-[#75bec4] px-4 py-2.5 font-['Poppins'] text-sm font-medium text-[#052d45] disabled:opacity-60"
                    disabled={busy}
                    type="submit"
                  >
                    Verify and enable
                  </button>
                  <button className="ml-3 font-['Poppins'] text-xs text-[#8fb7be] hover:text-[#d9ecef]" disabled={busy} type="button" onClick={cancelSetup}>
                    Cancel
                  </button>
                </form>
              </div>
            </div>
          )}
          {false && (
            <form
              className="mt-5 grid gap-3 border-t border-sky-100/10 pt-5 sm:grid-cols-2"
              onSubmit={(event) => event.preventDefault()}
            >
              <p className="sm:col-span-2 font-['Poppins'] text-xs text-[#9abcc5]">
                To disable TOTP, confirm your password and a current
                authenticator code.
              </p>
              <label className="font-['Poppins'] text-[10px] font-medium tracking-[0.12em] text-[#9ebfc8]">
                PASSWORD
                <input
                  className={inputClass}
                  type="password"
                  autoComplete="current-password"
                  value={disableForm.password}
                  onChange={(event) =>
                    setDisableForm((value) => ({
                      ...value,
                      password: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label className="font-['Poppins'] text-[10px] font-medium tracking-[0.12em] text-[#9ebfc8]">
                AUTHENTICATOR CODE
                <input
                  className={inputClass}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={disableForm.code}
                  onChange={(event) =>
                    setDisableForm((value) => ({
                      ...value,
                      code: event.target.value.replace(/\D/g, "").slice(0, 6),
                    }))
                  }
                  required
                />
              </label>
              <button
                className="justify-self-start rounded-full border border-red-200/25 px-4 py-2.5 font-['Poppins'] text-sm text-red-100 disabled:opacity-60"
                disabled={busy}
                type="submit"
              >
                Disable TOTP
              </button>
            </form>
          )}
        </div>
        {recoveryCodes.length > 0 && (
          <section className="mt-6 rounded-2xl border border-amber-200/25 bg-amber-100/[.07] p-5">
            <h2 className="font-['Poppins'] text-base font-medium text-amber-100">
              Save your recovery codes
            </h2>
            <p className="mt-2 font-['Poppins'] text-xs text-amber-50/80">
              Each code works once if you lose your phone. Store them offline;
              they will not be shown again.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {recoveryCodes.map((value) => (
                <code
                  className="rounded-lg bg-black/15 px-3 py-2 text-center text-sm text-amber-50"
                  key={value}
                >
                  {value}
                </code>
              ))}
            </div>
            <button
              className="mt-4 rounded-full border border-amber-100/25 px-4 py-2 text-xs text-amber-50"
              type="button"
              onClick={() => setRecoveryCodes([])}
            >
              I saved these codes
            </button>
          </section>
        )}
        <a
          className="mt-7 inline-block font-['Poppins'] text-sm text-[#8cc7cc] no-underline hover:text-[#d9ecef]"
          href="/owner-dashboard"
        >
          Return to Dashboard
        </a>
      </section>
    </main>
  );
}

export default AccountPage;

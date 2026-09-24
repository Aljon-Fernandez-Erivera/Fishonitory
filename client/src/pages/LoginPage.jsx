import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { API_URL } from "../config.js";
import { useAuth } from "./shared/useAuth.js";
import {
  AuthLayout,
  FriendlyDialog,
  LoadingOverlay,
} from "./shared/AuthLayout.jsx";

const friendly = (message) =>
  message === "Failed to fetch"
    ? "We could not reach Fishonitory. Please check your connection and try again."
    : message || "We could not sign you in. Please try again.";

const inputClass =
  "mt-1.5 box-border w-full rounded-xl border border-sky-100/10 bg-white/[.07] px-3.5 py-3 font-['Poppins'] text-sm text-[#d8f1f1] outline-none transition-all placeholder:text-[#6f96a0] focus:border-[#73c4ca] focus:bg-white/[.1] focus:ring-2 focus:ring-[#73c4ca]/20 disabled:cursor-not-allowed disabled:opacity-50";

const labelClass =
  "block font-['Poppins'] text-[10px] font-semibold tracking-[0.14em] text-[#9ebfc8]";

const linkButtonClass =
  "bg-transparent border-0 p-0 cursor-pointer font-['Poppins'] text-[11px] font-medium text-[#8cc7cc] transition-colors hover:text-[#d9ecef]";

const errorClass = "font-['Poppins'] text-xs text-[#ffb4b4]";

function EyeIcon({ open }) {
  return open ? (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 5.06-6.06M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 8 11 8a20.3 20.3 0 0 1-3.22 4.47" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <path d="M1 1l22 22" />
    </svg>
  );
}

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [lockSeconds, setLockSeconds] = useState(0);
  const [totpChallenge, setTotpChallenge] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [mfaEnrollment, setMfaEnrollment] = useState(null);
  const [resetMode, setResetMode] = useState(false);
  const [resetNotice, setResetNotice] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (!lockSeconds) return undefined;
    const id = window.setInterval(
      () => setLockSeconds((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(id);
  }, [lockSeconds]);

  const setField = ({ target: { name, value } }) => {
    const sanitized =
      name === "email"
        ? value.replace(/[^a-zA-Z0-9@._%+-]/g, "")
        : value.replace(/[^a-zA-Z0-9@#$!]/g, "");
    setFormData((previous) => ({ ...previous, [name]: sanitized }));
    setErrors((previous) => ({ ...previous, [name]: "" }));
  };

  const validate = () => {
    const next = {};
    if (totpChallenge || mfaEnrollment) {
      if (useRecoveryCode) {
        if (!/^[a-fA-F0-9]{10}$/.test(totpCode))
          next.totp = "Enter one of your 10-character recovery codes.";
      } else if (!/^\d{6}$/.test(totpCode)) {
        next.totp = "Enter the current 6-digit authenticator code.";
      }
      setErrors(next);
      return !Object.keys(next).length;
    }
    if (!/^\S+@\S+\.\S+$/.test(formData.email))
      next.email = "Enter a valid email address.";
    if (!formData.password) next.password = "Enter your password.";
    setErrors(next);
    return !Object.keys(next).length;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!validate() || lockSeconds) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}${mfaEnrollment ? "/auth/totp/enroll/confirm" : resetMode ? "/auth/totp/reset/confirm" : totpChallenge ? "/auth/totp/login" : "/auth/login"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(
            mfaEnrollment
              ? { enrollmentToken: mfaEnrollment.token, code: totpCode }
              : resetMode
                ? { challengeToken: totpChallenge, code: totpCode }
                : totpChallenge
                  ? useRecoveryCode
                    ? { challengeToken: totpChallenge, recoveryCode: totpCode }
                    : { challengeToken: totpChallenge, code: totpCode }
                  : formData,
          ),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (["ACCOUNT_LOCKED", "IP_RATE_LIMITED"].includes(data.code))
          setLockSeconds(Number(data.retryAfterSeconds) || 300);
        throw new Error(data.message);
      }
      if (data.totpRequired) {
        setTotpChallenge(data.challengeToken);
        setTotpCode("");
        setErrors({});
        return;
      }
      if (data.mfaEnrollmentRequired) {
        const setupResponse = await fetch(`${API_URL}/auth/totp/enroll/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ enrollmentToken: data.enrollmentToken }),
        });
        const setupData = await setupResponse.json().catch(() => ({}));
        if (!setupResponse.ok)
          throw new Error(setupData.message || "Unable to start MFA setup.");
        const qrDataUrl = await QRCode.toDataURL(setupData.otpauthUri, {
          width: 180,
          margin: 1,
        });
        setMfaEnrollment({
          token: data.enrollmentToken,
          ...setupData,
          qrDataUrl,
        });
        setTotpChallenge("");
        setResetMode(false);
        setResetNotice("");
        setTotpCode("");
        setErrors({});
        return;
      }
      login(data.token, data.user.role);
      const destination =
        data.user.role === "masterStaff"
          ? "/staff-dashboard"
          : data.user.role === "Staff"
            ? "/login"
            : "/owner-dashboard";
      setDialog({
        title:
          data.user.role === "Staff" ? "Attendance recorded" : "Welcome back",
        message:
          data.user.role === "Staff"
            ? "Your attendance has been recorded for today."
            : "You are now signed in.",
        buttonLabel: "Continue",
        destination,
      });
    } catch (error) {
      setDialog({
        title: lockSeconds ? "Login temporarily locked" : "Unable to sign in",
        message: friendly(error.message),
        buttonLabel: "Try again",
      });
    } finally {
      setLoading(false);
    }
  };

  const startAuthenticatorReset = async () => {
    setLoading(true);
    setErrors({});
    try {
      const response = await fetch(`${API_URL}/auth/totp/reset/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ challengeToken: totpChallenge }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.message || "Unable to start authenticator reset.");
      setResetMode(true);
      setUseRecoveryCode(false);
      setTotpCode("");
      setResetNotice(data.message);
    } catch (error) {
      setDialog({
        title: "Unable to reset authenticator",
        message: friendly(error.message),
        buttonLabel: "Try again",
      });
    } finally {
      setLoading(false);
    }
  };

  const subtitle = mfaEnrollment
    ? "Protect your account by connecting an authenticator app."
    : resetMode
      ? "Enter the six-digit reset code sent to your account email."
      : totpChallenge
        ? "Enter the code from your authenticator app."
        : "Sign in to your Fishonitory account";

  const helpText = mfaEnrollment
    ? "Scan the QR code with an authenticator app like Google Authenticator or Authy. If you can't scan, most apps let you type in the setup key manually instead."
    : resetMode
      ? "A reset code was sent to your email. If you don't see it, check your spam folder — it may take a minute to arrive."
      : totpChallenge
        ? "Open your authenticator app to see your current 6-digit code. Lost access to your app? Use a recovery code or reset your authenticator instead."
        : "Enter the email and password you used when registering your business. If you forgot your password, click Forgot Password.";

  return (
    <AuthLayout
      actionLabel="REGISTER BUSINESS"
      actionTo="/register"
      contentWidth="max-w-[460px]"
    >
      {loading && <LoadingOverlay label="Logging in" />}
      <FriendlyDialog
        dialog={dialog}
        onClose={() => {
          const destination = dialog?.destination;
          setDialog(null);
          if (destination) navigate(destination);
        }}
      />

      <section className="box-border w-full rounded-3xl border border-sky-100/15 bg-[#062d48]/90 p-6 shadow-[0_28px_80px_rgba(0,12,31,.3)] backdrop-blur-md sm:p-9">
        <div className="absolute right-3 top-3">
          <button
            type="button"
            aria-label="Help"
            onClick={() => setHelpOpen((value) => !value)}
            className="grid h-6 w-6 place-items-center rounded-full border border-sky-100/15 bg-white/[.06] font-['Poppins'] text-[11px] font-semibold text-[#9ebfc8] transition hover:bg-white/[.12] hover:text-[#d9ecef]"
          >
            ?
          </button>
          {helpOpen && (
            <div className="absolute right-0 top-9 z-10 w-64 rounded-xl border border-sky-100/15 bg-[#062d48] p-4 text-left shadow-2xl">
              <p className="font-['Poppins'] text-xs leading-relaxed text-[#b9d8dd]">
                {helpText}
              </p>
            </div>
          )}
        </div>
        <div className="text-center">
          <h1 className="m-0 font-['Fraunces'] text-3xl font-medium text-[#d9ecef] sm:text-[2.1rem]">
            {mfaEnrollment || totpChallenge || resetMode
              ? "Verify it's you"
              : "Welcome back"}
          </h1>
          <p className="mx-auto mt-2 max-w-[320px] font-['Poppins'] text-xs leading-relaxed text-[#9abcc5]">
            {subtitle}
          </p>
        </div>

        <form className="mt-7 space-y-4" onSubmit={submit} noValidate>
          {!totpChallenge && !mfaEnrollment && (
            <>
              <div>
                <label className={labelClass}>EMAIL ADDRESS</label>
                <input
                  className={inputClass}
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@fishonitory.com"
                  value={formData.email}
                  onChange={setField}
                  disabled={loading || lockSeconds > 0}
                />
                {errors.email && (
                  <p className={`mt-1.5 ${errorClass}`}>{errors.email}</p>
                )}
              </div>

              <div>
                <label className={labelClass}>PASSWORD</label>
                <div className="relative">
                  <input
                    className={`${inputClass} pr-11`}
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={setField}
                    disabled={loading || lockSeconds > 0}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((value) => !value)}
                    disabled={loading || lockSeconds > 0}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 grid h-6 w-6 place-items-center rounded-md bg-transparent border-0 p-0 text-[#9ebfc8] transition-colors hover:text-[#d9ecef] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
                {errors.password && (
                  <p className={`mt-1.5 ${errorClass}`}>{errors.password}</p>
                )}
              </div>

              <div className="flex justify-end">
                <Link className={linkButtonClass} to="/forgot-password">
                  Forgot password?
                </Link>
              </div>
            </>
          )}


          {totpChallenge && !resetMode && !mfaEnrollment && (
            <div className="space-y-3">
              <div>
                <label className={labelClass}>
                  {useRecoveryCode ? "RECOVERY CODE" : "AUTHENTICATOR CODE"}
                </label>
                <input
                  className={`${inputClass} text-center tracking-[0.3em]`}
                  inputMode={useRecoveryCode ? "text" : "numeric"}
                  autoComplete="one-time-code"
                  maxLength={useRecoveryCode ? 10 : 6}
                  placeholder={useRecoveryCode ? "XXXXXXXXXX" : "······"}
                  value={totpCode}
                  onChange={(event) =>
                    setTotpCode(
                      useRecoveryCode
                        ? event.target.value
                            .replace(/[^a-fA-F0-9]/g, "")
                            .toUpperCase()
                        : event.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                  disabled={loading || lockSeconds > 0}
                />
                {errors.totp && (
                  <p className={`mt-1.5 ${errorClass}`}>{errors.totp}</p>
                )}
              </div>

              <div className="flex flex-col items-start gap-2 border-t border-sky-100/[.08] pt-3">
                <button
                  className={linkButtonClass}
                  type="button"
                  onClick={() => {
                    setUseRecoveryCode((value) => !value);
                    setTotpCode("");
                    setErrors({});
                  }}
                >
                  {useRecoveryCode
                    ? "Use authenticator code"
                    : "Use a recovery code"}
                </button>
                <button
                  className={linkButtonClass}
                  type="button"
                  onClick={() => {
                    setTotpChallenge("");
                    setTotpCode("");
                    setErrors({});
                  }}
                >
                  Back to password login
                </button>
                <button
                  className={linkButtonClass}
                  type="button"
                  onClick={startAuthenticatorReset}
                >
                  Reset authenticator
                </button>
              </div>
            </div>
          )}

          {resetMode && (
            <div className="space-y-3">
              {resetNotice && (
                <p className="rounded-xl border border-sky-100/10 bg-white/[.04] p-3 font-['Poppins'] text-xs leading-relaxed text-[#b9d8dd]">
                  {resetNotice}
                </p>
              )}
              <div>
                <label className={labelClass}>EMAIL RESET CODE</label>
                <input
                  className={`${inputClass} text-center tracking-[0.3em]`}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="······"
                  value={totpCode}
                  onChange={(event) =>
                    setTotpCode(
                      event.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                  disabled={loading}
                />
                {errors.totp && (
                  <p className={`mt-1.5 ${errorClass}`}>{errors.totp}</p>
                )}
              </div>
              <div className="border-t border-sky-100/[.08] pt-3">
                <button
                  className={linkButtonClass}
                  type="button"
                  onClick={() => {
                    setResetMode(false);
                    setTotpCode("");
                    setResetNotice("");
                  }}
                >
                  Back to authenticator code
                </button>
              </div>
            </div>
          )}

          {mfaEnrollment && (
            <div className="relative space-y-3">
              <div className="rounded-2xl border border-sky-100/10 bg-white/[.04] p-4 text-center">
                <img
                  src={mfaEnrollment.qrDataUrl}
                  alt="Authenticator setup QR code"
                  className="mx-auto h-36 w-36 rounded-xl bg-white p-1.5"
                />
                <p className="mt-3 font-['Poppins'] text-[11px] leading-relaxed text-[#9abcc5]">
                  Scan with an authenticator app, then enter its current code.
                </p>
              </div>
              <div>
                <label className={labelClass}>AUTHENTICATOR CODE</label>
                <input
                  className={`${inputClass} text-center tracking-[0.3em]`}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="······"
                  value={totpCode}
                  onChange={(event) =>
                    setTotpCode(
                      event.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                  disabled={loading}
                />
                {errors.totp && (
                  <p className={`mt-1.5 ${errorClass}`}>{errors.totp}</p>
                )}
              </div>
            </div>
          )}

          {lockSeconds > 0 && (
            <div className="rounded-xl border border-red-300/20 bg-red-400/10 p-3">
              <p className={errorClass}>
                Please try again in{" "}
                <span className="font-semibold">
                  {String(Math.floor(lockSeconds / 60)).padStart(2, "0")}:
                  {String(lockSeconds % 60).padStart(2, "0")}
                </span>
                .
              </p>
            </div>
          )}

          <button
            className="mt-2 w-full rounded-full bg-[#75bec4] py-3 font-['Poppins'] text-sm font-semibold tracking-wide text-[#052d45] shadow-[0_12px_28px_rgba(77,190,196,.2)] transition hover:bg-[#91d2d5] disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={loading || lockSeconds > 0}
          >
            {mfaEnrollment || totpChallenge ? "VERIFY CODE" : "LOGIN"}
          </button>
        </form>

        {!totpChallenge && !mfaEnrollment && !resetMode && (
          <p className="mt-5 text-center font-['Poppins'] text-[11px] text-[#9abcc5]">
            Don&apos;t have an account?{" "}
            <Link
              className="font-medium text-[#8cc7cc] no-underline hover:text-[#d9ecef]"
              to="/register"
            >
              Register here
            </Link>
          </p>
        )}
      </section>
    </AuthLayout>
  );
}

export default LoginPage;
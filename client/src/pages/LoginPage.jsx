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

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
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
        if (!setupResponse.ok) throw new Error(setupData.message || "Unable to start MFA setup.");
        const qrDataUrl = await QRCode.toDataURL(setupData.otpauthUri, { width: 180, margin: 1 });
        setMfaEnrollment({ token: data.enrollmentToken, ...setupData, qrDataUrl });
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
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ challengeToken: totpChallenge }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Unable to start authenticator reset.");
      setResetMode(true);
      setUseRecoveryCode(false);
      setTotpCode("");
      setResetNotice(data.message);
    } catch (error) {
      setDialog({ title: "Unable to reset authenticator", message: friendly(error.message), buttonLabel: "Try again" });
    } finally { setLoading(false); }
  };
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
      <section className="box-border w-full rounded-2xl border border-sky-100/15 bg-[#062d48]/80 p-5 shadow-[0_24px_70px_rgba(0,12,31,.25)] backdrop-blur-md sm:p-7">
        <h1 className="m-0 text-center font-['Fraunces'] text-3xl text-[#d9ecef] sm:text-[2rem]">
          Login
        </h1>
        <p className="mt-2 text-center font-['Poppins'] text-xs text-[#9abcc5]">
          {mfaEnrollment
            ? "Protect your account by connecting an authenticator app."
            : resetMode
              ? "Enter the six-digit reset code sent to your account email."
            : totpChallenge
            ? "Enter the code from your authenticator app."
            : "Sign in to your Fishonitory account"}
        </p>
        <form className="mt-5 space-y-3" onSubmit={submit} noValidate>
          {!totpChallenge && !mfaEnrollment && <label className="block font-['Poppins'] text-[10px] font-medium tracking-[0.12em] text-[#9ebfc8]">
            EMAIL ADDRESS
            <input
              className="mt-1.5 box-border w-full rounded-xl border border-sky-100/10 bg-white/[.07] px-3.5 py-2.5 font-['Poppins'] text-sm text-[#d8f1f1] outline-none transition placeholder:text-[#7fa5af] focus:border-[#73c4ca] focus:bg-white/[.1]"
              name="email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={setField}
              disabled={loading || lockSeconds > 0}
            />
          </label>}
          {errors.email && (
            <p className="font-['Poppins'] text-xs text-[#ffd1d1]">
              {errors.email}
            </p>
          )}
          {!totpChallenge && !mfaEnrollment && <label className="block font-['Poppins'] text-[10px] font-medium tracking-[0.12em] text-[#9ebfc8]">
            PASSWORD
            <input
              className="mt-1.5 box-border w-full rounded-xl border border-sky-100/10 bg-white/[.07] px-3.5 py-2.5 font-['Poppins'] text-sm text-[#d8f1f1] outline-none transition placeholder:text-[#7fa5af] focus:border-[#73c4ca] focus:bg-white/[.1]"
              name="password"
              type="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={setField}
              disabled={loading || lockSeconds > 0}
            />
          </label>}
          {errors.password && (
            <p className="font-['Poppins'] text-xs text-[#ffd1d1]">
              {errors.password}
            </p>
          )}
          {!totpChallenge && !mfaEnrollment && <div className="text-right">
            <Link
              className="font-['Poppins'] text-[10px] text-[#8cc7cc] no-underline hover:text-[#d9ecef]"
              to="/forgot-password"
            >
              Forgot password?
            </Link>
          </div>}
          {totpChallenge && !resetMode && (
            <>
              <label className="block font-['Poppins'] text-[10px] font-medium tracking-[0.12em] text-[#9ebfc8]">
                {useRecoveryCode ? "RECOVERY CODE" : "AUTHENTICATOR CODE"}
                <input
                  className="mt-1.5 box-border w-full rounded-xl border border-sky-100/10 bg-white/[.07] px-3.5 py-2.5 font-['Poppins'] text-sm text-[#d8f1f1] outline-none transition placeholder:text-[#7fa5af] focus:border-[#73c4ca] focus:bg-white/[.1]"
                  inputMode={useRecoveryCode ? "text" : "numeric"}
                  autoComplete="one-time-code"
                  maxLength={useRecoveryCode ? 10 : 6}
                  value={totpCode}
                  onChange={(event) => setTotpCode(useRecoveryCode ? event.target.value.replace(/[^a-fA-F0-9]/g, "").toUpperCase() : event.target.value.replace(/\D/g, "").slice(0, 6))}
                  disabled={loading || lockSeconds > 0}
                />
              </label>
              {errors.totp && <p className="font-['Poppins'] text-xs text-[#ffd1d1]">{errors.totp}</p>}
              <button className="font-['Poppins'] text-[10px] text-[#8cc7cc] hover:text-[#d9ecef]" type="button" onClick={() => { setUseRecoveryCode((value) => !value); setTotpCode(""); setErrors({}); }}>
                {useRecoveryCode ? "Use authenticator code" : "Use a recovery code"}
              </button>
              <button className="font-['Poppins'] text-[10px] text-[#8cc7cc] hover:text-[#d9ecef]" type="button" onClick={() => { setTotpChallenge(""); setTotpCode(""); setErrors({}); }}>
                Back to password login
              </button>
              <button className="font-['Poppins'] text-[10px] text-[#8cc7cc] hover:text-[#d9ecef]" type="button" onClick={startAuthenticatorReset}>
                Reset authenticator
              </button>
            </>
          )}
          {resetMode && (
            <>
              {resetNotice && <p className="rounded-lg border border-sky-100/10 bg-white/[.04] p-3 font-['Poppins'] text-xs text-[#b9d8dd]">{resetNotice}</p>}
              <label className="block font-['Poppins'] text-[10px] font-medium tracking-[0.12em] text-[#9ebfc8]">EMAIL RESET CODE
                <input className="mt-1.5 box-border w-full rounded-xl border border-sky-100/10 bg-white/[.07] px-3.5 py-2.5 font-['Poppins'] text-sm text-[#d8f1f1] outline-none transition focus:border-[#73c4ca]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={totpCode} onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, "").slice(0, 6))} disabled={loading} />
              </label>
              {errors.totp && <p className="font-['Poppins'] text-xs text-[#ffd1d1]">{errors.totp}</p>}
              <button className="font-['Poppins'] text-[10px] text-[#8cc7cc] hover:text-[#d9ecef]" type="button" onClick={() => { setResetMode(false); setTotpCode(""); setResetNotice(""); }}>Back to authenticator code</button>
            </>
          )}
          {mfaEnrollment && (
            <>
              <div className="rounded-xl border border-sky-100/10 bg-white/[.04] p-3 text-center">
                <img src={mfaEnrollment.qrDataUrl} alt="Authenticator setup QR code" className="mx-auto h-36 w-36 rounded-lg bg-white p-1" />
                <p className="mt-2 font-['Poppins'] text-[10px] text-[#9abcc5]">Scan with an authenticator app, then enter its current code.</p>
              </div>
              <label className="block font-['Poppins'] text-[10px] font-medium tracking-[0.12em] text-[#9ebfc8]">
                AUTHENTICATOR CODE
                <input className="mt-1.5 box-border w-full rounded-xl border border-sky-100/10 bg-white/[.07] px-3.5 py-2.5 font-['Poppins'] text-sm text-[#d8f1f1] outline-none transition focus:border-[#73c4ca]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={totpCode} onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, "").slice(0, 6))} disabled={loading} />
              </label>
              {errors.totp && <p className="font-['Poppins'] text-xs text-[#ffd1d1]">{errors.totp}</p>}
            </>
          )}
          {lockSeconds > 0 && (
            <p className="font-['Poppins'] text-xs text-[#ffd1d1]">
              Please try again in{" "}
              {String(Math.floor(lockSeconds / 60)).padStart(2, "0")}:
              {String(lockSeconds % 60).padStart(2, "0")}.
            </p>
          )}
          <button
            className="w-full rounded-full bg-[#75bec4] py-2.5 font-['Poppins'] text-sm font-medium text-[#052d45] shadow-[0_10px_24px_rgba(77,190,196,.16)] transition hover:bg-[#91d2d5] disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={loading || lockSeconds > 0}
          >
            {mfaEnrollment || totpChallenge ? "VERIFY CODE" : "LOGIN"}
          </button>
        </form>
        <p className="mt-4 text-center font-['Poppins'] text-[10px] text-[#9abcc5]">
          Don&apos;t have an account?{" "}
          <Link
            className="text-[#8cc7cc] no-underline hover:text-[#d9ecef]"
            to="/register"
          >
            Register here
          </Link>
        </p>
      </section>
    </AuthLayout>
  );
}
export default LoginPage;

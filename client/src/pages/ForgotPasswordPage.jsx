import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_URL } from "../config.js";
import { AuthLayout, FriendlyDialog, LoadingOverlay } from "./shared/AuthLayout.jsx";

const emailPattern = /^\S+@\S+\.\S+$/;
function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ email: "", otp: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState(null);
  const change = ({ target: { name, value } }) => {
    const cleaned = name === "email" ? value.replace(/[^a-zA-Z0-9@._%+-]/g, "") : name === "otp" ? value.replace(/\D/g, "").slice(0, 6) : value.replace(/[^a-zA-Z0-9@#$!]/g, "");
    setForm((old) => ({ ...old, [name]: cleaned })); setErrors((old) => ({ ...old, [name]: "" }));
  };
  const requestCode = async (event) => {
    event.preventDefault(); if (!emailPattern.test(form.email)) return setErrors({ email: "Enter a valid email address." });
    setLoading(true); try { const response = await fetch(`${API_URL}/auth/password-reset/request`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.email }) }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.message); setStep(2); setDialog({ title: "Check your email", message: data.message, buttonLabel: "Continue" }); } catch (error) { setDialog({ title: "Unable to send code", message: error.message === "Failed to fetch" ? "We could not reach Fishonitory. Please try again." : error.message || "Please try again later." }); } finally { setLoading(false); }
  };
  const reset = async (event) => {
    event.preventDefault(); const next = {};
    if (form.otp.length !== 6) next.otp = "Enter the 6-digit reset code.";
    if (form.password.length < 8) next.password = "Use at least 8 characters.";
    if (form.password !== form.confirmPassword) next.confirmPassword = "Passwords do not match.";
    if (Object.keys(next).length) return setErrors(next);
    setLoading(true); try { const response = await fetch(`${API_URL}/auth/password-reset/confirm`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.email, otp: form.otp, password: form.password }) }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.message); setDialog({ title: "Password reset", message: data.message, buttonLabel: "Go to login", destination: "/login" }); } catch (error) { setDialog({ title: "Unable to reset password", message: error.message === "Failed to fetch" ? "We could not reach Fishonitory. Please try again." : error.message || "Please try again later." }); } finally { setLoading(false); }
  };
  const input = "mt-1.5 box-border w-full rounded-xl border border-sky-100/10 bg-white/[.07] px-3.5 py-2.5 font-['Poppins'] text-sm text-[#d8f1f1] outline-none transition focus:border-[#73c4ca] focus:bg-white/[.1]";
  return <AuthLayout actionLabel="LOGIN" actionTo="/login">{loading && <LoadingOverlay label={step === 1 ? "Sending reset code" : "Resetting password"} />}<FriendlyDialog dialog={dialog} onClose={() => { const destination = dialog?.destination; setDialog(null); if (destination) navigate(destination); }} /><section className="box-border w-full rounded-2xl border border-sky-100/15 bg-[#062d48]/80 p-5 shadow-[0_24px_70px_rgba(0,12,31,.25)] backdrop-blur-md sm:p-7"><h1 className="m-0 text-center font-['Fraunces'] text-3xl text-[#d9ecef] sm:text-[2rem]">Forgot Password</h1><p className="mt-2 text-center font-['Poppins'] text-xs text-[#9abcc5]">{step === 1 ? "Enter your email to receive a reset code." : "Enter the code and choose a new password."}</p>{step === 1 ? <form className="mt-5 space-y-3" onSubmit={requestCode} noValidate><label className="block font-['Poppins'] text-[10px] font-medium tracking-[0.12em] text-[#9ebfc8]">EMAIL ADDRESS<input className={input} name="email" type="email" autoComplete="email" value={form.email} onChange={change} /></label>{errors.email && <p className="font-['Poppins'] text-xs text-[#ffd1d1]">{errors.email}</p>}<button className="w-full rounded-full bg-[#75bec4] py-2.5 font-['Poppins'] text-sm font-medium text-[#052d45] transition hover:bg-[#91d2d5]" type="submit">SEND RESET CODE</button></form> : <form className="mt-5 space-y-3" onSubmit={reset} noValidate><label className="block font-['Poppins'] text-[10px] font-medium tracking-[0.12em] text-[#9ebfc8]">6-DIGIT RESET CODE<input className={input} name="otp" inputMode="numeric" autoComplete="one-time-code" value={form.otp} onChange={change} /></label>{errors.otp && <p className="font-['Poppins'] text-xs text-[#ffd1d1]">{errors.otp}</p>}<label className="block font-['Poppins'] text-[10px] font-medium tracking-[0.12em] text-[#9ebfc8]">NEW PASSWORD<input className={input} name="password" type="password" autoComplete="new-password" value={form.password} onChange={change} /></label>{errors.password && <p className="font-['Poppins'] text-xs text-[#ffd1d1]">{errors.password}</p>}<label className="block font-['Poppins'] text-[10px] font-medium tracking-[0.12em] text-[#9ebfc8]">CONFIRM PASSWORD<input className={input} name="confirmPassword" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={change} /></label>{errors.confirmPassword && <p className="font-['Poppins'] text-xs text-[#ffd1d1]">{errors.confirmPassword}</p>}<button className="w-full rounded-full bg-[#75bec4] py-2.5 font-['Poppins'] text-sm font-medium text-[#052d45] transition hover:bg-[#91d2d5]" type="submit">RESET PASSWORD</button></form>}<p className="mt-4 text-center font-['Poppins'] text-[10px] text-[#9abcc5]">Remembered it? <Link className="text-[#8cc7cc] no-underline hover:text-[#d9ecef]" to="/login">Login here</Link></p></section></AuthLayout>;
}
export default ForgotPasswordPage;

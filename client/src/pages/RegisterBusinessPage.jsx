import PasswordRequirements from "./shared/passwordRequirements.jsx";
import { useEffect, useState } from "react";
import {
  getCountries,
  getCountryCallingCode,
  isValidPhoneNumber,
} from "libphonenumber-js";
import { API_URL } from "../config.js";
import { LoadingOverlay } from "./shared/AuthLayout.jsx";
import { Link } from "react-router-dom";
import {
  sanitizePhoneDigits,
  maxLocalDigitsForCountry,
  isValidLocalPhoneForCountry,
} from "./shared/phoneUtils.js";
const countryNameFormatter = new Intl.DisplayNames(["en"], { type: "region" });
const countryOptions = getCountries()
  .map((country) => ({
    country,
    name: countryNameFormatter.of(country) || country,
    callingCode: getCountryCallingCode(country),
  }))
  .sort((first, second) => first.name.localeCompare(second.name));

const ALLOWED_PERMIT_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_PERMIT_BYTES = 8 * 1024 * 1024; // matches server/middleware/uploadPermit.js

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

function RegisterBusinessPage() {
  const [formData, setFormData] = useState({
    businessName: "",
    ownerName: "",
    email: "",
    password: "",
    businessAddress: "",
    phoneNumber: "",
    otp: "",
    acceptedTerms: false,
  });

  const [businessPermit, setBusinessPermit] = useState(null);
  const [permitError, setPermitError] = useState("");

  const [step, setStep] = useState(1); // 1 = Details, 2 = OTP Verification
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverMessage, setServerMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [dialogMode, setDialogMode] = useState("otp");
  const [otpSeconds, setOtpSeconds] = useState(0);
  const [countryIso, setCountryIso] = useState("PH");
  const [countryOpen, setCountryOpen] = useState(false);
  const [countryMenuUp, setCountryMenuUp] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  useEffect(() => {
    if (step !== 2 || otpSeconds <= 0) return undefined;
    // Start the countdown timer for OTP expiration once napindot ang continue
    const timer = setTimeout(() => {
      setOtpSeconds((seconds) => Math.max(seconds - 1, 0));
    }, 1000);

    return () => clearTimeout(timer);
  }, [step, otpSeconds]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let sanitizedValue = type === "checkbox" ? checked : value;

    if (type !== "checkbox") {
      switch (name) {
        case "businessName":
        case "ownerName":
          sanitizedValue = value.replace(/[^a-zA-Z0-9\s]/g, "");
          break;
        case "email":
          sanitizedValue = value.replace(/[^a-zA-Z0-9@._%+-]/g, "");
          break;
        case "password":
          sanitizedValue = value.replace(/[^a-zA-Z0-9@#$!]/g, "");
          break;
        case "businessAddress":
          sanitizedValue = value.replace(/[^a-zA-Z0-9\s\-,.#]/g, "");
          break;
        case "phoneNumber":
          sanitizedValue = sanitizePhoneDigits(value).slice(
            0,
            maxLocalDigitsForCountry(countryIso),
          );
          break;
        case "otp":
          sanitizedValue = value.replace(/\D/g, "").slice(0, 6);
          break;
        default:
          break;
      }
    }

    setFormData((prev) => ({ ...prev, [name]: sanitizedValue }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handlePermitChange = (event) => {
    const file = event.target.files?.[0] || null;
    setPermitError("");

    if (!file) {
      setBusinessPermit(null);
      return;
    }
    if (!ALLOWED_PERMIT_TYPES.includes(file.type)) {
      setPermitError("Upload a JPEG, PNG, or PDF file.");
      event.target.value = "";
      setBusinessPermit(null);
      return;
    }
    if (file.size > MAX_PERMIT_BYTES) {
      setPermitError("The file must be 8 MB or smaller.");
      event.target.value = "";
      setBusinessPermit(null);
      return;
    }

    setBusinessPermit(file);
  };

  const validateDetails = () => {
    const newErrors = {};
    const fullPhoneNumber = `+${getCountryCallingCode(countryIso)}${formData.phoneNumber}`;

    if (formData.businessName.length < 3) {
      newErrors.businessName = "Business Name must be at least 3 characters.";
    }
    if (formData.ownerName.length < 2) {
      newErrors.ownerName = "Owner Name must be at least 2 characters.";
    }
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = "Please provide a valid email address.";
    }
    if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters.";
    }
    if (!formData.businessAddress) {
      newErrors.businessAddress = "Business Address is required.";
    }
    if (
      !isValidLocalPhoneForCountry(formData.phoneNumber, countryIso) ||
      fullPhoneNumber.length > 15 ||
      (countryIso !== "PH" &&
        !isValidPhoneNumber(formData.phoneNumber, countryIso))
    ) {
      newErrors.phoneNumber =
        countryIso === "PH"
          ? "Enter a valid 10-digit PH mobile number starting with 9 (e.g. 9171234567)."
          : "Enter a valid phone number using digits only.";
    }
    if (!formData.acceptedTerms) {
      newErrors.acceptedTerms =
        "You must agree to the Terms of Service and Privacy Policy before registering.";
    }
    if (!businessPermit) {
      newErrors.businessPermit =
        "Upload your business permit (or equivalent registration document) to continue.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 1: Send OTP to email
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setServerMessage("");

    if (!validateDetails()) return;

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          phoneNumber: `+${getCountryCallingCode(countryIso)}${formData.phoneNumber}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send OTP.");
      }

      setOtpSeconds(0);
      setDialogMode("otp");
      setDialogMessage(data.message);
    } catch (err) {
      setServerMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const closeOtpDialog = () => {
    setDialogMessage("");
    setOtpSeconds(5 * 60);
    setStep(2);
  };

  // Verify OTP & Create Account — sent as multipart/form-data since the
  // business permit file rides alongside the registration fields.
  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    setServerMessage("");

    if (otpSeconds === 0) {
      setErrors({ otp: "The OTP has expired. Please request a new OTP." });
      return;
    }

    if (formData.otp.length !== 6) {
      setErrors({ otp: "Please enter a valid 6-digit OTP code." });
      return;
    }

    if (!businessPermit) {
      setServerMessage(
        "Your business permit upload was lost — please go back and re-select the file.",
      );
      return;
    }

    setLoading(true);

    try {
      const payload = new FormData();
      payload.append("businessName", formData.businessName);
      payload.append("ownerName", formData.ownerName);
      payload.append("email", formData.email);
      payload.append("password", formData.password);
      payload.append("businessAddress", formData.businessAddress);
      payload.append(
        "phoneNumber",
        `+${getCountryCallingCode(countryIso)}${formData.phoneNumber}`,
      );
      payload.append("otp", formData.otp);
      payload.append("businessPermit", businessPermit);

      const response = await fetch(`${API_URL}/auth/verify-and-register`, {
        method: "POST",
        body: payload,
        // No Content-Type header here — the browser sets the correct
        // multipart boundary automatically when the body is a FormData.
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Verification failed.");
      }

      setDialogMode("success");
      setDialogMessage(
        data.message ||
          "Your business permit has been submitted for review. You'll be able to log in once it's approved.",
      );
    } catch (err) {
      setServerMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="box-border h-screen w-full flex-1 overflow-x-clip overflow-y-auto bg-[radial-gradient(circle_at_88%_22%,#0a5267_0%,#08465d_35%,#053751_68%,#021a31_100%)] px-4 py-4 text-[#c9e1e5] sm:px-7 sm:py-6">
      {loading && (
        <LoadingOverlay
          label={
            step === 1
              ? "Sending verification code"
              : "Submitting your registration"
          }
        />
      )}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <Link
          to="/"
          className="block h-11 w-6 sm:h-14 sm:w-8"
          aria-label="Fishonitory home"
        >
          <img src="/LOGO.svg" alt="Fishonitory" className="h-full w-full" />
        </Link>
        <Link
          to="/login"
          className="no-underline rounded-full border border-sky-100/15 bg-white/[0.06] px-4 py-2 font-['Poppins'] text-xs font-medium text-sky-50 transition hover:bg-white/[0.12] sm:px-5 sm:text-sm"
        >
          LOGIN
        </Link>
      </header>
      <div className="box-border mx-auto my-5 w-full max-w-[600px] rounded-2xl border border-sky-100/15 bg-[#062d48]/80 p-5 shadow-[0_24px_70px_rgba(0,12,31,.25)] backdrop-blur-md sm:my-6 sm:p-7">
        <h1 className="m-0 text-center font-['Fraunces'] text-3xl text-[#d9ecef] sm:text-[2rem]">
          Register Business
        </h1>
        <p className="mt-2 text-center font-['Poppins'] text-xs text-[#9abcc5]">
          Register Your Ornamental Fish Store
        </p>
        <div className="mx-auto mt-5 flex max-w-[260px] items-center gap-3 font-['Poppins'] text-[10px] font-medium tracking-wide">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#75bec4] text-xs text-[#052d45]">
            1
          </span>
          <span className="text-[#c6e0e3]">Account</span>
          <span className="h-px flex-1 bg-sky-100/20" />
          <span
            className={`grid h-8 w-8 place-items-center rounded-full ${step === 2 ? "bg-[#75bec4] text-[#052d45]" : "bg-white/15 text-[#a9cbd2]"}`}
          >
            2
          </span>
          <span className="text-[#a9cbd2]">OTP</span>
        </div>

        {/* OTP Dialog */}
        <dialog
          open={Boolean(dialogMessage)}
          aria-labelledby="otp-dialog-title"
          className="w-full max-w-sm rounded-2xl border border-sky-100/15 bg-[#062d48] p-6 text-center text-[#c9e1e5] shadow-2xl backdrop:bg-[#021a31]/75"
        >
          <h2
            id="otp-dialog-title"
            className="font-['Fraunces'] text-2xl text-[#d9ecef]"
          >
            {dialogMode === "success" ? "Registration submitted" : "OTP Sent"}
          </h2>
          <p className="mt-3 font-['Poppins'] text-sm leading-relaxed text-[#a7c7cf]">
            {dialogMessage}
          </p>
          <button
            className="mt-6 w-full rounded-full bg-[#75bec4] px-4 py-2.5 font-['Poppins'] text-sm font-medium text-[#052d45] transition hover:bg-[#91d2d5]"
            type="button"
            onClick={() =>
              dialogMode === "success"
                ? (window.location.href = "/login")
                : closeOtpDialog()
            }
          >
            {dialogMode === "success" ? "Go to Login" : "Continue"}
          </button>
        </dialog>

        {serverMessage && (
          <p
            className="mt-5 rounded-md border border-[#eaa5a5]/40 bg-[#5b3941]/35 px-3 py-2 font-['Poppins'] text-xs text-[#ffd1d1]"
            role="alert"
          >
            {serverMessage}
          </p>
        )}

        {step === 1 ? (
          /* FILL DETAILS & SEND OTP */
          <form
            className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2"
            onSubmit={handleSendOTP}
            noValidate
          >
            <div>
              <label className="block font-['Poppins'] text-[10px] font-medium tracking-wider text-[#8abcc0]">
                BUSINESS / STORE NAME
              </label>
              <input
                className="mt-1.5 box-border w-full rounded-md border border-transparent bg-white/[.09] px-3 py-2.5 font-['Poppins'] text-sm text-[#d8f1f1] outline-none transition placeholder:text-[#7faab0] focus:border-[#4dccca]"
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleInputChange}
                maxLength={100}
                placeholder="e.g. AquaRealm Fish Shop"
                required
              />
              {errors.businessName && (
                <span className="mt-1 block font-['Poppins'] text-xs text-[#ffd1d1]">
                  {errors.businessName}
                </span>
              )}
            </div>

            <div>
              <label className="block font-['Poppins'] text-[10px] font-medium tracking-wider text-[#8abcc0]">
                OWNER NAME
              </label>
              <input
                className="mt-1.5 box-border w-full rounded-md border border-transparent bg-white/[.09] px-3 py-2.5 font-['Poppins'] text-sm text-[#d8f1f1] outline-none transition placeholder:text-[#7faab0] focus:border-[#4dccca]"
                type="text"
                name="ownerName"
                value={formData.ownerName}
                onChange={handleInputChange}
                placeholder="e.g. Juan Cruz"
                required
              />
              {errors.ownerName && (
                <span className="mt-1 block font-['Poppins'] text-xs text-[#ffd1d1]">
                  {errors.ownerName}
                </span>
              )}
            </div>

            <div>
              <label className="block font-['Poppins'] text-[10px] font-medium tracking-wider text-[#8abcc0]">
                EMAIL ADDRESS
              </label>
              <input
                className="mt-1.5 box-border w-full rounded-md border border-transparent bg-white/[.09] px-3 py-2.5 font-['Poppins'] text-sm text-[#d8f1f1] outline-none transition placeholder:text-[#7faab0] focus:border-[#4dccca]"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="owner@store.com"
                required
              />
              {errors.email && (
                <span className="mt-1 block font-['Poppins'] text-xs text-[#ffd1d1]">
                  {errors.email}
                </span>
              )}
            </div>

            <div>
              <label className="block font-['Poppins'] text-[10px] font-medium tracking-wider text-[#8abcc0]">
                PASSWORD
              </label>
              <div className="relative">
                <input
                  className="mt-1.5 box-border w-full rounded-md border border-transparent bg-white/[.09] px-3 py-2.5 pr-11 font-['Poppins'] text-sm text-[#d8f1f1] outline-none transition placeholder:text-[#7faab0] focus:border-[#4dccca]"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="At least 8 characters"
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((value) => !value)}
                  disabled={loading}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 mt-[3px] -translate-y-1/2 grid h-6 w-6 place-items-center rounded-md bg-transparent border-0 p-0 text-[#9ebfc8] transition-colors hover:text-[#d9ecef] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
              {errors.password && (
                <span className="mt-1 block font-['Poppins'] text-xs text-[#ffd1d1]">
                  {errors.password}
                </span>
              )}
              <PasswordRequirements password={formData.password} />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-['Poppins'] text-[10px] font-medium tracking-wider text-[#8abcc0]">
                BUSINESS ADDRESS
              </label>
              <input
                className="mt-1.5 box-border w-full rounded-md border border-transparent bg-white/[.09] px-3 py-2.5 font-['Poppins'] text-sm text-[#d8f1f1] outline-none transition placeholder:text-[#7faab0] focus:border-[#4dccca]"
                type="text"
                name="businessAddress"
                value={formData.businessAddress}
                onChange={handleInputChange}
                maxLength={255}
                placeholder="e.g. 123 Aqua St., Fishville, PH"
                required
              />
              {errors.businessAddress && (
                <span className="mt-1 block font-['Poppins'] text-xs text-[#ffd1d1]">
                  {errors.businessAddress}
                </span>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block font-['Poppins'] text-[10px] font-medium tracking-wider text-[#8abcc0]">
                PHONE NUMBER
              </label>
              <div className="mt-1.5 flex gap-2">
                <div className="relative min-w-0 max-w-[42%]">
                  <button
                    className="flex w-full items-center justify-between gap-2 rounded-md border border-transparent bg-white/[.09] px-2 py-2.5 font-['Poppins'] text-xs text-[#d8f1f1] outline-none transition hover:bg-white/[.14] focus:border-[#4dccca]"
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={countryOpen}
                    onClick={(event) => {
                      const isOpening = !countryOpen;
                      if (isOpening) {
                        const { bottom, top } =
                          event.currentTarget.getBoundingClientRect();
                        const menuHeight = 230;
                        setCountryMenuUp(
                          window.innerHeight - bottom < menuHeight &&
                            top > menuHeight,
                        );
                        setCountrySearch("");
                      }
                      setCountryOpen(isOpening);
                    }}
                  >
                    <span>
                      {countryIso} (+{getCountryCallingCode(countryIso)})
                    </span>
                    <span aria-hidden="true">⌄</span>
                  </button>
                  {countryOpen && (
                    <div
                      className={`absolute z-50 w-[280px] overflow-hidden rounded-xl border border-[#4dccca]/30 bg-[#073b52] shadow-[0_12px_35px_rgba(0,0,0,0.35)] ${
                        countryMenuUp ? "bottom-full mb-2" : "top-full mt-2"
                      }`}
                    >
                      {/* Search */}
                      <div className="border-b border-white/[.08] bg-[#06364c] p-2.5">
                        <div className="relative">
                          <span
                            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#7faab0]"
                            aria-hidden="true"
                          >
                            ⌕
                          </span>

                          <input
                            className="box-border w-full rounded-lg border border-white/[.08] bg-white/[.07] py-2 pl-8 pr-3 font-['Poppins'] text-xs text-[#d8f1f1] outline-none transition placeholder:text-[#719aa1] focus:border-[#4dccca]/60 focus:bg-white/[.09]"
                            type="search"
                            value={countrySearch}
                            onChange={(event) =>
                              setCountrySearch(event.target.value)
                            }
                            placeholder="Search country..."
                            aria-label="Search country"
                          />
                        </div>
                      </div>

                      {/* Country list */}
                      <ul
                        role="listbox"
                        aria-label="Country code"
                        className="max-h-56 overflow-y-auto p-1.5"
                      >
                        {countryOptions
                          .filter(({ country, name, callingCode }) =>
                            `${name} ${country} ${callingCode}`
                              .toLowerCase()
                              .includes(countrySearch.trim().toLowerCase()),
                          )
                          .map(({ country, name, callingCode }) => {
                            const isSelected = country === countryIso;

                            return (
                              <li
                                key={country}
                                role="option"
                                aria-selected={isSelected}
                              >
                                <button
                                  className={`flex border-0 w-full items-center justify-between rounded-lg px-3 py-2.5 text-left font-['Poppins'] text-xs transition ${
                                    isSelected
                                      ? "bg-[#4dccca]/15 text-[#73d9d5]"
                                      : "text-[#c7e6e8] bg-transparent hover:bg-white/10 hover:text-[#4dccca] hover:font-bold hover:text-lg"
                                  }`}
                                  type="button"
                                  onClick={() => {
                                    setCountryIso(country);
                                    setCountryOpen(false);
                                  }}
                                >
                                  <span className="min-w-0 truncate">
                                    {name}
                                  </span>

                                  <span
                                    className={`ml-3 shrink-0 ${
                                      isSelected
                                        ? "text-[#4dccca]"
                                        : "text-[#c7e6e8]"
                                    }`}
                                  >
                                    +{callingCode}
                                    {isSelected && (
                                      <span className="ml-2">✓</span>
                                    )}
                                  </span>
                                </button>
                              </li>
                            );
                          })}

                        {!countryOptions.some(
                          ({ country, name, callingCode }) =>
                            `${name} ${country} ${callingCode}`
                              .toLowerCase()
                              .includes(countrySearch.trim().toLowerCase()),
                        ) && (
                          <li className="px-3 py-6 text-center font-['Poppins'] text-xs text-[#719aa1]">
                            No country found
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
                <input
                  className="min-w-0 flex-1 rounded-md border border-transparent bg-white/[.09] px-3 py-2.5 font-['Poppins'] text-sm text-[#d8f1f1] outline-none transition placeholder:text-[#7faab0] focus:border-[#4dccca]"
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={14}
                  placeholder="Phone number"
                  required
                />
              </div>
              {errors.phoneNumber && (
                <span className="mt-1 block font-['Poppins'] text-xs text-[#ffd1d1]">
                  {errors.phoneNumber}
                </span>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block font-['Poppins'] text-[10px] font-medium tracking-wider text-[#8abcc0]">
                BUSINESS PERMIT (JPEG, PNG, OR PDF — MAX 8MB)
              </label>
              <p className="mt-1 font-['Poppins'] text-[11px] leading-relaxed text-[#8fb7be]">
                Upload any of the following:
              </p>

              <ol className="ml-4 list-decimal font-['Poppins'] text-[11px] leading-relaxed text-[#8fb7be]">
                <li>DTI/SEC registration</li>
                <li>Mayor's/Business Permit</li>
                <li>or other proof your business is registered to operate.</li>
              </ol>

              <p className="font-['Poppins'] text-[11px] leading-relaxed text-[#8fb7be]">
                Fishonitory will review this before your account is activated.
              </p>
              <label className="mt-1.5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-[#7bc9ce]/40 bg-white/[.05] px-3 py-5 text-center transition hover:border-[#4dccca] hover:bg-white/[.08]">
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={handlePermitChange}
                  className="hidden"
                />
                <span className="font-['Poppins'] text-xs font-medium text-[#bce9e9]">
                  {businessPermit
                    ? businessPermit.name
                    : "Click to choose a file"}
                </span>
                {businessPermit && (
                  <span className="font-['Poppins'] text-[10px] text-[#7faab0]">
                    {(businessPermit.size / (1024 * 1024)).toFixed(2)} MB ·
                    Click to replace
                  </span>
                )}
              </label>
              {permitError && (
                <span className="mt-1 block font-['Poppins'] text-xs text-[#ffd1d1]">
                  {permitError}
                </span>
              )}
              {errors.businessPermit && (
                <span className="mt-1 block font-['Poppins'] text-xs text-[#ffd1d1]">
                  {errors.businessPermit}
                </span>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-start gap-3 rounded-md px-3 py-3 text-left font-['Poppins'] text-xs text-[#dfeef0]">
                <input
                  type="checkbox"
                  name="acceptedTerms"
                  checked={formData.acceptedTerms}
                  onChange={handleInputChange}
                  className="mt-0.5 h-4 w-4 accent-[#4dccca]"
                  required
                />
                <span>
                  By signing up, I agree to Fishonitory's{" "}
                  <span className="text-[#79d7d7]">Terms of Service</span> and{" "}
                  <span className="text-[#79d7d7]">Privacy Policy</span>.
                </span>
              </label>
              {errors.acceptedTerms && (
                <span className="mt-1 block font-['Poppins'] text-xs text-[#ffd1d1]">
                  {errors.acceptedTerms}
                </span>
              )}
            </div>

            <button
              className="w-full rounded-full bg-[#4dccca] border-0 py-2.5 font-['Poppins'] text-sm font-bold text-[#082941] transition hover:bg-[#67d9d5] disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
              type="submit"
              disabled={loading}
            >
              {loading ? "Sending OTP..." : "Continue"}
            </button>
          </form>
        ) : (
          /* ENTER OTP & REGISTER */
          <form
            className="mt-7 space-y-4 bg-blend-overlay blur-lg"
            onSubmit={handleVerifyAndRegister}
            noValidate
          >
            <div>
              <label className="block font-['Poppins'] text-[10px] font-medium tracking-wider text-[#8abcc0]">
                ENTER 6-DIGIT OTP SENT TO {formData.email}
              </label>
              <p className="mt-2 font-['Poppins'] text-xs text-[#a7d2d4]">
                OTP expires in{" "}
                {String(Math.floor(otpSeconds / 60)).padStart(2, "0")}:
                {String(otpSeconds % 60).padStart(2, "0")}
              </p>
              <input
                className="mt-2 box-border w-full rounded-md border border-transparent bg-white/[.09] px-3 py-2.5 font-['Poppins'] text-sm text-[#d8f1f1] outline-none transition placeholder:text-[#7faab0] focus:border-[#4dccca]"
                type="number"
                name="otp"
                value={formData.otp}
                onChange={handleInputChange}
                maxLength={6}
                placeholder="123456"
                required
              />
              {errors.otp && (
                <span className="mt-1 block font-['Poppins'] text-xs text-[#ffd1d1]">
                  {errors.otp}
                </span>
              )}
            </div>

            <div className="rounded-md border border-sky-100/15 bg-white/[.04] px-3 py-2.5 font-['Poppins'] text-xs text-[#a7c7cf]">
              Business permit ready to submit:{" "}
              <span className="font-medium text-[#bce9e9]">
                {businessPermit ? businessPermit.name : "None selected"}
              </span>
            </div>

            <button
              className="w-full rounded-md bg-[#4dccca] py-2.5 font-['Poppins'] text-sm font-normal text-[#082941] transition hover:bg-[#67d9d5] disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={loading || otpSeconds === 0}
            >
              {loading ? "Submitting..." : "Verify OTP & Submit Registration"}
            </button>
            <button
              className="w-full rounded-md border border-[#9ac9cc] py-2.5 font-['Poppins'] text-sm text-[#d1e9e9] transition hover:bg-white/10"
              type="button"
              onClick={() => setStep(1)}
            >
              Back to Details
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default RegisterBusinessPage;

import { Link } from "react-router-dom";
import { useAuth } from "./useAuth.js";

export function BrandLogo() {

  const handleClick = (event) => {
    event.preventDefault();
    if (window.location.pathname === "/") window.location.reload();
    else window.location.assign("/");
  };

  return (
    <a
      href="/"
      onClick={handleClick}
      aria-label="Fishonitory home"
      className="flex shrink-0 items-center gap-2.5 no-underline"
    >
      <img
        src="/LOGO.svg"
        alt=""
        className="block h-9 w-9 shrink-0 object-contain"
      />
      <span className="font-['Sansita'] text-[19px] font-extrabold italic uppercase leading-none tracking-wide text-[#e0f0f3] sm:text-[21px]">
        Fishonitory
      </span>
    </a>
  );
}

export function AuthFooter() {
  const { user } = useAuth();
  const canOpenSupport = ["Owner", "masterStaff"].includes(user?.role);

  return (
    <footer className="relative z-10 mt-auto flex flex-col items-center justify-between gap-2 bg-[#033341] px-5 py-4 font-['Poppins'] text-[11px] text-[#b8d5d9] sm:flex-row sm:px-8 lg:px-12">
      <span>© 2026 Fishonitory. All rights reserved.</span>
      {canOpenSupport && <Link className="text-inherit no-underline transition hover:text-white" to="/help">Help Center</Link>}
    </footer>
  );
}

export function AuthLayout({
  children,
  actionLabel,
  actionTo,
  contentWidth = "max-w-[380px]",
}) {
  return (
    <main className="auth-shell box-border relative isolate flex min-h-dvh w-full flex-1 flex-col overflow-x-clip bg-[#f8f6ef] text-[#18383e]">
      <div aria-hidden="true" className="auth-water-grid pointer-events-none absolute inset-0 z-0" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-32 -z-10 h-72 w-72 rounded-full bg-[#83cbd0]/10 blur-3xl"
      />
      <header className="sticky top-0 z-40 flex min-h-[62px] w-full items-center justify-between gap-4 bg-[#033341] px-5 py-2.5 sm:px-8 lg:px-12">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
          <BrandLogo />
        <Link
          to={actionTo}
          className="no-underline rounded-full border border-[#b8ceca] bg-white/70 px-4 py-2 font-['Poppins'] text-xs font-semibold text-[#174c53] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#73c4ca] sm:px-5 sm:text-sm"
        >
          {actionLabel}
        </Link>
        </div>
      </header>
      <div
        className={`relative z-10 mx-auto flex min-h-0 w-full flex-1 ${contentWidth} items-center justify-center px-4 py-6 sm:px-7 sm:py-8`}
      >
        {children}
      </div>
      <AuthFooter />
    </main>
  );
}

export function LoadingOverlay({ label = "Loading" }) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[radial-gradient(circle_at_88%_22%,#0a5267_0%,#08465d_35%,#053751_68%,#021a31_100%)] p-6"
      role="status"
      aria-live="polite"
    >
      <div className="text-center">
        <img
          src="/LOGO.svg"
          alt=""
          className="mx-auto h-28 w-28 object-contain animate-[pulse_1.3s_ease-in-out_infinite] drop-shadow-[0_0_24px_rgba(115,196,202,.35)]"
        />
        <p className="mt-4 font-['Poppins'] text-base text-[#d2e8ea]">
          {label}. Please wait...
        </p>
      </div>
    </div>
  );
}

export function SystemUnavailable({ onRetry, retrying = false }) {
  return (
    <main
      className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-[radial-gradient(circle_at_88%_18%,#0a5267_0%,#08465d_38%,#021a31_100%)] p-6 text-center"
      role="alert"
      aria-live="assertive"
    >
      <div
        aria-hidden="true"
        className="absolute h-80 w-80 rounded-full border border-sky-100/10 bg-cyan-200/[.04] blur-3xl"
      />
      <section className="relative w-full max-w-md rounded-3xl border border-sky-100/15 bg-[#062d48]/90 p-7 shadow-[0_28px_80px_rgba(0,12,31,.45)] backdrop-blur-md sm:p-9">
        <div className="relative mx-auto grid h-24 w-24 place-items-center">
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full border border-dashed border-[#73c4ca]/45 animate-[spin_12s_linear_infinite]"
          />
          <img
            src="/LOGO.svg"
            alt=""
            className="h-14 w-14 object-contain opacity-75 grayscale-[.35]"
          />
          <span
            aria-hidden="true"
            className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full border border-red-100/20 bg-[#6b3e4c] font-bold text-red-100"
          >
            !
          </span>
        </div>
        <p className="mt-6 font-['Poppins'] text-xs font-semibold uppercase tracking-[.18em] text-[#79c5c9]">
          Temporary connection issue
        </p>
        <h1 className="m-0 mt-3 font-['Fraunces'] text-3xl font-medium text-[#d9ecef]">
          We’ll be right back.
        </h1>
        <p className="mt-4 font-['Poppins'] text-sm leading-relaxed text-[#a8c9d0]">
          Fishonitory can’t reach the system right now. Your saved work is
          safe. Please check your connection and try again in a moment.
        </p>
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="mt-7 w-full rounded-full bg-[#75bec4] px-5 py-3 font-['Poppins'] text-sm font-semibold text-[#052d45] transition hover:bg-[#91d2d5] disabled:cursor-wait disabled:opacity-70"
        >
          {retrying ? "Checking connection…" : "Try again"}
        </button>
        <p className="mt-4 font-['Poppins'] text-xs text-[#719ba8]">
          If this continues, please contact your system administrator.
        </p>
      </section>
    </main>
  );
}

export function FriendlyDialog({ dialog, onClose }) {
  if (!dialog) return null;
  return (
    <div
        className="fixed inset-0 z-40 grid place-items-center bg-[#123a41]/35 p-4 backdrop-blur-md"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="friendly-dialog-title"
        className="w-full max-w-sm rounded-2xl border border-[#d9e5df] bg-[#fffefa] p-6 text-center text-[#18383e] shadow-[0_28px_80px_rgba(0,36,45,.2)]"
      >
        <h2
          id="friendly-dialog-title"
          className="font-['Fraunces'] text-2xl text-[#153c43]"
        >
          {dialog.title}
        </h2>
        <p className="mt-3 font-['Poppins'] text-sm leading-relaxed text-[#62777a]">
          {dialog.message}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-full bg-[#75bec4] px-4 py-2.5 font-['Poppins'] text-sm font-medium text-[#052d45] transition hover:bg-[#91d2d5]"
        >
          {dialog.buttonLabel || "Continue"}
        </button>
      </section>
    </div>
  );
}

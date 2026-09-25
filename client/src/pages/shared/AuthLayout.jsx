import { Link } from "react-router-dom";

export function AuthLayout({
  children,
  actionLabel,
  actionTo,
  contentWidth = "max-w-[380px]",
}) {
  return (
    <main className="box-border relative isolate flex h-screen w-full flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_88%_22%,#0a5267_0%,#08465d_35%,#053751_68%,#021a31_100%)] px-4 py-4 text-[#c9e1e5] sm:px-7 sm:py-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-32 -z-10 h-72 w-72 rounded-full border border-sky-100/10 bg-sky-300/5 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-20 -z-10 h-80 w-80 rounded-full bg-cyan-300/[0.07] blur-3xl"
      />
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
          <Link
            to="/"
            aria-label="Fishonitory home"
            className="block h-11 w-6 shrink-0 sm:h-14 sm:w-8"
          >
            <img
              src="/LOGO.svg"
              alt="Fishonitory"
              className="block h-full w-full"
            />
          </Link>
        <Link
          to={actionTo}
          className="no-underline rounded-full border border-sky-100/15 bg-white/[0.06] px-4 py-2 font-['Poppins'] text-xs font-medium text-sky-50 transition hover:bg-white/[0.12] focus:outline-none focus:ring-2 focus:ring-[#73c4ca] sm:px-5 sm:text-sm"
        >
          {actionLabel}
        </Link>
      </header>
      <div
        className={`mx-auto flex min-h-0 w-full flex-1 ${contentWidth} items-center justify-center py-5 sm:py-6`}
      >
        {children}
      </div>
      <footer className="pt-1 text-center font-['Poppins'] text-xs text-cyan-100/40">
        &copy; 2026 Fishonitory. All rights reserved.
      </footer>
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
          className="mx-auto h-24 w-auto animate-[pulse_1.3s_ease-in-out_infinite] drop-shadow-[0_0_24px_rgba(115,196,202,.35)]"
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
            className="h-14 w-auto opacity-75 grayscale-[.35]"
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
      className="fixed inset-0 z-40 grid place-items-center bg-[#021a31]/70 p-4 backdrop-blur-md"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="friendly-dialog-title"
        className="w-full max-w-sm rounded-2xl border border-sky-100/15 bg-[#062d48]/90 p-6 text-center shadow-[0_28px_80px_rgba(0,12,31,.45)] backdrop-blur-md"
      >
        <h2
          id="friendly-dialog-title"
          className="font-['Fraunces'] text-2xl text-[#d9ecef]"
        >
          {dialog.title}
        </h2>
        <p className="mt-3 font-['Poppins'] text-sm leading-relaxed text-[#a7c7cf]">
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

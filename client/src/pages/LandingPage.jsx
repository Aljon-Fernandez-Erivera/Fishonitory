import { Link } from "react-router-dom";

const features = [
  [
    "Role-Based Workspaces",
    "Owners and staff use one secure login, while role-based access gives each person the workspace and permissions they need.",
  ],
  [
    "Attendance & Staff Access",
    "Record staff check-ins, manage attendance status, and control whether staff accounts can access the business workspace.",
  ],
  [
    "Tank & Livestock Management",
    "Keep tanks, ornamental fish, feed, and livestock records organized in one place for the team to review.",
  ],
  [
    "Inventory & Stock Tracking",
    "Add, update, purchase, and monitor fish and feed stock in real time, with stock reduced automatically when sales are recorded.",
  ],
  [
    "Sales & Revenue Reports",
    "Record transactions, review sales and profit summaries by date, and export sales reports when you need them.",
  ],
  [
    "Built for Multiple Businesses",
    "Every registered owner has a separate, secure business workspace so data and operations remain independent.",
  ],
];

function LandingPage() {
  return (
    <main className="box-border relative isolate h-screen w-full max-w-full flex-1 overflow-x-clip overflow-y-auto bg-[radial-gradient(circle_at_88%_22%,#0a5267_0%,#08465d_35%,#053751_68%,#021a31_100%)] px-4 py-4 text-[#c9e1e5] sm:px-7 sm:py-6 lg:px-10 lg:py-8">
<div aria-hidden="true" className="pointer-events-none absolute -right-24 top-44 -z-10 h-80 w-80 rounded-full border border-sky-100/10 bg-sky-300/5 blur-3xl" />
<div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-20 -z-10 h-96 w-96 rounded-full bg-cyan-300/[0.07] blur-3xl" />

{/* NEW: center light shaft, subtle, mimics sunlight filtering through water */}
<div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[40rem] w-72 -translate-x-1/2 rotate-6 bg-gradient-to-b from-cyan-100/[0.06] via-cyan-100/[0.02] to-transparent blur-2xl" />

{/* NEW: small secondary glow, upper-left, breaks the symmetry */}
<div aria-hidden="true" className="pointer-events-none absolute -left-16 top-8 -z-10 h-64 w-64 rounded-full bg-teal-200/[0.05] blur-3xl" />

      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full min-w-0 max-w-7xl flex-col sm:min-h-[calc(100vh-3rem)]">
        <header className="flex min-w-0 items-center justify-between gap-4">
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
        </header>

        <section
          className="mx-auto flex w-full max-w-4xl flex-col items-center px-1 pb-8 pt-16 text-center sm:pb-10 sm:pt-20 lg:pb-12 lg:pt-24"
          aria-labelledby="landing-heading"
        >
          <h1
            id="landing-heading"
            className="m-0 max-w-4xl font-['Fraunces'] text-[clamp(2.7rem,7vw,6.25rem)] leading-[0.93] tracking-[-0.055em] text-[#e0f0f3]"
          >
            Each <span className="inline-block animate-[landing-word-wave_4.2s_cubic-bezier(0.4,0,0.2,1)_infinite] [will-change:color,transform,text-shadow] motion-reduce:animate-none motion-reduce:text-[#73c4ca]">fish</span>,{" "}
            <span className="inline-block animate-[landing-word-wave_4.2s_cubic-bezier(0.4,0,0.2,1)_infinite] [animation-delay:0.48s] [will-change:color,transform,text-shadow] motion-reduce:animate-none motion-reduce:text-[#73c4ca]">tanks</span>, and{" "}
            <em className="inline-block animate-[landing-word-wave_4.2s_cubic-bezier(0.4,0,0.2,1)_infinite] [animation-delay:0.96s] font-['Fraunces'] italic font-normal [will-change:color,transform,text-shadow] motion-reduce:animate-none motion-reduce:text-[#73c4ca]">sale</em>
            <br />
            in one clear view.
          </h1>
          <p className="mt-6 max-w-2xl font-['Poppins'] text-[clamp(0.98rem,1.8vw,1.15rem)] leading-relaxed text-[#a7c7cf]">
            Fishonitory is dedicated to helping ornamental fish dealers and keepers monitor their business with just one tool.
          </p>
        </section>

        <nav aria-label="Fishonitory actions" className="mx-auto mb-6 flex w-full max-w-6xl flex-col justify-center gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <Link to="/login" className="rounded-full border border-sky-100/20 px-5 py-2.5 text-center font-['Poppins'] text-sm font-medium text-sky-50 no-underline transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#73c4ca]">LOGIN</Link>
          <Link to="/register" className="rounded-full bg-[#75bec4] px-5 py-2.5 text-center font-['Poppins'] text-sm font-semibold text-[#052d45] no-underline shadow-[0_10px_24px_rgba(77,190,196,.16)] transition hover:-translate-y-0.5 hover:bg-[#91d2d5] focus:outline-none focus:ring-2 focus:ring-[#d5eef0] focus:ring-offset-2 focus:ring-offset-[#063047]">Register&nbsp; Business</Link>
        </nav>

        <section id="about" className="box-border mx-auto w-full min-w-0 max-w-6xl scroll-mt-6 rounded-[1.75rem] border border-sky-100/10 bg-[#062d48]/75 p-5 shadow-[0_24px_70px_rgba(0,12,31,.24)] backdrop-blur-md sm:p-8 lg:p-10" aria-labelledby="about-heading">
          <div className="flex min-w-0 flex-col gap-6 border-b border-white/10 pb-7">
            <div className="min-w-0 max-w-3xl">
              <p className="font-['Fraunces'] text-sm font-semibold tracking-[0.15em] text-[#73c4ca]">ABOUT</p>
              <h2 id="about-heading" className="mt-3 font-['Fraunces'] text-[clamp(2rem,4vw,3.45rem)] leading-[1] tracking-[-0.045em] text-[#d9ecef]">Built for the people who keep fish for a living and business monitoring.</h2>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
            {features.map(([title, description]) => (
              <article
                key={title}
                className="group min-w-0 rounded-2xl border border-white/[0.07] bg-white/[0.045] p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-cyan-100/20 hover:bg-white/[0.08] sm:p-6"
              >
                <span aria-hidden="true" className="mb-4 block h-1.5 w-10 rounded-full bg-[#68b8c0] transition-all duration-200 group-hover:w-16" />
                <h3 className="m-0 font-['Poppins'] text-base font-semibold text-[#d7ecee] sm:text-lg">
                  {title}
                </h3>
                <p className="mt-2.5 max-w-[32rem] break-words font-['Poppins'] text-sm font-normal leading-relaxed text-[#98bcc5] sm:text-[0.95rem]">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <footer className="mt-auto py-10 text-center font-['Poppins'] text-xs tracking-wide text-cyan-100/40 sm:py-12 sm:text-sm">
          &copy; 2026 Fishonitory. All rights reserved.
        </footer>
      </div>
    </main>
  );
}

export default LandingPage;

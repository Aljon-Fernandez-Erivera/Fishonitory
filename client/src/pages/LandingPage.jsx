import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const features = [
  ["Role-Based Workspaces", "Owners and staff use one secure login, while role-based access gives each person the workspace and permissions they need."],
  ["Tank & Livestock Management", "Keep tanks, ornamental fish, feed, and livestock records organized in one place for the team to review."],
  ["Sales & Revenue Reports", "Record transactions, review sales and profit summaries by date, and export sales reports when you need them."],
  ["Attendance & Staff Access", "Record staff check-ins, manage attendance status, and control whether staff accounts can access the business workspace."],
  ["Inventory & Stock Tracking", "Add, update, purchase, and monitor fish and feed stock in real time, with stock reduced automatically when sales are recorded."],
  ["Built for Multiple Businesses", "Every registered owner has a separate, secure business workspace so data and operations remain independent."],
];
const heroWords = ["Fish", "Tanks", "Sales"];

function LandingPage() {
  const [activeWord, setActiveWord] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveWord((word) => (word + 1) % 3);
    }, 1500);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="min-h-screen w-full overflow-x-clip bg-[#f8fbfc] text-[#102638]">
      <header className="sticky top-0 z-40 bg-[#033341] text-[#e0f0f3]">
        <div className="mx-auto flex min-h-[62px] max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
          <Link to="/" aria-label="Fishonitory home" className="flex items-center gap-2.5 text-[#e0f0f3] no-underline">
            <img src="/LOGO.svg" alt="" className="h-9 w-9 object-contain" />
            <span className="font-['Sansita'] text-[19px] font-extrabold italic uppercase leading-none tracking-wide sm:text-[21px]">Fishonitory</span>
          </Link>
          <nav aria-label="Main navigation">
            <a className="rounded-full px-3 py-2 font-['Poppins'] text-sm font-medium text-[#c1dfe1] no-underline transition hover:text-white" href="#features">Explore</a>
          </nav>
        </div>
      </header>

      <section className="relative isolate min-h-[680px] overflow-hidden bg-[#033341] text-[#e0f0f3] sm:min-h-[700px] lg:min-h-[570px]" aria-labelledby="landing-heading">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 top-0 h-[440px] w-[440px] rounded-full bg-cyan-300/[.09] blur-[100px]" />
        <div aria-hidden="true" className="pointer-events-none absolute left-[38%] top-[-100px] h-[430px] w-[240px] rotate-12 bg-gradient-to-b from-cyan-100/[.05] to-transparent blur-3xl" />
        <div className="relative z-10 mx-auto grid min-h-[480px] max-w-7xl grid-cols-1 items-center gap-6 px-6 pb-20 pt-12 sm:px-10 sm:pt-16 lg:min-h-[510px] lg:grid-cols-[1fr_.9fr] lg:gap-10 lg:px-12 lg:pb-28">
          <div className="max-w-2xl self-center">
            <h1 id="landing-heading" className="m-0 max-w-[640px] font-['Fraunces'] text-[clamp(2.7rem,6vw,5.4rem)] leading-[.98] tracking-[-.045em] text-[#d8eef0]">
              Each <span key={activeWord} className="landing-hero-word is-active">{heroWords[activeWord]}</span><br />in one clear view.
            </h1>
            <p className="mt-5 max-w-lg font-['Poppins'] text-sm leading-6 text-[#a8c9cf] sm:text-base sm:leading-7">Fishonitory helps ornamental fish dealers and keepers monitor their business with one clear, connected workspace.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/register" className="rounded-full bg-[#75bec4] px-6 py-3 font-['Poppins'] text-sm font-semibold text-[#052d45] no-underline shadow-[0_8px_22px_rgba(65,177,188,.16)] transition hover:-translate-y-0.5 hover:bg-[#91d2d5]">Get Started</Link>
              <Link to="/login" className="rounded-full border border-[#9ac9cc]/65 px-6 py-3 font-['Poppins'] text-sm font-medium text-[#d9ecef] no-underline transition hover:bg-white/10">Login</Link>
            </div>
          </div>
          <div aria-label="Hero image placeholder" className="relative block h-[150px] overflow-hidden rounded-[1.5rem] border border-cyan-100/10 bg-gradient-to-br from-[#73c5cb]/[.12] via-[#0d6270]/[.07] to-transparent sm:h-[210px] sm:rounded-[2rem] lg:h-[350px] lg:translate-y-8 lg:mb-[-2rem] lg:self-end">
            <div aria-hidden="true" className="absolute inset-x-[18%] bottom-[-22%] h-[115%] rounded-t-full bg-cyan-300/[.09] blur-3xl" />
            <div className="absolute inset-5 rounded-[1.6rem] border border-dashed border-cyan-100/15" />
            <span className="absolute bottom-8 right-8 font-['Poppins'] text-xs tracking-wide text-cyan-100/35">Hero image placeholder</span>
          </div>
        </div>
        <svg aria-hidden="true" className="absolute inset-x-0 bottom-0 z-20 h-[70px] w-full sm:h-[90px]" viewBox="0 0 1440 110" preserveAspectRatio="none">
          <path d="M0 43 C120 80 230 83 360 47 C490 11 575 9 720 49 C845 84 965 82 1080 48 C1210 10 1320 15 1440 45 L1440 110 L0 110 Z" fill="#f8fbfc" />
        </svg>
      </section>

      <section id="features" className="mx-auto max-w-7xl scroll-mt-20 bg-[#f8fbfc] px-6 pb-20 pt-10 sm:px-10 sm:pb-24 sm:pt-12 lg:px-12" aria-label="Fishonitory features">
        {features.map(([title, description], index) => {
          const imageFirst = index % 2 === 0;
          return (
            <article key={title} className={`grid items-center gap-7 py-7 sm:gap-10 sm:py-8 lg:min-h-[270px] lg:grid-cols-2 lg:gap-12 ${imageFirst ? "" : ""}`}>
              <div className={`relative aspect-[1.42/1] w-full overflow-hidden rounded-[1.4rem] border border-[#b5dbe0]/40 bg-[#b8dce1] shadow-[0_18px_40px_rgba(22,87,101,.08)] sm:rounded-[1.7rem] ${imageFirst ? "lg:order-1" : "lg:order-2"}`} aria-label={`${title} image placeholder`}>
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-[#68b6c0]/15" />
                <span className="absolute left-3 top-3 rounded-full bg-[#65b7bd] px-2.5 py-1 font-['Poppins'] text-[10px] font-semibold text-white/90">{String(index + 1).padStart(2, "0")}</span>
                <span className="absolute bottom-4 right-4 font-['Poppins'] text-[10px] tracking-wide text-[#327f89]/55">Image placeholder</span>
              </div>
              <div className={`py-1 lg:py-5 ${imageFirst ? "lg:order-2" : "lg:order-1"}`}>
                <h2 className="m-0 font-['Poppins'] text-2xl font-bold leading-tight tracking-[-.035em] text-[#102638] sm:text-3xl">{title}</h2>
                <p className="mt-4 max-w-xl font-['Poppins'] text-sm leading-6 text-[#687d8a]">{description}</p>
                <a href="#about" className="mt-4 inline-flex rounded-full bg-[#e4f5f5] px-4 py-2 font-['Poppins'] text-xs font-semibold text-[#198c9d] no-underline transition hover:bg-[#d2eeee]">Learn More</a>
              </div>
            </article>
          );
        })}
      </section>

      <section id="about" className="bg-[#eaf3f5] px-6 py-16 sm:px-10 sm:py-20">
        <div className="mx-auto max-w-5xl text-center">
          <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[.18em] text-[#168a98]">About Fishonitory</p>
          <h2 className="mx-auto mt-3 max-w-3xl font-['Fraunces'] text-3xl leading-tight tracking-[-.035em] text-[#102638] sm:text-4xl">Built for the people who keep fish for a living and business monitoring.</h2>
          <p className="mx-auto mt-4 max-w-2xl font-['Poppins'] text-sm leading-7 text-[#687d8a]">Keep your team, stock, tanks, and sales organized in one workspace designed for ornamental fish businesses.</p>
        </div>
      </section>

      <footer className="flex flex-col items-center justify-between gap-4 bg-[#033341] px-6 py-7 text-center text-[#b8d5d9] sm:flex-row sm:px-10 sm:text-left lg:px-12">
        <span className="font-['Poppins'] text-xs">© 2026 Fishonitory. All rights reserved.</span>
        <div className="flex gap-5 font-['Poppins'] text-xs"><Link className="text-inherit no-underline hover:text-white" to="/help">Help</Link><Link className="text-inherit no-underline hover:text-white" to="/login">Login</Link><Link className="text-inherit no-underline hover:text-white" to="/register">Register</Link></div>
      </footer>
    </main>
  );
}

export default LandingPage;

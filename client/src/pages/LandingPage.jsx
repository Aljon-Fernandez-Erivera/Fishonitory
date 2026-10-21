import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const IMG = {
  overview: "/images/hero-overview.webp",
  operations: "/images/hero-operations.webp",
  mortality: "/images/mortality-form.webp",
  sales: "/images/staff-sales.webp",
  clock: "/images/staff-time-clock.webp",
  pos: "/images/pos.webp",
};

const features = [
  {
    title: "Role-Based Workspaces",
    description:
      "Owners and staff use one secure login, while role-based access gives each person the workspace and permissions they need.",
    variant: "stack",
    images: [IMG.operations, IMG.clock],
    alts: ["Owner workspace", "Staff workspace"],
  },
  {
    title: "Tank & Livestock Management",
    description:
      "Keep tanks, ornamental fish, feed, and livestock records organized in one place for the team to review.",
    variant: "peek",
    images: [IMG.mortality],
    alts: ["Record mortality form for a koi tank"],
  },
  {
    title: "Sales & Revenue Reports",
    description:
      "Record transactions, review sales and profit summaries by date, and export sales reports when you need them.",
    variant: "peek",
    images: [IMG.overview],
    alts: ["Sales performance overview"],
    position: "object-right-top",
  },
  {
    title: "Attendance & Staff Access",
    description:
      "Record staff check-ins, manage attendance status, and control whether staff accounts can access the business workspace.",
    variant: "peek",
    images: [IMG.clock],
    alts: ["Staff time clock"],
  },
  {
    title: "Inventory & Stock Tracking",
    description:
      "Add, update, purchase, and monitor fish and feed stock in real time, with stock reduced automatically when sales are recorded.",
    variant: "peek",
    images: [IMG.pos],
    alts: ["Point of sale screen"],
    position: "object-left-top",
  },
  {
    title: "Built for Multiple Businesses",
    description:
      "Every registered owner has a separate, secure business workspace so data and operations remain independent.",
    variant: "twin",
    images: [IMG.operations],
    alts: ["Business workspace", "Another business workspace"],
  },
];
const heroWords = ["Fish", "Tanks", "Sales"];

function BrowserWindow({ src, alt, className = "", imgClassName = "" }) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-cyan-100/15 bg-[#072c3c] shadow-[0_30px_70px_rgba(0,0,0,.45)] ${className}`}
    >
      <div className="flex h-5 items-center gap-1.5 bg-[#0a3a4b] px-3">
        <span className="h-2 w-2 rounded-full bg-[#3b6a78]" />
        <span className="h-2 w-2 rounded-full bg-[#3b6a78]" />
        <span className="h-2 w-2 rounded-full bg-[#3b6a78]" />
      </div>
      <img
        src={src}
        alt={alt}
        className={`block w-full object-cover object-left-top ${imgClassName}`}
      />
    </div>
  );
}

function FeatureVisual({ feature }) {
  const { variant, images, alts, position = "object-left-top" } = feature;
  const shadow = "shadow-[0_18px_36px_rgba(3,51,65,.35)]";

  if (variant === "stack") {
    return (
      <>
        <div
          className={`absolute left-[6%] top-[14%] z-[1] w-[62%] overflow-hidden rounded-lg ${shadow}`}
        >
          <img
            src={images[0]}
            alt={alts[0]}
            loading="lazy"
            className="block aspect-[1.5/1] w-full object-cover object-left-top"
          />
        </div>
        <div
          className={`absolute bottom-[10%] right-[6%] z-[2] w-[56%] overflow-hidden rounded-lg ${shadow}`}
        >
          <img
            src={images[1]}
            alt={alts[1]}
            loading="lazy"
            className="block aspect-[1.5/1] w-full object-cover object-left-top"
          />
        </div>
      </>
    );
  }

  if (variant === "twin") {
    return (
      <>
        <div
          className={`absolute left-[10%] top-[16%] h-[68%] w-[40%] overflow-hidden rounded-xl bg-[#04202e] ${shadow}`}
        >
          <img
            src={images[0]}
            alt={alts[0]}
            loading="lazy"
            className="-ml-[3%] -mt-[3%] block w-[330%] max-w-none"
          />
        </div>
        <div
          className={`absolute right-[10%] top-[26%] h-[68%] w-[40%] overflow-hidden rounded-xl bg-[#04202e] ${shadow}`}
        >
          <img
            src={images[0]}
            alt={alts[1]}
            loading="lazy"
            className="-ml-[3%] -mt-[3%] block w-[330%] max-w-none hue-rotate-[25deg]"
          />
        </div>
      </>
    );
  }

  return (
    <div className="absolute -bottom-[10%] left-[8%] right-[8%] top-[14%] overflow-hidden rounded-t-xl shadow-[0_20px_40px_rgba(3,51,65,.35)]">
      <img
        src={images[0]}
        alt={alts[0]}
        loading="lazy"
        className={`h-full w-full object-cover ${position}`}
      />
    </div>
  );
}

function LandingPage() {
  const [activeWord, setActiveWord] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveWord((word) => (word + 1) % 3);
    }, 1500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const updateBackToTopVisibility = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    updateBackToTopVisibility();
    window.addEventListener("scroll", updateBackToTopVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateBackToTopVisibility);
  }, []);

  return (
    <main className="min-h-screen w-full overflow-x-clip bg-[#f8fbfc] text-[#102638]">
      <header className="sticky top-0 z-40 bg-[#033341] text-[#e0f0f3]">
        <div className="mx-auto flex min-h-[62px] max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
          <Link
            to="/"
            aria-label="Fishonitory home"
            className="flex items-center gap-2.5 text-[#e0f0f3] no-underline"
          >
            <img src="/LOGO.svg" alt="" className="h-9 w-9 object-contain" />
            <span className="font-['Sansita'] text-[19px] font-extrabold italic uppercase leading-none tracking-wide sm:text-[21px]">
              Fishonitory
            </span>
          </Link>
          <nav aria-label="Main navigation">
            <a
              className="rounded-full px-3 py-2 font-['Poppins'] text-sm font-medium text-[#c1dfe1] no-underline transition hover:text-white"
              href="#features"
            >
              Explore
            </a>
          </nav>
        </div>
      </header>

      <section
        className="relative isolate min-h-[680px] overflow-hidden bg-[#033341] text-[#e0f0f3] sm:min-h-[700px] lg:min-h-[620px]"
        aria-labelledby="landing-heading"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 top-0 h-[440px] w-[440px] rounded-full bg-cyan-300/[.09] blur-[100px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-[38%] top-[-100px] h-[430px] w-[240px] rotate-12 bg-gradient-to-b from-cyan-100/[.05] to-transparent blur-3xl"
        />
        <div className="relative z-10 mx-auto grid min-h-[480px] max-w-7xl grid-cols-1 items-center gap-6 px-6 pb-20 pt-12 sm:px-10 sm:pt-16 lg:min-h-[540px] lg:grid-cols-[1fr_.9fr] lg:gap-10 lg:px-12 lg:pb-28">
          <div className="max-w-2xl self-center">
            <h1
              id="landing-heading"
              className="m-0 max-w-[640px] font-['Fraunces'] text-[clamp(2.7rem,6vw,5.4rem)] leading-[.98] tracking-[-.045em] text-[#d8eef0]"
            >
              Each{" "}
              <span key={activeWord} className="landing-hero-word is-active">
                {heroWords[activeWord]}
              </span>
              <br />
              in one clear view.
            </h1>
            <p className="mt-5 max-w-lg font-['Poppins'] text-sm leading-6 text-[#a8c9cf] sm:text-base sm:leading-7">
              Fishonitory helps ornamental fish dealers and keepers monitor
              their business with one clear, connected workspace.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/register"
                className="rounded-full bg-[#75bec4] px-6 py-3 font-['Poppins'] text-sm font-semibold text-[#052d45] no-underline shadow-[0_8px_22px_rgba(65,177,188,.16)] transition hover:-translate-y-0.5 hover:bg-[#91d2d5]"
              >
                Get Started
              </Link>
              <Link
                to="/login"
                className="rounded-full border border-[#9ac9cc]/65 px-6 py-3 font-['Poppins'] text-sm font-medium text-[#d9ecef] no-underline transition hover:bg-white/10"
              >
                Login
              </Link>
            </div>
          </div>

          {/* Hero: two overlapping browser windows (same 2 images reused) */}
          <div className="relative h-[240px] sm:h-[320px] lg:h-[400px]">
            <BrowserWindow
              src={IMG.operations}
              alt="Operations and reports screen"
              className="absolute right-0 top-0 w-[82%] rotate-[2.5deg]"
              imgClassName="h-[130px] sm:h-[190px] lg:h-[280px]"
            />
            <BrowserWindow
              src={IMG.overview}
              alt="Owner overview with sales performance"
              className="absolute bottom-0 left-0 w-[86%]"
              imgClassName="h-[140px] sm:h-[200px] lg:h-[290px]"
            />
          </div>
        </div>
        <svg
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 z-20 h-[70px] w-full sm:h-[90px]"
          viewBox="0 0 1440 110"
          preserveAspectRatio="none"
        >
          <path
            d="M0 43 C120 80 230 83 360 47 C490 11 575 9 720 49 C845 84 965 82 1080 48 C1210 10 1320 15 1440 45 L1440 110 L0 110 Z"
            fill="#f8fbfc"
          />
        </svg>
      </section>

      <section
        id="features"
        className="mx-auto max-w-7xl scroll-mt-20 bg-[#f8fbfc] px-6 pb-20 pt-10 sm:px-10 sm:pb-24 sm:pt-12 lg:px-12"
        aria-label="Fishonitory features"
      >
        {features.map((feature, index) => {
          const imageFirst = index % 2 === 0;
          return (
            <article
              key={feature.title}
              className="grid items-center gap-7 py-7 sm:gap-10 sm:py-8 lg:min-h-[270px] lg:grid-cols-2 lg:gap-12"
            >
              <div
                className={`relative aspect-[1.42/1] w-full overflow-hidden rounded-[1.4rem] border border-[#b5dbe0]/40 bg-[#b8dce1] shadow-[0_18px_40px_rgba(22,87,101,.08)] sm:rounded-[1.7rem] ${imageFirst ? "lg:order-1" : "lg:order-2"}`}
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-[#68b6c0]/15"
                />
                <FeatureVisual feature={feature} />
                <span className="absolute left-3 top-3 z-[3] rounded-full bg-[#65b7bd] px-2.5 py-1 font-['Poppins'] text-[10px] font-semibold text-white/90">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <div
                className={`py-1 lg:py-5 ${imageFirst ? "lg:order-2" : "lg:order-1"}`}
              >
                <h2 className="m-0 font-['Poppins'] text-2xl font-bold leading-tight tracking-[-.035em] text-[#102638] sm:text-3xl">
                  {feature.title}
                </h2>
                <p className="mt-4 max-w-xl font-['Poppins'] text-sm leading-6 text-[#687d8a]">
                  {feature.description}
                </p>
                <div
                  className="mt-6 flex items-center gap-3"
                  aria-hidden="true"
                >
                  <svg
                    className="h-4 w-44 text-[#65b7bd] [mask-image:linear-gradient(to_right,black_55%,transparent)]"
                    viewBox="0 0 192 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M2 8c8 0 8-6 16-6s8 12 16 12 8-12 16-12 8 12 16 12 8-12 16-12 8 12 16 12 8-12 16-12 8 6 16 6" />
                  </svg>
                  <span className="h-2 w-2 rounded-full border-2 border-[#65b7bd]/70" />
                  <span className="h-1 w-1 rounded-full bg-[#65b7bd]/50" />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section id="about" className="bg-[#eaf3f5] px-6 py-16 sm:px-10 sm:py-20">
        <div className="mx-auto max-w-5xl text-center">
          <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[.18em] text-[#168a98]">
            About Fishonitory
          </p>
          <h2 className="mx-auto mt-3 max-w-3xl font-['Fraunces'] text-3xl leading-tight tracking-[-.035em] text-[#102638] sm:text-4xl">
            Built for the people who keep fish for a living and business
            monitoring.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl font-['Poppins'] text-sm leading-7 text-[#687d8a]">
            Keep your team, stock, tanks, and sales organized in one workspace
            designed for ornamental fish businesses.
          </p>
        </div>
      </section>

      <footer className="flex flex-col items-center justify-between gap-4 bg-[#033341] px-6 py-7 text-center text-[#b8d5d9] sm:flex-row sm:px-10 sm:text-left lg:px-12">
        <span className="font-['Poppins'] text-xs">
          © 2026 Fishonitory. All rights reserved.
        </span>
        <div className="flex gap-5 font-['Poppins'] text-xs">
          <Link
            className="text-inherit no-underline hover:text-white"
            to="/landing-help"
          >
            Help
          </Link>
          <Link
            className="text-inherit no-underline hover:text-white"
            to="/login"
          >
            Login
          </Link>
          <Link
            className="text-inherit no-underline hover:text-white"
            to="/register"
          >
            Register
          </Link>
        </div>
      </footer>
      {showBackToTop && (
        <button
          type="button"
          aria-label="Back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-5 right-5 z-50 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-[#033341] px-4 py-3 font-['Poppins'] text-xs font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#075064] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#75bec4] sm:bottom-7 sm:right-7"
        >
          <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m18 15-6-6-6 6" />
          </svg>
          Back to top
        </button>
      )}
    </main>
  );
}

export default LandingPage;

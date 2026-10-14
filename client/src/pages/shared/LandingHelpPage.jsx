import { Link } from "react-router-dom";

const topics = [
  {
    number: "01",
    title: "What is Fishonitory?",
    text: "Fishonitory is a workspace for ornamental fish businesses. It brings tank and livestock records, inventory, sales, reports, and staff attendance together.",
  },
  {
    number: "02",
    title: "How do I get started?",
    text: "Choose Get Started to register your business. Verify your email, submit the required business details and permit, then wait for the application review.",
  },
  {
    number: "03",
    title: "How do staff join?",
    text: "Once the owner account is active, the business owner can create staff access. Staff sign in to the workspace with the credentials provided by their business.",
  },
  {
    number: "04",
    title: "Already have an account?",
    text: "Use Login to open your workspace. Owners and staff see tools based on their account role.",
  },
];

function LandingHelpPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_88%_18%,#0a5267_0%,#08465d_38%,#021a31_100%)] px-4 py-10 text-[#d9ecef] sm:px-7">
      <div className="mx-auto max-w-5xl">
        <Link to="/" className="text-sm font-medium text-[#8bd4d5] no-underline hover:text-white">← Fishonitory home</Link>
        <header className="mt-10 max-w-2xl">
          <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[.18em] text-[#73c4ca]">Visitor support</p>
          <h1 className="mt-3 font-['Fraunces'] text-4xl sm:text-5xl">How can we help?</h1>
          <p className="mt-4 font-['Poppins'] text-sm leading-7 text-[#a9c8cf]">Learn about Fishonitory and how to get your business workspace started.</p>
        </header>
        <section className="mt-9 grid gap-4 sm:grid-cols-2" aria-label="Getting started help topics">
          {topics.map((topic) => (
            <article key={topic.number} className="rounded-2xl border border-sky-100/10 bg-[#062d48]/75 p-6 shadow-lg">
              <span className="font-['Poppins'] text-xs font-semibold tracking-widest text-[#73c4ca]">{topic.number}</span>
              <h2 className="mt-3 font-['Fraunces'] text-2xl">{topic.title}</h2>
              <p className="mt-3 font-['Poppins'] text-sm leading-7 text-[#a9c8cf]">{topic.text}</p>
            </article>
          ))}
        </section>
        <footer className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-sky-100/10 bg-white/[.04] p-5">
          <p className="m-0 font-['Poppins'] text-sm text-[#a9c8cf]">Ready to explore Fishonitory?</p>
          <div className="flex gap-3">
            <Link to="/register" className="rounded-full bg-[#75bec4] px-5 py-2.5 font-['Poppins'] text-sm font-semibold text-[#052d45] no-underline">Get Started</Link>
            <Link to="/login" className="rounded-full border border-white/20 px-5 py-2.5 font-['Poppins'] text-sm font-semibold text-[#d9ecef] no-underline">Login</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}

export default LandingHelpPage;

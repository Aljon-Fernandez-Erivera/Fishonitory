import { Link } from "react-router-dom";

const topics = [
  { number: "01", title: "Manage tanks", text: "Set a fish capacity for each tank. The tank table shows current occupancy, and notifications appear when a tank reaches 90% capacity or goes over its limit. Open View more for maintenance details and notes." },
  { number: "02", title: "Track inventory", text: "Assign fish to a tank when adding inventory. Sales, mortality records, and stock adjustments update the quantity shown for each tank." },
  { number: "03", title: "Keep your account secure", text: "After five minutes without activity, Fishonitory asks whether you are still there. Choose Keep login to continue or let the two-minute countdown log you out." },
  { number: "04", title: "Business registration", text: "Verify the email OTP and submit your business permit. Your application is sent for review before the owner account is activated." },
];

function HelpPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_88%_18%,#0a5267_0%,#08465d_38%,#021a31_100%)] px-4 py-10 text-[#d9ecef] sm:px-7">
      <div className="mx-auto max-w-5xl">
        <Link to="/" className="text-sm font-medium text-[#8bd4d5] no-underline hover:text-white">← Fishonitory home</Link>
        <header className="mt-10 max-w-2xl">
          <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[.18em] text-[#73c4ca]">Support</p>
          <h1 className="mt-3 font-['Fraunces'] text-4xl sm:text-5xl">Help Center</h1>
          <p className="mt-4 font-['Poppins'] text-sm leading-7 text-[#a9c8cf]">Quick guidance for managing your Fishonitory workspace.</p>
        </header>
        <section className="mt-9 grid gap-4 sm:grid-cols-2" aria-label="Help topics">
          {topics.map((topic) => <article key={topic.number} className="rounded-2xl border border-sky-100/10 bg-[#062d48]/75 p-6 shadow-lg">
            <span className="font-['Poppins'] text-xs font-semibold tracking-widest text-[#73c4ca]">{topic.number}</span>
            <h2 className="mt-3 font-['Fraunces'] text-2xl">{topic.title}</h2>
            <p className="mt-3 font-['Poppins'] text-sm leading-7 text-[#a9c8cf]">{topic.text}</p>
          </article>)}
        </section>
        <footer className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-sky-100/10 bg-white/[.04] p-5">
          <p className="m-0 font-['Poppins'] text-sm text-[#a9c8cf]">Need to access your workspace?</p>
          <Link to="/login" className="rounded-full bg-[#75bec4] px-5 py-2.5 font-['Poppins'] text-sm font-semibold text-[#052d45] no-underline">Return to Login</Link>
        </footer>
      </div>
    </main>
  );
}

export default HelpPage;

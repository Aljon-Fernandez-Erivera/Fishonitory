function AboutPage() {
  return (
    <main className="mx-auto my-[10vh] w-[min(720px,calc(100%-40px))] rounded-xl border border-slate-200 bg-white p-8 text-slate-600 shadow-sm">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-teal-700">FISHONITORY</p>
      <h1 className="mb-4 text-4xl font-semibold tracking-tight text-slate-950">About Fishonitory</h1>
      <p className="mb-6 leading-7">Fishonitory helps ornamental fish businesses manage livestock, tanks, sales, staff, attendance, purchases, and business records in one workspace.</p>
      <a className="font-semibold text-teal-700 underline underline-offset-4" href="/login">Return to Login</a>
    </main>
  );
}

export default AboutPage;

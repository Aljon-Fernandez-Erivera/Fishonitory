function HelpPage() {
  return (
    <main className="mx-auto my-[10vh] w-[min(720px,calc(100%-40px))] rounded-xl border border-slate-200 bg-white p-8 text-slate-600 shadow-sm">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-teal-700">SUPPORT</p>
      <h1 className="mb-6 text-4xl font-semibold tracking-tight text-slate-950">Help Center</h1>
      <h2 className="mb-2 text-xl font-semibold text-slate-950">Owner</h2>
      <p className="mb-5 leading-7">Use Operations & Reports for purchases, mortality, profit, exports, and audit history.</p>
      <h2 className="mb-2 text-xl font-semibold text-slate-950">Master Staff</h2>
      <p className="mb-5 leading-7">Use the staff workspace to monitor inventory, update tank status, record sales, and leave shift notes.</p>
      <h2 className="mb-2 text-xl font-semibold text-slate-950">Login</h2>
      <p className="mb-6 leading-7">Five failed password attempts lock the account for five minutes. The lock is stored on the server.</p>
      <a className="font-semibold text-teal-700 underline underline-offset-4" href="/login">Return to Login</a>
    </main>
  );
}

export default HelpPage;

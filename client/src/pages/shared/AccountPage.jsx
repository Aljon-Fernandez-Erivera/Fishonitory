import { useAuth } from "./useAuth.js";

function AccountPage() {
  const { user } = useAuth();

  return (
    <main className="mx-auto my-[10vh] w-[min(720px,calc(100%-40px))] rounded-xl border border-slate-200 bg-white p-8 text-slate-600 shadow-sm">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-teal-700">ACCOUNT</p>
      <h1 className="mb-6 text-4xl font-semibold tracking-tight text-slate-950">My Account</h1>
      <dl className="grid gap-3">
        <dt className="font-bold text-slate-950">Name</dt>
        <dd>{user?.ownerName || user?.staffName || "Account user"}</dd>
        <dt className="font-bold text-slate-950">Email</dt>
        <dd>{user?.email || "Not available"}</dd>
        <dt className="font-bold text-slate-950">Role</dt>
        <dd>{user?.role || "Not available"}</dd>
        <dt className="font-bold text-slate-950">Business</dt>
        <dd>{user?.businessName || "Linked business account"}</dd>
      </dl>
      <a className="mt-6 inline-block font-semibold text-teal-700 underline underline-offset-4" href={user?.role === "Owner" ? "/owner-dashboard" : "/staff-dashboard"}>Return to Dashboard</a>
    </main>
  );
}

export default AccountPage;

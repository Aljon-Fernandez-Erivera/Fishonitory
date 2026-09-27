import { useMemo, useState } from "react";

const statusStyles = {
  Active: "bg-emerald-500/15 text-emerald-300",
  Disabled: "bg-red-400/15 text-red-300",
  "Pending Verification": "bg-amber-400/15 text-amber-200",
  Rejected: "bg-red-400/15 text-red-300",
};

function AllAccounts({ accounts, onSetStatus }) {
  const [roleFilter, setRoleFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return accounts.filter((account) => {
      const matchesRole = roleFilter === "all" || account.role === roleFilter;
      const label = (
        account.businessName ||
        account.staffName ||
        account.email ||
        ""
      ).toLowerCase();
      const matchesSearch = !search.trim() || label.includes(search.trim().toLowerCase()) || account.email?.toLowerCase().includes(search.trim().toLowerCase());
      return matchesRole && matchesSearch;
    });
  }, [accounts, roleFilter, search]);

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6">
      <div>
        <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[0.16em] text-[#73c4ca]">
          All Accounts
        </p>
        <p className="mt-3 font-['Poppins'] text-sm text-[#9bbec7]">
          Every Owner and Staff account across the platform.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or email…"
          className="min-h-10 flex-1 rounded-xl border border-sky-100/10 bg-white/[.06] px-3 font-['Poppins'] text-sm text-[#d9ecef] outline-none focus:border-[#73c4ca]"
        />
        <select
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
          className="min-h-10 cursor-pointer rounded-xl border border-sky-100/10 bg-white/[.06] px-3 font-['Poppins'] text-sm text-[#d9ecef] outline-none focus:border-[#73c4ca]"
        >
          <option className="bg-[#062d48]" value="all">All roles</option>
          <option className="bg-[#062d48]" value="Owner">Owner</option>
          <option className="bg-[#062d48]" value="Staff">Staff</option>
          <option className="bg-[#062d48]" value="masterStaff">Master Staff</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-sky-100/10 bg-[#062d48]/80">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse font-['Poppins'] text-sm">
            <thead className="bg-white/[.025] text-left text-xs uppercase tracking-[.1em] text-[#89afb9]">
              <tr>
                <th className="px-5 py-3 font-medium">Name / Business</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Joined</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((account) => (
                <tr className="border-t border-sky-100/[.07] text-[#b7d2d7]" key={account._id}>
                  <td className="px-5 py-4 font-medium text-[#d9ecef]">
                    {account.businessName || account.staffName || "—"}
                  </td>
                  <td className="px-5 py-4">{account.email}</td>
                  <td className="px-5 py-4">
                    {account.role === "masterStaff" ? "Master Staff" : account.role}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs ${statusStyles[account.accountStatus] || "bg-white/10 text-[#aee0e1]"}`}>
                      {account.accountStatus}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-[#789faa]">
                    {new Date(account.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4">
                    {["Pending Verification", "Rejected"].includes(account.accountStatus) ? (
                      <span className="text-xs text-[#5f8790]">Review in Pending tab</span>
                    ) : account.accountStatus === "Disabled" ? (
                      <button
                        type="button"
                        onClick={() => onSetStatus(account._id, "Active", account.businessName || account.staffName || account.email)}
                        className="rounded-full border border-emerald-200/25 bg-white/[.05] px-3 py-1.5 font-['Poppins'] text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/20 cursor-pointer"
                      >
                        Enable
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSetStatus(account._id, "Disabled", account.businessName || account.staffName || account.email)}
                        className="rounded-full border border-red-200/25 bg-white/[.05] px-3 py-1.5 font-['Poppins'] text-xs font-medium text-red-200/80 transition hover:bg-red-500/20 cursor-pointer"
                      >
                        Disable
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <p className="px-5 py-12 text-center font-['Poppins'] text-sm text-[#789faa]">
            No accounts match this filter.
          </p>
        )}
      </div>
    </section>
  );
}

export default AllAccounts;
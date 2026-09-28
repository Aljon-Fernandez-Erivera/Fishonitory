const statusStyles = {
  Active: "bg-emerald-500/15 text-emerald-300",
  Disabled: "bg-red-400/15 text-red-300",
  "Pending Verification": "bg-amber-400/15 text-amber-200",
  Rejected: "bg-red-400/15 text-red-300",
};

// Filtering, searching, and paging all happen on the server now, so this
// component is purely presentational: `accounts` is already the correct
// page of already-filtered results, and the parent owns search/roleFilter.
function AllAccounts({
  accounts = [],
  pagination,
  onPageChange,
  onSetStatus,
  search,
  onSearchChange,
  roleFilter,
  onRoleChange,
}) {
  const currentPage = pagination?.page || 1;
  const totalPages = pagination?.totalPages || 1;
  const total = pagination?.total || 0;

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
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by name or email…"
          className="min-h-10 flex-1 rounded-xl border border-sky-100/10 bg-white/[.06] px-3 font-['Poppins'] text-sm text-[#d9ecef] outline-none focus:border-[#73c4ca]"
        />

        <select
          value={roleFilter}
          onChange={(event) => onRoleChange(event.target.value)}
          className="min-h-10 min-w-[140px] cursor-pointer rounded-xl border border-sky-100/10 bg-white/[.06] px-3 font-['Poppins'] text-sm text-[#d9ecef] outline-none focus:border-[#73c4ca]"
        >
          <option className="bg-[#062d48]" value="all">
            All roles
          </option>

          <option className="bg-[#062d48]" value="Owner">
            Owner
          </option>

          <option className="bg-[#062d48]" value="Staff">
            Staff
          </option>

          <option className="bg-[#062d48]" value="masterStaff">
            Master Staff
          </option>
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
              {accounts.map((account) => (
                <tr
                  className="border-t border-sky-100/[.07] text-[#b7d2d7]"
                  key={account._id}
                >
                  <td className="px-5 py-4 font-medium text-[#d9ecef]">
                    {account.businessName || account.staffName || "—"}
                  </td>

                  <td className="px-5 py-4">{account.email}</td>

                  <td className="px-5 py-4">
                    {account.role === "masterStaff"
                      ? "Master Staff"
                      : account.role}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs ${
                        statusStyles[account.accountStatus] ||
                        "bg-white/10 text-[#aee0e1]"
                      }`}
                    >
                      {account.accountStatus}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-xs text-[#789faa]">
                    {new Date(account.createdAt).toLocaleDateString()}
                  </td>

                  <td className="px-5 py-4">
                    {["Pending Verification", "Rejected"].includes(
                      account.accountStatus,
                    ) ? (
                      <span className="text-xs text-[#5f8790]">
                        Review in Pending tab
                      </span>
                    ) : account.accountStatus === "Disabled" ? (
                      <button
                        type="button"
                        onClick={() =>
                          onSetStatus(
                            account._id,
                            "Active",
                            account.businessName ||
                              account.staffName ||
                              account.email,
                          )
                        }
                        className="cursor-pointer rounded-full border border-emerald-200/25 bg-white/[.05] px-3 py-1.5 font-['Poppins'] text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/20"
                      >
                        Enable
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          onSetStatus(
                            account._id,
                            "Disabled",
                            account.businessName ||
                              account.staffName ||
                              account.email,
                          )
                        }
                        className="cursor-pointer rounded-full border border-red-200/25 bg-white/[.05] px-3 py-1.5 font-['Poppins'] text-xs font-medium text-red-200/80 transition hover:bg-red-500/20"
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

        {!accounts.length && (
          <p className="px-5 py-12 text-center font-['Poppins'] text-sm text-[#789faa]">
            No accounts match this filter.
          </p>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="flex flex-col gap-3 border-t border-sky-100/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-['Poppins'] text-xs text-[#789faa]">
              Page{" "}
              <span className="font-semibold text-[#b7d2d7]">
                {currentPage}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-[#b7d2d7]">{totalPages}</span>{" "}
              · {total} total accounts
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => onPageChange(currentPage - 1)}
                className="cursor-pointer rounded-xl border border-sky-100/10 px-3 py-2 font-['Poppins'] text-xs text-[#b7d2d7] transition hover:bg-sky-100/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <span className="min-w-[70px] text-center font-['Poppins'] text-xs text-[#89afb9]">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                className="cursor-pointer rounded-xl border border-sky-100/10 px-3 py-2 font-['Poppins'] text-xs text-[#b7d2d7] transition hover:bg-sky-100/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default AllAccounts;
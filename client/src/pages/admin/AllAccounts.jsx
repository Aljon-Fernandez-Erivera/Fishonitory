import { Fragment, useState } from "react";

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
  onLoadStaff,
}) {
  // Tree state: which owners are open, and the staff loaded for each.
  const [expanded, setExpanded] = useState({});
  const [staffByOwner, setStaffByOwner] = useState({});
  const [loadingId, setLoadingId] = useState(null);
  const [failedId, setFailedId] = useState(null);
  const [failedReason, setFailedReason] = useState("");

  const loadStaff = async (ownerId) => {
    setLoadingId(ownerId);
    setFailedId(null);
    setFailedReason("");
    try {
      if (typeof onLoadStaff !== "function") {
        throw new Error(
          "onLoadStaff is not connected. Pass onLoadStaff={loadBusinessStaff} to <AllAccounts /> in AdminDashboard.jsx.",
        );
      }
      const staff = await onLoadStaff(ownerId);
      setStaffByOwner((previous) => ({ ...previous, [ownerId]: staff }));
    } catch (error) {
      console.error("Could not load staff for owner", ownerId, error);
      setFailedId(ownerId);
      setFailedReason(error?.message || "");
    } finally {
      setLoadingId(null);
    }
  };

  const toggleOwner = (ownerId) => {
    const open = Boolean(expanded[ownerId]);
    setExpanded((previous) => ({ ...previous, [ownerId]: !open }));
    // Fetch fresh each time it opens so the list is never stale.
    if (!open) loadStaff(ownerId);
  };

  const changeStaffStatus = async (ownerId, member, status) => {
    await onSetStatus(member._id, status, member.staffName || member.email);
    await loadStaff(ownerId); // reflect the change inside the tree
  };

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
          Owners and their businesses. Open an owner to see the staff and master staff accounts under that business. Search or pick a role to find a specific staff account.
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
              {accounts.map((account) => {
                const isOwner = account.role === "Owner";
                const open = Boolean(expanded[account._id]);
                const staff = staffByOwner[account._id] || [];
                const staffCount = account.staffCount ?? 0;
                const label =
                  account.businessName || account.staffName || account.email;

                return (
                  <Fragment key={account._id}>
                    <tr className="border-t border-sky-100/[.07] text-[#b7d2d7]">
                      <td className="px-5 py-4 font-medium text-[#d9ecef]">
                        {isOwner ? (
                          <button
                            type="button"
                            onClick={() => toggleOwner(account._id)}
                            aria-expanded={open}
                            aria-label={`${open ? "Hide" : "Show"} staff of ${label}`}
                            className="flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-left font-['Poppins'] text-sm font-medium text-[#d9ecef]"
                          >
                            <span
                              aria-hidden="true"
                              className={`inline-block text-[#73c4ca] transition-transform ${
                                open ? "rotate-90" : ""
                              }`}
                            >
                              ▸
                            </span>
                            <span>{account.businessName || "—"}</span>
                            <span className="rounded-full bg-white/[.07] px-2 py-0.5 text-[11px] font-normal text-[#a9c8cf]">
                              {staffCount} staff
                            </span>
                          </button>
                        ) : (
                          <div>
                            <p className="m-0">{account.staffName || "—"}</p>
                            {account.ownerId?.businessName && (
                              <p className="m-0 mt-0.5 text-[11px] font-normal text-[#719ba8]">
                                Staff of {account.ownerId.businessName}
                              </p>
                            )}
                          </div>
                        )}
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
                              onSetStatus(account._id, "Active", label)
                            }
                            className="cursor-pointer rounded-full border border-emerald-200/25 bg-white/[.05] px-3 py-1.5 font-['Poppins'] text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/20"
                          >
                            Enable
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              onSetStatus(account._id, "Disabled", label)
                            }
                            className="cursor-pointer rounded-full border border-red-200/25 bg-white/[.05] px-3 py-1.5 font-['Poppins'] text-xs font-medium text-red-200/80 transition hover:bg-red-500/20"
                          >
                            Disable
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Staff of this owner: real table rows, same columns as above */}
                    {isOwner && open && failedId === account._id && (
                      <tr className="border-t border-sky-100/[.05] bg-white/[.025]">
                        <td colSpan={6} className="px-5 py-3 pl-14 text-xs text-[#ffb4b4]">
                          Could not load staff
                          {failedReason ? `: ${failedReason}` : "."} Close and
                          open this owner to try again.
                        </td>
                      </tr>
                    )}

                    {isOwner &&
                      open &&
                      loadingId === account._id &&
                      staff.length === 0 && (
                        <tr className="border-t border-sky-100/[.05] bg-white/[.025]">
                          <td colSpan={6} className="px-5 py-3 pl-14 text-xs text-[#9bbec7]">
                            Loading staff…
                          </td>
                        </tr>
                      )}

                    {isOwner &&
                      open &&
                      loadingId !== account._id &&
                      failedId !== account._id &&
                      staff.length === 0 && (
                        <tr className="border-t border-sky-100/[.05] bg-white/[.025]">
                          <td colSpan={6} className="px-5 py-3 pl-14 text-xs text-[#9bbec7]">
                            This business has no staff accounts yet.
                          </td>
                        </tr>
                      )}

                    {isOwner &&
                      open &&
                      staff.map((member, index) => {
                        const isLast = index === staff.length - 1;
                        return (
                          <tr
                            key={member._id}
                            className="border-t border-sky-100/[.05] bg-white/[.025] text-[#b7d2d7]"
                          >
                            <td className="px-5 py-0">
                              <div className="relative ml-2 py-3 pl-8">
                                {/* tree connector */}
                                <span
                                  aria-hidden="true"
                                  className={`absolute left-0 top-0 w-px bg-[#73c4ca]/35 ${
                                    isLast ? "h-1/2" : "h-full"
                                  }`}
                                />
                                <span
                                  aria-hidden="true"
                                  className="absolute left-0 top-1/2 h-px w-5 bg-[#73c4ca]/35"
                                />
                                <p className="m-0 font-medium text-[#d9ecef]">
                                  {member.staffName || "—"}
                                </p>
                                {member.staffPosition && (
                                  <p className="m-0 mt-0.5 text-[11px] font-normal text-[#719ba8]">
                                    {member.staffPosition}
                                  </p>
                                )}
                              </div>
                            </td>

                            <td className="px-5 py-3">{member.email}</td>

                            <td className="px-5 py-3">
                              {member.role === "masterStaff"
                                ? "Master Staff"
                                : "Staff"}
                            </td>

                            <td className="px-5 py-3">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs ${
                                  statusStyles[member.accountStatus] ||
                                  "bg-white/10 text-[#aee0e1]"
                                }`}
                              >
                                {member.accountStatus}
                              </span>
                            </td>

                            <td className="px-5 py-3 text-xs text-[#789faa]">
                              {member.createdAt
                                ? new Date(member.createdAt).toLocaleDateString()
                                : "—"}
                            </td>

                            <td className="px-5 py-3">
                              {member.accountStatus === "Disabled" ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    changeStaffStatus(
                                      account._id,
                                      member,
                                      "Active",
                                    )
                                  }
                                  className="cursor-pointer rounded-full border border-emerald-200/25 bg-white/[.05] px-3 py-1.5 font-['Poppins'] text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/20"
                                >
                                  Enable
                                </button>
                              ) : member.accountStatus === "Active" ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    changeStaffStatus(
                                      account._id,
                                      member,
                                      "Disabled",
                                    )
                                  }
                                  className="cursor-pointer rounded-full border border-red-200/25 bg-white/[.05] px-3 py-1.5 font-['Poppins'] text-xs font-medium text-red-200/80 transition hover:bg-red-500/20"
                                >
                                  Disable
                                </button>
                              ) : (
                                <span className="text-xs text-[#5f8790]">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </Fragment>
                );
              })}
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
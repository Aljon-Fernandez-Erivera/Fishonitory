import { Fragment, useEffect, useState } from "react";

const statusStyles = {
  Active: "bg-emerald-500/15 text-emerald-300",
  Disabled: "bg-red-400/15 text-red-300",
  "Pending Verification": "bg-amber-400/15 text-amber-200",
  Rejected: "bg-red-400/15 text-red-300",
};

// Small spinning ring shown inside a button while its request is running.
function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

// Filtering, searching, and paging all happen on the server now, so this
// component is purely presentational: `accounts` is already the correct
// page of already-filtered results, and the parent owns search/roleFilter.
function AllAccounts({
  accounts = [],
  pagination,
  onPageChange,
  onSetStatus,
  onRequestDisableOtp,
  search,
  onSearchChange,
  roleFilter,
  onRoleChange,
  statusFilter = "all",
  onStatusChange,
  onLoadStaff,
  onRefresh,
  refreshing = false,
}) {
  // Tree state: which owners are open, and the staff loaded for each.
  const [expanded, setExpanded] = useState({});
  const [staffByOwner, setStaffByOwner] = useState({});
  const [loadingId, setLoadingId] = useState(null);
  const [failedId, setFailedId] = useState(null);
  const [failedReason, setFailedReason] = useState("");
  const [disableTarget, setDisableTarget] = useState(null);
  const [disableReason, setDisableReason] = useState("");
  const [disableOtp, setDisableOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpBusy, setOtpBusy] = useState(false);
  const [disableBusy, setDisableBusy] = useState(false);
  const [disableError, setDisableError] = useState("");
  const [otpExpires, setOtpExpires] = useState(0);
  const [busyId, setBusyId] = useState(null); // account whose Enable request is running

  useEffect(() => {
    if (otpExpires <= 0) return undefined;
    const timer = window.setTimeout(() => setOtpExpires((seconds) => Math.max(seconds - 1, 0)), 1000);
    return () => window.clearTimeout(timer);
  }, [otpExpires]);

  const openDisableDialog = (account, label, ownerId = null) => {
    setDisableTarget({ account, label, ownerId });
    setDisableReason("");
    setDisableOtp("");
    setOtpSent(false);
    setOtpExpires(0);
    setDisableError("");
  };

  const requestDisableOtp = async () => {
    const reason = disableReason.trim();
    if (reason.length < 5 || reason.length > 500) {
      setDisableError("Enter a reason between 5 and 500 characters.");
      return;
    }
    setOtpBusy(true);
    setDisableError("");
    try {
      const sent = await onRequestDisableOtp(disableTarget.account._id, reason);
      if (sent) {
        setOtpSent(true);
        setDisableOtp("");
        setOtpExpires(300);
      } else {
        setDisableError("Could not send the verification code. Check the notification for details and try again.");
      }
    } catch (error) {
      setDisableError(error?.message || "Could not send the verification code. Please try again.");
    } finally {
      setOtpBusy(false);
    }
  };

  const confirmDisable = async (event) => {
    event.preventDefault();
    if (!disableTarget || !otpSent) return;
    setDisableBusy(true);
    setDisableError("");
    const done = await onSetStatus(
      disableTarget.account._id,
      "Disabled",
      disableTarget.label,
      disableReason.trim(),
      disableOtp,
    );
    setDisableBusy(false);
    if (!done) return;
    const ownerId = disableTarget.ownerId;
    setDisableTarget(null);
    if (ownerId) await loadStaff(ownerId);
  };

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

  // Enabling is immediate (no dialog), so the button itself shows progress.
  const enableAccount = async (id, label, ownerId = null) => {
    if (busyId !== null) return;
    setBusyId(id);
    try {
      await onSetStatus(id, "Active", label);
      if (ownerId) await loadStaff(ownerId); // reflect the change inside the tree
    } finally {
      setBusyId(null);
    }
  };

  const changeStaffStatus = async (ownerId, member, status) => {
    if (status === "Disabled") {
      openDisableDialog(member, member.staffName || member.email, ownerId);
      return;
    }
    await enableAccount(member._id, member.staffName || member.email, ownerId);
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
        <button type="button" onClick={onRefresh} disabled={refreshing} aria-label="Refresh accounts" title="Refresh accounts" className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-sky-100/10 bg-white/[.04] px-3 text-[#bce9e9] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70">{refreshing ? <><img src="/LOGO.svg" alt="" className="h-6 w-6 animate-[pulse_1.3s_ease-in-out_infinite]"/><span className="text-xs">Refreshing…</span></> : <span aria-hidden="true">↻</span>}</button>
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
        <select
          value={statusFilter}
          onChange={(event) => onStatusChange(event.target.value)}
          aria-label="Filter accounts by approval status"
          className="min-h-10 min-w-[160px] cursor-pointer rounded-xl border border-sky-100/10 bg-white/[.06] px-3 font-['Poppins'] text-sm text-[#d9ecef] outline-none focus:border-[#73c4ca]"
        >
          <option className="bg-[#062d48]" value="all">All statuses</option>
          <option className="bg-[#062d48]" value="approved">Approved</option>
          <option className="bg-[#062d48]" value="rejected">Rejected</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-sky-100/10 bg-[#062d48]/80">
        <div className="hidden overflow-x-auto lg:block">
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
                          title={account.accountStatusReason ? `Disable reason: ${account.accountStatusReason}` : undefined}
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
                            onClick={() => enableAccount(account._id, label)}
                            disabled={busyId !== null}
                            aria-busy={busyId === account._id}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-emerald-200/25 bg-white/[.05] px-3 py-1.5 font-['Poppins'] text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-white/[.05] disabled:active:scale-100"
                          >
                            {busyId === account._id && <Spinner />}
                            {busyId === account._id ? "Enabling…" : "Enable"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openDisableDialog(account, label)}
                            disabled={busyId !== null}
                            className="cursor-pointer rounded-full border border-red-200/25 bg-white/[.05] px-3 py-1.5 font-['Poppins'] text-xs font-medium text-red-200/80 transition hover:bg-red-500/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-white/[.05] disabled:active:scale-100"
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
                                  disabled={busyId !== null}
                                  aria-busy={busyId === member._id}
                                  className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-emerald-200/25 bg-white/[.05] px-3 py-1.5 font-['Poppins'] text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-white/[.05] disabled:active:scale-100"
                                >
                                  {busyId === member._id && <Spinner />}
                                  {busyId === member._id ? "Enabling…" : "Enable"}
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
                                  disabled={busyId !== null}
                                  className="cursor-pointer rounded-full border border-red-200/25 bg-white/[.05] px-3 py-1.5 font-['Poppins'] text-xs font-medium text-red-200/80 transition hover:bg-red-500/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-white/[.05] disabled:active:scale-100"
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

        <div className="divide-y divide-sky-100/[.08] lg:hidden">
          {accounts.map((account) => {
            const isOwner = account.role === "Owner";
            const open = Boolean(expanded[account._id]);
            const staff = staffByOwner[account._id] || [];
            const staffCount = account.staffCount ?? 0;
            const label = account.businessName || account.staffName || account.email;
            return (
              <article key={account._id} className="space-y-3 p-4 font-['Poppins'] text-xs text-[#b7d2d7]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {isOwner ? (
                      <button type="button" onClick={() => toggleOwner(account._id)} aria-expanded={open} className="block max-w-full break-words border-0 bg-transparent p-0 text-left text-sm font-medium text-[#d9ecef]">
                        {open ? "▾ " : "▸ "}{account.businessName || "—"} <span className="text-xs font-normal text-[#89afb9]">({staffCount} staff)</span>
                      </button>
                    ) : <p className="m-0 break-words text-sm font-medium text-[#d9ecef]">{account.staffName || "—"}</p>}
                    <p className="m-0 mt-1 break-all">{account.email}</p>
                  </div>
                  <span title={account.accountStatusReason ? `Disable reason: ${account.accountStatusReason}` : undefined} className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] ${statusStyles[account.accountStatus] || "bg-white/10 text-[#aee0e1]"}`}>{account.accountStatus}</span>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-sky-100/[.07] pt-2">
                  <span>{account.role === "masterStaff" ? "Master Staff" : account.role} · {account.createdAt ? new Date(account.createdAt).toLocaleDateString("en-PH") : "—"}</span>
                  {!["Pending Verification", "Rejected"].includes(account.accountStatus) && (
                    <button type="button" onClick={() => account.accountStatus === "Disabled" ? enableAccount(account._id, label) : openDisableDialog(account, label)} disabled={busyId !== null} aria-busy={busyId === account._id} className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 ${account.accountStatus === "Disabled" ? "border-emerald-200/25 text-emerald-200" : "border-red-200/25 text-red-200"}`}>
                      {busyId === account._id && <Spinner />}
                      {busyId === account._id ? "Enabling…" : account.accountStatus === "Disabled" ? "Enable" : "Disable"}
                    </button>
                  )}
                </div>
                {isOwner && open && (
                  <div className="space-y-2 border-t border-sky-100/[.07] pt-3">
                    {loadingId === account._id && staff.length === 0 ? <p className="m-0 text-[#9bbec7]">Loading staff…</p> : failedId === account._id ? <p className="m-0 text-red-200">Could not load staff{failedReason ? `: ${failedReason}` : "."}</p> : staff.length ? staff.map((member) => (
                      <div key={member._id} className="rounded-xl bg-white/[.035] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="m-0 break-words font-medium text-[#d9ecef]">{member.staffName || "—"}</p>
                            <p className="m-0 mt-1 break-all">{member.email}</p>
                            <p className="m-0 mt-1 text-[#89afb9]">{member.role === "masterStaff" ? "Master Staff" : "Staff"} · {member.createdAt ? new Date(member.createdAt).toLocaleDateString("en-PH") : "—"}</p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] ${statusStyles[member.accountStatus] || "bg-white/10 text-[#aee0e1]"}`}>{member.accountStatus}</span>
                        </div>
                        {member.accountStatus === "Active" || member.accountStatus === "Disabled" ? <button type="button" onClick={() => changeStaffStatus(account._id, member, member.accountStatus === "Disabled" ? "Active" : "Disabled")} disabled={busyId !== null} aria-busy={busyId === member._id} className="mt-2 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-sky-100/15 px-3 py-2 text-xs text-[#bce9e9] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100">{busyId === member._id && <Spinner />}{busyId === member._id ? "Enabling…" : member.accountStatus === "Disabled" ? "Enable" : "Disable"}</button> : null}
                      </div>
                    )) : <p className="m-0 text-[#9bbec7]">This business has no staff accounts yet.</p>}
                  </div>
                )}
              </article>
            );
          })}
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

      {disableTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !disableBusy && !otpBusy) setDisableTarget(null); }}>
          <form onSubmit={confirmDisable} className="w-full max-w-lg space-y-5 rounded-2xl border border-sky-100/15 bg-[#062d48] p-5 shadow-2xl sm:p-7" role="dialog" aria-modal="true" aria-labelledby="disable-account-title">
            <div>
              <h2 id="disable-account-title" className="m-0 text-lg font-semibold text-[#d9ecef]">Disable {disableTarget.label}?</h2>
              <p className="mb-0 mt-2 text-sm text-[#9bbec7]">A verification code will be sent to the Super Admin email. Disabling a business also ends its staff sessions.</p>
            </div>
            <label className="block text-sm text-[#b7d2d7]">Reason
              <textarea value={disableReason} onChange={(event) => { setDisableReason(event.target.value); setOtpSent(false); setDisableOtp(""); setOtpExpires(0); }} maxLength={500} rows={3} required minLength={5} disabled={disableBusy || otpBusy} className="mt-2 block w-full resize-y rounded-xl border border-sky-100/15 bg-[#031f34] p-3 text-sm text-[#d9ecef] outline-none focus:border-[#73c4ca] disabled:cursor-not-allowed disabled:opacity-60" placeholder="Explain why this account is being disabled." />
            </label>
            {!otpSent ? (
              <button type="button" onClick={requestDisableOtp} disabled={otpBusy || disableReason.trim().length < 5} aria-busy={otpBusy} className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#73c4ca]/40 bg-[#73c4ca]/10 px-4 text-sm font-semibold text-[#bce9e9] transition hover:bg-[#73c4ca]/20 active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#73c4ca]/10 disabled:active:scale-100">{otpBusy && <Spinner />}{otpBusy ? "Sending code…" : "Send verification code"}</button>
            ) : (
              <div className="space-y-3">
                <label className="block text-sm text-[#b7d2d7]">Six digit verification code
                  <input inputMode="numeric" autoComplete="one-time-code" value={disableOtp} onChange={(event) => setDisableOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} maxLength={6} required disabled={disableBusy} className="mt-2 block min-h-11 w-full rounded-xl border border-sky-100/15 bg-[#031f34] px-3 text-sm tracking-[.3em] text-[#d9ecef] outline-none focus:border-[#73c4ca] disabled:cursor-not-allowed disabled:opacity-60" />
                </label>
                <p className="m-0 text-xs text-[#9bbec7]">{otpExpires > 0 ? `Code expires in ${Math.floor(otpExpires / 60)}:${String(otpExpires % 60).padStart(2, "0")}.` : "Code expired. Request a new one."}</p>
                <button type="button" onClick={requestDisableOtp} disabled={otpBusy || disableBusy} aria-busy={otpBusy} className="inline-flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-sm font-semibold text-[#73c4ca] underline underline-offset-2 transition hover:text-[#bce9e9] disabled:cursor-not-allowed disabled:opacity-50">{otpBusy && <Spinner />}{otpBusy ? "Sending…" : "Resend OTP"}</button>
              </div>
            )}
            {disableError && <p role="alert" className="m-0 text-sm text-red-200">{disableError}</p>}
            <div className="flex flex-wrap justify-end gap-3 border-t border-sky-100/10 pt-4">
              <button type="button" onClick={() => setDisableTarget(null)} disabled={disableBusy || otpBusy} className="min-h-10 cursor-pointer rounded-xl border border-sky-100/15 bg-transparent px-4 text-sm text-[#b7d2d7] transition hover:bg-white/5 active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:active:scale-100">Cancel</button>
              <button type="submit" disabled={!otpSent || otpExpires <= 0 || disableOtp.length !== 6 || disableBusy} aria-busy={disableBusy} className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-200/25 bg-red-500/15 px-4 text-sm font-semibold text-red-100 transition hover:bg-red-500/25 active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-red-500/15 disabled:active:scale-100">{disableBusy && <Spinner />}{disableBusy ? "Disabling…" : "Verify and disable"}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

export default AllAccounts;
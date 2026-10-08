import { useState } from "react";

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

function ActiveBusinesses({
  businesses,
  loading,
  error,
  pagination,
  onPageChange,
  search,
  onSearchChange,
  onLoadStaff,
}) {
  const [expandedId, setExpandedId] = useState(null);
  const [staffById, setStaffById] = useState({});
  const [loadingId, setLoadingId] = useState(null);
  const [failedId, setFailedId] = useState(null);

  const toggle = async (businessId) => {
    if (expandedId === businessId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(businessId);
    setFailedId(null);

    // Always fetch fresh when opening so the list is never stale.
    setLoadingId(businessId);
    try {
      const staff = await onLoadStaff(businessId);
      setStaffById((previous) => ({ ...previous, [businessId]: staff }));
    } catch {
      setFailedId(businessId);
    } finally {
      setLoadingId(null);
    }
  };

  const totalPages = pagination?.totalPages || 0;
  const page = pagination?.page || 1;

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-5">
      <div>
        <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[0.16em] text-[#73c4ca]">
          Active Businesses
        </p>

        <p className="mt-3 max-w-2xl font-['Poppins'] text-sm leading-relaxed text-[#9bbec7]">
          Approved businesses on the platform. Open a business to see its
          registered staff. This view is read-only; owners manage their own
          staff.
        </p>
      </div>

      <input
        type="search"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search by business, owner, or email"
        className="box-border w-full max-w-md rounded-xl border border-sky-100/10 bg-white/[.07] px-3.5 py-2.5 font-['Poppins'] text-sm text-[#d8f1f1] outline-none placeholder:text-[#6f96a0] focus:border-[#73c4ca]"
      />

      <div className="grid gap-3">
        {error && (
          <p className="rounded-2xl border border-red-300/20 bg-red-400/10 p-5 font-['Poppins'] text-sm text-[#ffb4b4]">
            Could not load active businesses: {error}
          </p>
        )}

        {!error && loading && businesses.length === 0 && (
          <p className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-5 font-['Poppins'] text-sm text-[#9bbec7]">
            Loading businesses…
          </p>
        )}

        {!error && !loading && businesses.length === 0 && (
          <p className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-5 font-['Poppins'] text-sm text-[#9bbec7]">
            No active businesses found.
          </p>
        )}

        {businesses.map((business) => {
          const open = expandedId === business._id;
          const staff = staffById[business._id] || [];

          return (
            <article
              key={business._id}
              className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80"
            >
              <button
                type="button"
                onClick={() => toggle(business._id)}
                aria-expanded={open}
                className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-3 rounded-2xl border-0 bg-transparent p-5 text-left"
              >
                <div className="min-w-0">
                  <p className="truncate font-['Poppins'] text-sm font-semibold text-[#d9ecef]">
                    {business.businessName}
                  </p>
                  <p className="mt-1 truncate font-['Poppins'] text-xs text-[#719ba8]">
                    {business.ownerName} · {business.email}
                  </p>
                  <p className="mt-1 font-['Poppins'] text-[11px] text-[#5f8794]">
                    Approved {formatDate(business.verifiedAt)}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-white/[.06] px-3 py-1 font-['Poppins'] text-xs text-[#a9c8cf]">
                    {business.staffCount} staff
                  </span>
                  <span className="font-['Poppins'] text-xs text-[#8cc7cc]">
                    {open ? "Hide" : "View staff"}
                  </span>
                </div>
              </button>

              {open && (
                <div className="border-t border-sky-100/10 px-5 pb-5 pt-4">
                  {loadingId === business._id && (
                    <p className="font-['Poppins'] text-xs text-[#9bbec7]">
                      Loading staff…
                    </p>
                  )}

                  {failedId === business._id && (
                    <p className="font-['Poppins'] text-xs text-[#ffb4b4]">
                      Could not load staff. Close and open this business to try
                      again.
                    </p>
                  )}

                  {loadingId !== business._id &&
                    failedId !== business._id &&
                    staff.length === 0 && (
                      <p className="font-['Poppins'] text-xs text-[#9bbec7]">
                        This business has no registered staff yet.
                      </p>
                    )}

                  {staff.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[460px] border-collapse font-['Poppins'] text-xs">
                        <thead>
                          <tr className="text-left text-[#719ba8]">
                            <th className="py-2 pr-4 font-medium">Name</th>
                            <th className="py-2 pr-4 font-medium">Position</th>
                            <th className="py-2 pr-4 font-medium">Email</th>
                            <th className="py-2 pr-4 font-medium">Status</th>
                            <th className="py-2 font-medium">Registered</th>
                          </tr>
                        </thead>
                        <tbody className="text-[#c9e1e5]">
                          {staff.map((member) => (
                            <tr
                              key={member._id}
                              className="border-t border-sky-100/[.06]"
                            >
                              <td className="py-2 pr-4">{member.staffName}</td>
                              <td className="py-2 pr-4">
                                {member.staffPosition}
                              </td>
                              <td className="py-2 pr-4">{member.email}</td>
                              <td className="py-2 pr-4">
                                {member.accountStatus}
                              </td>
                              <td className="py-2">
                                {formatDate(member.createdAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 font-['Poppins'] text-xs text-[#9bbec7]">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="cursor-pointer rounded-lg border border-sky-100/10 bg-white/[.05] px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>

          <span>
            Page {page} of {totalPages}
          </span>

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="cursor-pointer rounded-lg border border-sky-100/10 bg-white/[.05] px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}

export default ActiveBusinesses;
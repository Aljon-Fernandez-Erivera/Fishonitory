import { useState } from "react";
const isPdfUrl = (url = "") => url.toLowerCase().endsWith(".pdf");

function PendingVerifications({
  pending,
  pagination,
  onPageChange,
  onApprove,
  onReject,
}) {
  const currentPage = pagination?.page || 1;
  const totalPages = pagination?.totalPages || 1;
  const total = pagination?.total || 0;
  const [processingId, setProcessingId] = useState(null);

  const handleApprove = async (id, businessName) => {
    if (processingId) return;

    setProcessingId(id);

    try {
      await onApprove(id, businessName);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id, businessName) => {
    if (processingId) return;

    setProcessingId(id);

    try {
      await onReject(id, businessName);
    } finally {
      setProcessingId(null);
    }
  };
  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6">
      <div>
        <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[0.16em] text-[#73c4ca]">
          Pending Verifications
        </p>

        <p className="mt-3 font-['Poppins'] text-sm text-[#9bbec7]">
          Review each business's uploaded permit before approving their account.
        </p>
      </div>

      {!pending.length ? (
        <div className="rounded-2xl border border-dashed border-sky-100/15 bg-[#062d48]/50 px-6 py-12 text-center">
          <p className="font-['Poppins'] text-sm text-[#7dabb5]">
            No businesses are waiting for review right now.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {pending.map((owner) => (
              <article
                key={owner._id}
                className="flex flex-col gap-4 rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-5 shadow-[0_14px_35px_rgba(0,12,31,.14)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="m-0 font-['Fraunces'] text-xl font-medium text-[#d9ecef]">
                      {owner.businessName}
                    </h3>

                    <p className="mt-1 font-['Poppins'] text-xs text-[#9bbec7]">
                      {owner.ownerName} · {owner.email}
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full border border-amber-300/30 bg-amber-400/10 px-2.5 py-1 font-['Poppins'] text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-200">
                    Pending
                  </span>
                </div>

                <div className="grid gap-1.5 font-['Poppins'] text-xs text-[#a9c8cf]">
                  <div>
                    <span className="text-[#6f9ca5]">Phone: </span>
                    {owner.phoneNumber}
                  </div>

                  <div>
                    <span className="text-[#6f9ca5]">Address: </span>
                    {owner.businessAddress}
                  </div>

                  {Number.isFinite(owner.businessLatitude) &&
                    Number.isFinite(owner.businessLongitude) && (
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${owner.businessLatitude}&mlon=${owner.businessLongitude}#map=17/${owner.businessLatitude}/${owner.businessLongitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-[#73c4ca] underline underline-offset-2 hover:text-[#bce9e9]"
                      >
                        View pinned location on OpenStreetMap
                      </a>
                    )}

                  <div>
                    <span className="text-[#6f9ca5]">Submitted: </span>
                    {new Date(owner.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="rounded-xl border border-sky-100/[.08] bg-white/[.03] p-3">
                  {isPdfUrl(owner.businessPermitUrl) ? (
                    <a
                      href={owner.businessPermitUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 rounded-lg border border-sky-100/15 bg-white/[.05] px-3 py-4 font-['Poppins'] text-xs font-medium text-[#bce9e9] transition hover:bg-white/[.1]"
                    >
                      📄 Open uploaded PDF permit
                    </a>
                  ) : (
                    <a
                      href={owner.businessPermitUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        src={owner.businessPermitUrl}
                        alt={`${owner.businessName} business permit`}
                        className="max-h-64 w-full rounded-lg object-contain"
                      />
                    </a>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleApprove(owner._id, owner.businessName)}
                    disabled={processingId === owner._id}
                    className="flex-1 cursor-pointer rounded-full bg-[#75bec4] px-4 py-2.5 font-['Poppins'] text-xs font-semibold text-[#052d45] transition hover:bg-[#91d2d5]"
                  >
                    Approve
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReject(owner._id, owner.businessName)}
                    disabled={processingId === owner._id}
                    className="flex-1 cursor-pointer rounded-full border border-red-300/30 bg-red-400/10 px-4 py-2.5 font-['Poppins'] text-xs font-semibold text-red-200 transition hover:bg-red-400/20"
                  >
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </div>

          {/* Pagination */}
          {total > 0 && (
            <div className="flex flex-col gap-3 border-t border-sky-100/10 px-1 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-['Poppins'] text-xs text-[#789faa]">
                Page{" "}
                <span className="font-semibold text-[#b7d2d7]">
                  {currentPage}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-[#b7d2d7]">
                  {totalPages}
                </span>{" "}
                · {total} pending applications
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => onPageChange(currentPage - 1)}
                  className="rounded-lg border border-sky-100/10 bg-white/[.04] px-3 py-2 font-['Poppins'] text-xs text-[#a8c9d0] transition hover:bg-white/[.08] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <span className="min-w-[60px] text-center font-['Poppins'] text-xs text-[#789faa]">
                  {currentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => onPageChange(currentPage + 1)}
                  className="rounded-lg border border-sky-100/10 bg-white/[.04] px-3 py-2 font-['Poppins'] text-xs text-[#a8c9d0] transition hover:bg-white/[.08] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default PendingVerifications;

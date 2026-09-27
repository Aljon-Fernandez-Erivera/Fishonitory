const isPdfUrl = (url = "") => url.toLowerCase().endsWith(".pdf");

function PendingVerifications({ pending, onApprove, onReject }) {
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
                  <a href={owner.businessPermitUrl} target="_blank" rel="noreferrer">
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
                  onClick={() => onApprove(owner._id, owner.businessName)}
                  className="flex-1 rounded-full bg-[#75bec4] px-4 py-2.5 font-['Poppins'] text-xs font-semibold text-[#052d45] transition hover:bg-[#91d2d5] cursor-pointer"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => onReject(owner._id, owner.businessName)}
                  className="flex-1 rounded-full border border-red-300/30 bg-red-400/10 px-4 py-2.5 font-['Poppins'] text-xs font-semibold text-red-200 transition hover:bg-red-400/20 cursor-pointer"
                >
                  Reject
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default PendingVerifications;
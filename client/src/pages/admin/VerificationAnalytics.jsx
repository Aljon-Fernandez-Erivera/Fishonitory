function VerificationAnalytics({ data }) {
  const analytics = data || {
    approvedCount: 0,
    averageApprovalTimeHours: 0,
    averageApprovalTimeDays: 0,
    fastestApprovalTimeHours: 0,
    slowestApprovalTimeHours: 0,
  };

  const formatTime = (hours) => {
    if (!hours || hours <= 0) return "—";

    if (hours < 24) {
      return `${hours}h`;
    }

    return `${analytics.averageApprovalTimeDays}d`;
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-[#062d48]/80 p-5 shadow-lg">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[0.12em] text-[#73c4ca]">
            Verification Performance
          </p>

          <h2 className="mt-2 font-['Poppins'] text-lg font-semibold text-white">
            Approval Processing Time
          </h2>

          <p className="mt-1 max-w-xl font-['Poppins'] text-xs leading-relaxed text-[#719ba8]">
            Measures the elapsed time between business registration
            and successful verification.
          </p>
        </div>

        <span className="rounded-full bg-white/[.05] px-2.5 py-1 font-['Poppins'] text-[10px] text-[#8fb7be]">
          {analytics.approvedCount} approved records
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Average */}
        <div className="rounded-2xl border border-[#73c4ca]/10 bg-white/[.03] p-4">
          <span className="font-['Poppins'] text-[10px] font-medium uppercase tracking-[0.1em] text-[#719ba8]">
            Average
          </span>

          <strong className="mt-2 block font-['Fraunces'] text-3xl font-medium text-[#d9ecef]">
            {formatTime(
              analytics.averageApprovalTimeHours
            )}
          </strong>

          <p className="mt-1 font-['Poppins'] text-[10px] text-[#638d99]">
            Registration → approval
          </p>
        </div>

        {/* Fastest */}
        <div className="rounded-2xl border border-emerald-300/10 bg-emerald-400/[.04] p-4">
          <span className="font-['Poppins'] text-[10px] font-medium uppercase tracking-[0.1em] text-[#7cae9d]">
            Fastest
          </span>

          <strong className="mt-2 block font-['Fraunces'] text-3xl font-medium text-emerald-200">
            {analytics.fastestApprovalTimeHours > 0
              ? `${analytics.fastestApprovalTimeHours}h`
              : "—"}
          </strong>

          <p className="mt-1 font-['Poppins'] text-[10px] text-[#638d99]">
            Shortest recorded time
          </p>
        </div>

        {/* Slowest */}
        <div className="rounded-2xl border border-amber-300/10 bg-amber-400/[.04] p-4">
          <span className="font-['Poppins'] text-[10px] font-medium uppercase tracking-[0.1em] text-[#a99362]">
            Longest
          </span>

          <strong className="mt-2 block font-['Fraunces'] text-3xl font-medium text-amber-200">
            {analytics.slowestApprovalTimeHours > 0
              ? `${analytics.slowestApprovalTimeHours}h`
              : "—"}
          </strong>

          <p className="mt-1 font-['Poppins'] text-[10px] text-[#638d99]">
            Longest recorded time
          </p>
        </div>
      </div>
    </section>
  );
}

export default VerificationAnalytics;
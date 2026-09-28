import RegistrationAnalytics from "./RegistrationAnalytics";
import VerificationAnalytics from "./VerificationAnalytics";
import DataHealth from "./DataHealth";
import SystemHealth from "./SystemHealth";

function AdminOverview({
  stats,
  pendingCount,
  registrationAnalytics,
  verificationAnalytics,
  dataHealth,
  systemHealth,
}) {
  const s = stats || {
    totalOwners: 0,
    pendingOwners: 0,
    activeOwners: 0,
    rejectedOwners: 0,
    totalStaff: 0,
    disabledAccounts: 0,
    approvalRate: 0,
    rejectionRate: 0,
    activeRate: 0,
    averageStaffPerBusiness: 0,
    businessesThisMonth: 0,
    staffThisMonth: 0,
  };

  const pending = pendingCount ?? s.pendingOwners;

  const cards = [
    {
      label: "Total Businesses",
      value: s.totalOwners,
      note: `+${s.businessesThisMonth} registered this month`,
    },
    {
      label: "Active Businesses",
      value: s.activeOwners,
      note: `${s.activeRate}% of all registered businesses`,
    },
    {
      label: "Pending Review",
      value: pending,
      note: "Awaiting permit approval",
      highlight: pending > 0,
    },
    {
      label: "Total Staff",
      value: s.totalStaff,
      note: `+${s.staffThisMonth} registered this month`,
    },
    {
      label: "Approval Rate",
      value: `${s.approvalRate}%`,
      note: "Of reviewed registrations",
    },
    {
      label: "Avg. Staff / Business",
      value: s.averageStaffPerBusiness,
      note: "Platform-wide average",
    },
  ];

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6">
      {/* Header */}
      <div>
        <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[0.16em] text-[#73c4ca]">
          Platform Overview
        </p>

        <p className="mt-3 max-w-2xl font-['Poppins'] text-sm leading-relaxed text-[#9bbec7]">
          Quantitative overview of registered businesses, account activity,
          verification outcomes, and platform growth.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.label}
            className={`rounded-2xl border p-5 shadow-[0_14px_35px_rgba(0,12,31,.14)] transition ${
              card.highlight
                ? "border-amber-300/30 bg-amber-400/10"
                : "border-sky-100/10 bg-[#062d48]/80 hover:border-[#73c4ca]/20"
            }`}
          >
            <span className="font-['Poppins'] text-xs font-medium uppercase tracking-[0.12em] text-[#91b5bf]">
              {card.label}
            </span>

            <strong
              className={`mt-3 block font-['Fraunces'] text-4xl font-medium ${
                card.highlight ? "text-amber-200" : "text-[#d9ecef]"
              }`}
            >
              {card.value}
            </strong>

            <small className="mt-2 block font-['Poppins'] text-xs text-[#719ba8]">
              {card.note}
            </small>
          </article>
        ))}
      </div>

      <RegistrationAnalytics data={registrationAnalytics || []} />
      <VerificationAnalytics data={verificationAnalytics} />
      <DataHealth data={dataHealth} />
      <SystemHealth data={systemHealth} />

      {/* Verification Summary */}
      <div className="grid gap-3 lg:grid-cols-2">
        <article className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[0.12em] text-[#73c4ca]">
                Verification Outcomes
              </p>

              <p className="mt-2 font-['Poppins'] text-xs text-[#719ba8]">
                Distribution of reviewed business registrations.
              </p>
            </div>

            <span className="rounded-full bg-white/[.05] px-2.5 py-1 font-['Poppins'] text-[10px] text-[#8fb7be]">
              Quantitative
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-300/10 bg-emerald-400/[.06] p-4">
              <span className="font-['Poppins'] text-[10px] uppercase tracking-[0.1em] text-[#7cae9d]">
                Approved
              </span>

              <strong className="mt-2 block font-['Fraunces'] text-2xl text-emerald-200">
                {s.approvalRate}%
              </strong>
            </div>

            <div className="rounded-xl border border-red-300/10 bg-red-400/[.06] p-4">
              <span className="font-['Poppins'] text-[10px] uppercase tracking-[0.1em] text-[#a98989]">
                Rejected
              </span>

              <strong className="mt-2 block font-['Fraunces'] text-2xl text-red-200">
                {s.rejectionRate}%
              </strong>
            </div>
          </div>
        </article>

        {/* Business Status */}
        <article className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-5">
          <div>
            <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[0.12em] text-[#73c4ca]">
              Business Status
            </p>

            <p className="mt-2 font-['Poppins'] text-xs text-[#719ba8]">
              Current distribution of registered businesses.
            </p>
          </div>

          <div className="mt-5 space-y-4">
            {/* Active */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="font-['Poppins'] text-xs text-[#a9c8cf]">
                  Active
                </span>

                <span className="font-['Poppins'] text-xs font-medium text-[#d9ecef]">
                  {s.activeOwners} ({s.activeRate}%)
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-white/[.06]">
                <div
                  className="h-full rounded-full bg-[#73c4ca] transition-all"
                  style={{
                    width: `${Math.min(s.activeRate, 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Pending */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="font-['Poppins'] text-xs text-[#a9c8cf]">
                  Pending
                </span>

                <span className="font-['Poppins'] text-xs font-medium text-[#d9ecef]">
                  {pending}
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-white/[.06]">
                <div
                  className="h-full rounded-full bg-amber-300 transition-all"
                  style={{
                    width: `${
                      s.totalOwners > 0
                        ? Math.min((pending / s.totalOwners) * 100, 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Rejected */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="font-['Poppins'] text-xs text-[#a9c8cf]">
                  Rejected
                </span>

                <span className="font-['Poppins'] text-xs font-medium text-[#d9ecef]">
                  {s.rejectedOwners}
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-white/[.06]">
                <div
                  className="h-full rounded-full bg-red-300/80 transition-all"
                  style={{
                    width: `${
                      s.totalOwners > 0
                        ? Math.min(
                            (s.rejectedOwners / s.totalOwners) * 100,
                            100,
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

export default AdminOverview;

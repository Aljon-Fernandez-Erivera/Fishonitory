import RegistrationAnalytics from "./RegistrationAnalytics";
import VerificationAnalytics from "./VerificationAnalytics";
import DataHealth from "./DataHealth";
import SystemHealth from "./SystemHealth";

const DAY_MS = 24 * 60 * 60 * 1000;

function waitingLabel(createdAt) {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / DAY_MS);
  if (!Number.isFinite(days) || days < 1) return "Waiting since today";
  return `Waiting ${days} day${days === 1 ? "" : "s"}`;
}

function StatCard({ label, value, note, highlight, onClick }) {
  const classes = `rounded-2xl border p-5 text-left shadow-[0_14px_35px_rgba(0,12,31,.14)] transition ${
    highlight
      ? "border-amber-300/30 bg-amber-400/10"
      : "border-sky-100/10 bg-[#062d48]/80 hover:border-[#73c4ca]/20"
  } ${onClick ? "cursor-pointer hover:border-[#73c4ca]/40" : ""}`;

  const content = (
    <>
      <span className="font-['Poppins'] text-xs font-medium uppercase tracking-[0.12em] text-[#91b5bf]">
        {label}
      </span>

      <strong
        className={`mt-3 block font-['Fraunces'] text-4xl font-medium ${
          highlight ? "text-amber-200" : "text-[#d9ecef]"
        }`}
      >
        {value}
      </strong>

      <small className="mt-2 block font-['Poppins'] text-xs text-[#719ba8]">
        {note}
      </small>
    </>
  );

  return onClick ? (
    <button type="button" onClick={onClick} className={classes}>
      {content}
    </button>
  ) : (
    <article className={classes}>{content}</article>
  );
}

function AdminOverview({
  stats,
  pendingCount,
  pendingList,
  onNavigate,
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
    reviewedOwners: 0,
    approvalRate: 0,
    rejectionRate: 0,
    activeRate: 0,
    businessesThisMonth: 0,
  };

  const pending = pendingCount ?? s.pendingOwners;
  const go = (page) => (onNavigate ? () => onNavigate(page) : undefined);
  const attention = (pendingList || []).slice(0, 3);

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6">
      {/* Header */}
      <div>
        <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[0.16em] text-[#73c4ca]">
          Platform Overview
        </p>

        <p className="mt-3 max-w-2xl font-['Poppins'] text-sm leading-relaxed text-[#9bbec7]">
          Registration reviews, approved businesses, and platform health at a
          glance. Staff details are available per business under Active
          Businesses.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pending Review"
          value={pending}
          note={
            pending > 0
              ? "Awaiting permit approval · click to review"
              : "No registrations waiting"
          }
          highlight={pending > 0}
          onClick={go("pending")}
        />

        <StatCard
          label="Approved Businesses"
          value={s.activeOwners}
          note={`${s.registeredOwners ?? s.totalOwners} registered in total · click to view`}
          onClick={go("businesses")}
        />

        <StatCard
          label="Registered This Month"
          value={s.businessesThisMonth}
          note="New business registrations"
        />

        <StatCard
          label="Approval Rate"
          value={`${s.approvalRate}%`}
          note={`${s.approvedOwners ?? s.activeOwners} of ${s.reviewedOwners ?? 0} reviewed registrations approved`}
        />
      </div>

      {/* Needs attention */}
      {attention.length > 0 && (
        <article className="rounded-2xl border border-amber-300/20 bg-amber-400/[.06] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[0.12em] text-amber-200">
                Needs attention
              </p>
              <p className="mt-1 font-['Poppins'] text-xs text-[#a9c8cf]">
                Oldest registrations waiting for review.
              </p>
            </div>

            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate("pending")}
                className="cursor-pointer rounded-full border border-amber-300/30 bg-amber-300/10 px-3.5 py-1.5 font-['Poppins'] text-xs font-medium text-amber-100 transition hover:bg-amber-300/20"
              >
                Review pending
              </button>
            )}
          </div>

          <ul className="mt-4 grid gap-2">
            {attention.map((owner) => (
              <li
                key={owner._id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-100/10 bg-[#062d48]/70 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-['Poppins'] text-sm font-medium text-[#d9ecef]">
                    {owner.businessName}
                  </p>
                  <p className="truncate font-['Poppins'] text-xs text-[#719ba8]">
                    {owner.ownerName}
                  </p>
                </div>

                <span className="font-['Poppins'] text-xs text-amber-200">
                  {waitingLabel(owner.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </article>
      )}

      <RegistrationAnalytics data={registrationAnalytics || []} />
      <VerificationAnalytics data={verificationAnalytics} />
      <DataHealth data={dataHealth} />
      <SystemHealth data={systemHealth} />

      {/* Verification Summary */}
      <div className="grid gap-3 lg:grid-cols-2">
        <article className="rounded-2xl border border-sky-100/10 bg-[#001523] p-5">
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
            {[
              {
                label: "Approved",
                count: s.activeOwners,
                suffix: ` (${s.activeRate}%)`,
                bar: "bg-[#73c4ca]",
                width: s.activeRate,
              },
              {
                label: "Pending",
                count: pending,
                suffix: "",
                bar: "bg-amber-300",
                width: s.totalOwners > 0 ? (pending / s.totalOwners) * 100 : 0,
              },
              {
                label: "Rejected",
                count: s.rejectedOwners,
                suffix: "",
                bar: "bg-red-300/80",
                width:
                  s.totalOwners > 0
                    ? (s.rejectedOwners / s.totalOwners) * 100
                    : 0,
              },
            ].map((row) => (
              <div key={row.label}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="font-['Poppins'] text-xs text-[#a9c8cf]">
                    {row.label}
                  </span>

                  <span className="font-['Poppins'] text-xs font-medium text-[#d9ecef]">
                    {row.count}
                    {row.suffix}
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-white/[.06]">
                  <div
                    className={`h-full rounded-full ${row.bar} transition-all`}
                    style={{ width: `${Math.min(row.width, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

export default AdminOverview;
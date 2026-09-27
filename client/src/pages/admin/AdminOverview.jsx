function AdminOverview({ stats, pendingCount }) {
  const s = stats || {
    totalOwners: 0,
    pendingOwners: 0,
    activeOwners: 0,
    rejectedOwners: 0,
    totalStaff: 0,
    disabledAccounts: 0,
  };

  const cards = [
    { label: "Total Businesses", value: s.totalOwners, note: "Registered owner accounts" },
    { label: "Pending Review", value: pendingCount ?? s.pendingOwners, note: "Awaiting permit approval", highlight: (pendingCount ?? s.pendingOwners) > 0 },
    { label: "Active Businesses", value: s.activeOwners, note: "Approved and operating" },
    { label: "Rejected", value: s.rejectedOwners, note: "Registration declined" },
    { label: "Total Staff", value: s.totalStaff, note: "Across all businesses" },
    { label: "Disabled Accounts", value: s.disabledAccounts, note: "Owner or staff, any reason" },
  ];

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6">
      <div>
        <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[0.16em] text-[#73c4ca]">
          Platform Overview
        </p>
        <p className="mt-3 font-['Poppins'] text-sm text-[#9bbec7]">
          A snapshot of every business registered on Fishonitory.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.label}
            className={`rounded-2xl border p-5 shadow-[0_14px_35px_rgba(0,12,31,.14)] ${
              card.highlight
                ? "border-amber-300/30 bg-amber-400/10"
                : "border-sky-100/10 bg-[#062d48]/80"
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
    </section>
  );
}

export default AdminOverview;
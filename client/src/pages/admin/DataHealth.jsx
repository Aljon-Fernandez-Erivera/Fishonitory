function DataHealth({ data }) {
  const health = data || {
    totalAccounts: 0,
    totalOwners: 0,
    totalStaff: 0,
    totalIssues: 0,

    dataQualityRate: 100,

    completeness: {
      businessName: 100,
      email: 100,
      address: 100,
      businessPermit: 100,
      staffOwnerLink: 100,
      createdAt: 100,
    },

    issues: {},
  };

  const issues = [
    {
      label: "Owners missing business name",
      value:
        health.issues?.ownersMissingBusinessName ?? 0,
    },
    {
      label: "Owners missing email",
      value:
        health.issues?.ownersMissingEmail ?? 0,
    },
    {
      label: "Owners missing address",
      value:
        health.issues?.ownersMissingAddress ?? 0,
    },
    {
      label: "Owners missing permit",
      value:
        health.issues?.ownersMissingPermit ?? 0,
    },
    {
      label: "Staff missing owner",
      value:
        health.issues?.staffMissingOwner ?? 0,
    },
    {
      label: "Accounts missing created date",
      value:
        health.issues?.accountsMissingCreatedAt ?? 0,
    },
  ];

  const completeness = [
    {
      label: "Business name",
      value:
        health.completeness?.businessName ?? 100,
    },
    {
      label: "Email",
      value:
        health.completeness?.email ?? 100,
    },
    {
      label: "Address",
      value:
        health.completeness?.address ?? 100,
    },
    {
      label: "Business permit",
      value:
        health.completeness?.businessPermit ?? 100,
    },
    {
      label: "Staff → owner link",
      value:
        health.completeness?.staffOwnerLink ?? 100,
    },
    {
      label: "Created date",
      value:
        health.completeness?.createdAt ?? 100,
    },
  ];

  return (
    <section className="rounded-3xl border border-white/10 bg-[#062d48]/80 p-5 shadow-lg">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[0.12em] text-[#73c4ca]">
            Data Health
          </p>

          <h2 className="mt-2 font-['Poppins'] text-lg font-semibold text-white">
            Database Quality
          </h2>

          <p className="mt-1 max-w-xl font-['Poppins'] text-xs leading-relaxed text-[#719ba8]">
            Read-only checks for incomplete or inconsistent
            account records.
          </p>
        </div>

        <div className="rounded-2xl border border-[#73c4ca]/10 bg-white/[.03] px-4 py-3 text-center">
          <span className="block font-['Poppins'] text-[10px] uppercase tracking-[0.1em] text-[#719ba8]">
            Quality
          </span>

          <strong className="mt-1 block font-['Fraunces'] text-3xl text-[#73c4ca]">
            {Number(
              health.dataQualityRate ?? 100,
            ).toFixed(1)}
            %
          </strong>
        </div>
      </div>

      {/* Data Issues */}
      <div className="mt-5">
        <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[0.12em] text-[#73c4ca]">
          Data Issues
        </p>

        <div className="mt-3 grid gap-2">
          {issues.map((issue) => (
            <div
              key={issue.label}
              className="flex items-center justify-between rounded-xl border border-white/[.06] bg-white/[.025] px-4 py-3"
            >
              <span className="font-['Poppins'] text-xs text-[#a9c8cf]">
                {issue.label}
              </span>

              <span
                className={`rounded-full px-2.5 py-1 font-['Poppins'] text-[10px] font-semibold ${
                  issue.value > 0
                    ? "bg-amber-400/10 text-amber-200"
                    : "bg-emerald-400/10 text-emerald-200"
                }`}
              >
                {issue.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Field Completeness */}
      <div className="mt-6">
        <div>
          <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[0.12em] text-[#73c4ca]">
            Field Completeness
          </p>

          <p className="mt-1 font-['Poppins'] text-[11px] leading-relaxed text-[#719ba8]">
            Percentage of relevant records containing each
            required data field.
          </p>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {completeness.map((item) => {
            const value = Number(item.value ?? 100);

            const safeValue = Number.isFinite(value)
              ? Math.min(Math.max(value, 0), 100)
              : 100;

            return (
              <div
                key={item.label}
                className="rounded-xl border border-white/[.06] bg-white/[.025] px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-['Poppins'] text-xs text-[#a9c8cf]">
                    {item.label}
                  </span>

                  <span className="shrink-0 font-['Poppins'] text-xs font-semibold text-[#73c4ca]">
                    {safeValue.toFixed(1)}%
                  </span>
                </div>

                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[.06]">
                  <div
                    className="h-full rounded-full bg-[#73c4ca] transition-all"
                    style={{
                      width: `${safeValue}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-5 flex items-center justify-between border-t border-white/[.06] pt-4">
        <span className="font-['Poppins'] text-xs text-[#719ba8]">
          Total accounts checked
        </span>

        <span className="font-['Poppins'] text-xs font-medium text-[#d9ecef]">
          {health.totalAccounts}
        </span>
      </div>
    </section>
  );
}

export default DataHealth;
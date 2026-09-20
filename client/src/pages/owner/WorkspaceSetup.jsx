const featureOptions = [
  {
    key: "staff",
    label: "Staff management",
    description: "Add staff accounts and manage their access.",
  },
  {
    key: "attendance",
    label: "Attendance",
    description: "Track daily staff attendance.",
  },
  {
    key: "inventory",
    label: "Fish inventory",
    description: "Manage fish, food, pricing, and stock.",
  },
  {
    key: "tanks",
    label: "Tank management",
    description: "Track tank care and maintenance.",
  },
  {
    key: "notes",
    label: "Notes",
    description: "Keep business notes and reminders.",
  },
  {
    key: "sales",
    label: "Sales",
    description: "View sales activity and summaries.",
  },
  {
    key: "payroll",
    label: "Payroll",
    description: "Calculate payroll from attendance.",
  },
  {
    key: "operations",
    label: "Operations & reports",
    description: "Record purchases, mortality, and audit reports.",
  },
];

function WorkspaceSetup({ features, setFeatures, onSave, saving, error }) {
  const updateFeature = (key, enabled) => {
    setFeatures((current) => {
      const next = { ...current, [key]: enabled };
      if (key === "staff" && !enabled) {
        next.attendance = false;
        next.payroll = false;
      }
      if (key === "attendance" && !enabled) next.payroll = false;
      return next;
    });
  };

  const useSoloPreset = () =>
    setFeatures((current) => ({
      ...current,
      staff: false,
      attendance: false,
      payroll: false,
    }));

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#021a31]/85 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="workspace-setup-title"
    >
      <section className="w-full max-w-3xl rounded-2xl border border-sky-100/15 bg-[#062d48] p-5 shadow-2xl sm:p-7">
        <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[0.16em] text-[#73c4ca]">
          First-time owner setup
        </p>
        <h1
          id="workspace-setup-title"
          className="mt-2 font-['Fraunces'] text-2xl font-medium text-[#d9ecef] sm:text-3xl"
        >
          Set up your workspace
        </h1>
        <p className="mt-2 font-['Poppins'] text-sm text-[#9bbec7]">
          Choose the tools you need today. Disabled tools are hidden, and their
          existing records are kept so you can restore them later.
        </p>
        <button
          type="button"
          onClick={useSoloPreset}
          disabled={saving}
          className="mt-4 rounded-full border border-[#73c4ca]/40 px-4 py-2 font-['Poppins'] text-xs font-medium text-[#bce9e9] transition hover:bg-[#73c4ca]/10 disabled:opacity-60"
        >
          I run the business alone
        </button>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {featureOptions.map((feature) => {
            const isRequiredByPayroll =
              feature.key === "staff" || feature.key === "attendance";
            const disabled =
              saving || (isRequiredByPayroll && features.payroll);
            return (
              <label
                key={feature.key}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${features[feature.key] ? "border-[#73c4ca]/45 bg-[#73c4ca]/10" : "border-sky-100/10 bg-white/[.025]"}`}
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-[#73c4ca]"
                  checked={Boolean(features[feature.key])}
                  disabled={disabled}
                  onChange={(event) =>
                    updateFeature(feature.key, event.target.checked)
                  }
                />
                <span>
                  <span className="block font-['Poppins'] text-sm font-medium text-[#d9ecef]">
                    {feature.label}
                  </span>
                  <span className="mt-1 block font-['Poppins'] text-xs text-[#8fb7be]">
                    {feature.description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        {features.payroll && (
          <p className="mt-4 font-['Poppins'] text-xs text-[#bce9e9]">
            Payroll keeps Staff Management and Attendance on because it uses
            both to calculate pay.
          </p>
        )}
        {error && (
          <p
            className="mt-4 rounded-xl border border-red-200/25 bg-red-200/10 px-4 py-3 font-['Poppins'] text-sm text-red-100"
            role="alert"
          >
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-full bg-[#75bec4] px-5 py-2.5 font-['Poppins'] text-sm font-medium text-[#052d45] transition hover:bg-[#86d0d6] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save workspace"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default WorkspaceSetup;

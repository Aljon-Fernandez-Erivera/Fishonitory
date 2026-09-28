function RegistrationAnalytics({ data = [] }) {
  const maxValue = Math.max(
    ...data.map((item) => Number(item.registered) || 0),
    1,
  );

  const totalRegistrations = data.reduce(
    (sum, item) => sum + (Number(item.registered) || 0),
    0,
  );

  const average =
    data.length > 0
      ? (totalRegistrations / data.length).toFixed(1)
      : "0.0";

  return (
    <section className="rounded-3xl border border-white/10 bg-[#062d48]/80 p-5 shadow-lg">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-['Poppins'] text-lg font-semibold text-white">
            Registration Trend
          </h2>

          <p className="mt-1 font-['Poppins'] text-xs text-white/50">
            New business registrations over the last 6 months
          </p>
        </div>

        <div className="flex gap-5">
          <div>
            <p className="font-['Poppins'] text-[10px] uppercase tracking-wider text-white/40">
              Total
            </p>

            <p className="font-['Poppins'] text-lg font-semibold text-[#73c4ca]">
              {totalRegistrations}
            </p>
          </div>

          <div>
            <p className="font-['Poppins'] text-[10px] uppercase tracking-wider text-white/40">
              Monthly Avg.
            </p>

            <p className="font-['Poppins'] text-lg font-semibold text-white">
              {average}
            </p>
          </div>
        </div>
      </div>

      {data.length > 0 ? (
        <div className="relative">
          <div className="flex h-56 items-end gap-2 sm:gap-4">
            {data.map((item) => {
              const registered = Number(item.registered) || 0;

              const height =
                registered > 0
                  ? Math.max(
                      (registered / maxValue) * 100,
                      6,
                    )
                  : 2;

              return (
                <div
                  key={item.month}
                  className="flex h-full min-w-0 flex-1 flex-col justify-end"
                >
                  <div className="mb-2 text-center">
                    <span className="font-['Poppins'] text-xs font-semibold text-white/80">
                      {registered}
                    </span>
                  </div>

                  <div className="flex h-full items-end">
                    <div
                      className="w-full rounded-t-xl bg-[#73c4ca] transition-all duration-500 hover:bg-[#89d7dc]"
                      style={{
                        height: `${height}%`,
                      }}
                      title={`${item.label}: ${registered} registrations`}
                    />
                  </div>

                  <div className="mt-3 text-center">
                    <span className="font-['Poppins'] text-[11px] font-medium text-white/45">
                      {item.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center">
          <p className="font-['Poppins'] text-sm text-white/40">
            No registration data available.
          </p>
        </div>
      )}
    </section>
  );
}

export default RegistrationAnalytics;
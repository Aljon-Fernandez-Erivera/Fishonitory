function StatusBadge({ healthy, children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-['Poppins'] text-[10px] font-semibold ${
        healthy
          ? "bg-emerald-400/10 text-emerald-200"
          : "bg-amber-400/10 text-amber-200"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          healthy
            ? "bg-emerald-300"
            : "bg-amber-300"
        }`}
      />

      {children}
    </span>
  );
}

function SystemHealth({ data }) {
  const health = data || {
    api: {
      status: "Unknown",
    },
    database: {
      status: "Unknown",
      readyState: 0,
    },
    server: {
      uptimeSeconds: 0,
      nodeVersion: "—",
      environment: "—",
      timestamp: null,
    },
  };

  const formatUptime = (seconds) => {
    if (!seconds || seconds < 1) return "—";

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor(
      (seconds % 86400) / 3600
    );
    const minutes = Math.floor(
      (seconds % 3600) / 60
    );

    if (days > 0) {
      return `${days}d ${hours}h`;
    }

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    return `${minutes}m`;
  };

  const isApiOperational =
    health.api?.status === "Operational";

  const isDatabaseConnected =
    health.database?.status === "Connected";

  return (
    <section className="rounded-3xl border border-white/10 bg-[#062d48]/80 p-5 shadow-lg">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[0.12em] text-[#73c4ca]">
            System Health
          </p>

          <h2 className="mt-2 font-['Poppins'] text-lg font-semibold text-white">
            Platform Reliability
          </h2>

          <p className="mt-1 font-['Poppins'] text-xs text-[#719ba8]">
            Current API, database, and server runtime status.
          </p>
        </div>

        <StatusBadge
          healthy={
            isApiOperational &&
            isDatabaseConnected
          }
        >
          {isApiOperational && isDatabaseConnected
            ? "Operational"
            : "Degraded"}
        </StatusBadge>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {/* API */}
        <div className="rounded-2xl border border-white/[.06] bg-white/[.025] p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="font-['Poppins'] text-[10px] uppercase tracking-[0.1em] text-[#719ba8]">
              API
            </span>

            <StatusBadge healthy={isApiOperational}>
              {health.api?.status || "Unknown"}
            </StatusBadge>
          </div>

          <p className="mt-4 font-['Poppins'] text-xs text-[#8fb7be]">
            Backend service
          </p>
        </div>

        {/* Database */}
        <div className="rounded-2xl border border-white/[.06] bg-white/[.025] p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="font-['Poppins'] text-[10px] uppercase tracking-[0.1em] text-[#719ba8]">
              Database
            </span>

            <StatusBadge healthy={isDatabaseConnected}>
              {health.database?.status || "Unknown"}
            </StatusBadge>
          </div>

          <p className="mt-4 font-['Poppins'] text-xs text-[#8fb7be]">
            MongoDB connection
          </p>
        </div>

        {/* Uptime */}
        <div className="rounded-2xl border border-white/[.06] bg-white/[.025] p-4">
          <span className="font-['Poppins'] text-[10px] uppercase tracking-[0.1em] text-[#719ba8]">
            Server Uptime
          </span>

          <strong className="mt-3 block font-['Fraunces'] text-2xl text-[#d9ecef]">
            {formatUptime(
              health.server?.uptimeSeconds
            )}
          </strong>

          <p className="mt-1 font-['Poppins'] text-[10px] text-[#638d99]">
            Since last server restart
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/[.06] pt-4 sm:grid-cols-3">
        <div>
          <span className="block font-['Poppins'] text-[9px] uppercase tracking-[0.1em] text-[#638d99]">
            Environment
          </span>

          <span className="mt-1 block font-['Poppins'] text-xs text-[#a9c8cf]">
            {health.server?.environment || "—"}
          </span>
        </div>

        <div>
          <span className="block font-['Poppins'] text-[9px] uppercase tracking-[0.1em] text-[#638d99]">
            Node.js
          </span>

          <span className="mt-1 block font-['Poppins'] text-xs text-[#a9c8cf]">
            {health.server?.nodeVersion || "—"}
          </span>
        </div>

        <div>
          <span className="block font-['Poppins'] text-[9px] uppercase tracking-[0.1em] text-[#638d99]">
            Database State
          </span>

          <span className="mt-1 block font-['Poppins'] text-xs text-[#a9c8cf]">
            {health.database?.readyState ?? "—"}
          </span>
        </div>
      </div>
    </section>
  );
}

export default SystemHealth;
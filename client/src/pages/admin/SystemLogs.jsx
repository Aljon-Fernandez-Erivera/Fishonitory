function actorLabel(actor) {
  if (!actor) return "—";
  return actor.businessName || actor.staffName || actor.email || "Unknown";
}

function SystemLogs({ logs }) {
  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6">
      <div>
        <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[0.16em] text-[#73c4ca]">
          System Logs
        </p>
        <p className="mt-3 font-['Poppins'] text-sm text-[#9bbec7]">
          Platform-wide activity across every business, most recent first.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-sky-100/10 bg-[#062d48]/80">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[820px] border-collapse font-['Poppins'] text-sm">
            <thead className="sticky top-0 z-10 bg-[#062d48] text-left text-xs uppercase tracking-[.1em] text-[#89afb9]">
              <tr>
                <th className="border-b border-sky-100/10 px-5 py-3 font-medium">Date</th>
                <th className="border-b border-sky-100/10 px-5 py-3 font-medium">Business</th>
                <th className="border-b border-sky-100/10 px-5 py-3 font-medium">Actor</th>
                <th className="border-b border-sky-100/10 px-5 py-3 font-medium">Action</th>
                <th className="border-b border-sky-100/10 px-5 py-3 font-medium">Entity</th>
                <th className="border-b border-sky-100/10 px-5 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr className="border-t border-sky-100/[.07] text-[#b7d2d7]" key={log._id}>
                  <td className="px-5 py-3 text-xs text-[#789faa]">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-3">{log.ownerId?.businessName || "—"}</td>
                  <td className="px-5 py-3">{actorLabel(log.actorId)}</td>
                  <td className="px-5 py-3 font-medium text-[#d9ecef]">{log.action}</td>
                  <td className="px-5 py-3">{log.entityType}</td>
                  <td className="px-5 py-3 text-xs text-[#9bbec7]">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!logs.length && (
          <p className="px-5 py-12 text-center font-['Poppins'] text-sm text-[#789faa]">
            No activity recorded yet.
          </p>
        )}
      </div>
    </section>
  );
}

export default SystemLogs;
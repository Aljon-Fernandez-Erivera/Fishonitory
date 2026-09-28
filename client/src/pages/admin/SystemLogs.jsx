function actorLabel(actor) {
  if (!actor) return "—";
  return actor.businessName || actor.staffName || actor.email || "Unknown";
}

function SystemLogs({ logs, pagination, onPageChange }) {
  const currentPage = pagination?.page || 1;
  const totalPages = pagination?.totalPages || 1;
  const total = pagination?.total || 0;

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
                <th className="border-b border-sky-100/10 px-5 py-3 font-medium">
                  Date
                </th>
                <th className="border-b border-sky-100/10 px-5 py-3 font-medium">
                  Business
                </th>
                <th className="border-b border-sky-100/10 px-5 py-3 font-medium">
                  Actor
                </th>
                <th className="border-b border-sky-100/10 px-5 py-3 font-medium">
                  Action
                </th>
                <th className="border-b border-sky-100/10 px-5 py-3 font-medium">
                  Entity
                </th>
                <th className="border-b border-sky-100/10 px-5 py-3 font-medium">
                  Details
                </th>
              </tr>
            </thead>

            <tbody>
              {logs.map((log) => (
                <tr
                  className="border-t border-sky-100/[.07] text-[#b7d2d7]"
                  key={log._id}
                >
                  <td className="px-5 py-3 text-xs text-[#789faa]">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>

                  <td className="px-5 py-3">
                    {log.ownerId?.businessName || "—"}
                  </td>

                  <td className="px-5 py-3">
                    {actorLabel(log.actorId)}
                  </td>

                  <td className="px-5 py-3 font-medium text-[#d9ecef]">
                    {log.action}
                  </td>

                  <td className="px-5 py-3">
                    {log.entityType}
                  </td>

                  <td className="px-5 py-3 text-xs text-[#9bbec7]">
                    {log.details}
                  </td>
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

        {/* Pagination */}
        {total > 0 && (
          <div className="flex flex-col gap-3 border-t border-sky-100/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-['Poppins'] text-xs text-[#789faa]">
              Showing page{" "}
              <span className="font-semibold text-[#b7d2d7]">
                {currentPage}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-[#b7d2d7]">
                {totalPages}
              </span>{" "}
              · {total} total logs
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => onPageChange(currentPage - 1)}
                className="rounded-xl border border-sky-100/10 px-3 py-2 font-['Poppins'] text-xs text-[#b7d2d7] transition hover:bg-sky-100/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <span className="min-w-[70px] text-center font-['Poppins'] text-xs text-[#89afb9]">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                className="rounded-xl border border-sky-100/10 px-3 py-2 font-['Poppins'] text-xs text-[#b7d2d7] transition hover:bg-sky-100/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default SystemLogs;
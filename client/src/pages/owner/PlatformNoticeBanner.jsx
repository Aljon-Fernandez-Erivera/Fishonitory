const formatDateTime = (value) => {
  if (!value) return "Platform update";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Platform update";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

function PlatformNoticeBanner({ notices = [], onDismiss }) {
  const activeNotices = notices;
  if (!activeNotices.length) return null;

  return (
    <section aria-label="Platform announcements" className="mx-auto mb-5 grid w-full max-w-7xl gap-3">
      <h2 className="m-0 font-['Poppins'] text-xs font-semibold uppercase tracking-[.16em] text-[#73c4ca]">
        Platform announcements
      </h2>
      <ul className="m-0 grid list-none gap-3 p-0">
        {activeNotices.map((notice) => (
          <li
            key={notice._id}
            className="relative rounded-2xl bg-[#062d48]/80 p-4 transition-colors hover:bg-[#07365a]/90 sm:p-5"
          >
            <span
              aria-hidden="true"
              className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-[#73c4ca]/80"
            />
            <div className="flex items-start gap-3 sm:gap-4">
              <span
                aria-hidden="true"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#73c4ca]/15 font-['Poppins'] text-sm font-semibold text-[#bce9e9]"
              >
                F
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-['Poppins']">
                  <span className="text-sm font-semibold text-[#e3f2f4]">Fishonitory</span>
                  <span className="rounded-full bg-white/[.07] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#9fc5cc]">
                    Platform
                  </span>
                  <span aria-hidden="true" className="text-xs text-[#6f929c]">·</span>
                  <time className="text-xs text-[#8fb3ba]" dateTime={notice.createdAt || undefined}>
                    {formatDateTime(notice.createdAt)}
                  </time>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#73c4ca]/15 px-2 py-0.5 font-['Poppins'] text-[10px] font-semibold uppercase tracking-[.12em] text-[#bce9e9]">
                    {notice.category || "General"}
                  </span>
                  {notice.expiresAt && (
                    <span className="rounded-full bg-white/[.06] px-2 py-0.5 font-['Poppins'] text-[10px] font-medium text-[#9fc5cc]">
                      Until {new Date(notice.expiresAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <h3 className="mb-0 mt-3 font-['Poppins'] text-sm font-semibold text-[#e3f2f4]">
                  {notice.title}
                </h3>
                <p className="mb-0 mt-1 whitespace-pre-wrap break-words font-['Poppins'] text-sm leading-6 text-[#d9ecef]">
                  {notice.message}
                </p>
              </div>
              <button type="button" onClick={() => onDismiss?.(notice)} aria-label={`Dismiss ${notice.title}`} title="Hide this notice for your account" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[.04] text-xl leading-none text-[#b7d2d7] transition hover:bg-red-400/15 hover:text-red-200">×</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default PlatformNoticeBanner;

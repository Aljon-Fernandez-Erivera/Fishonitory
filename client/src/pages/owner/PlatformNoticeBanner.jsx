import { useCallback, useEffect } from "react";

const dismissedStorageKey = (viewerRole, viewerId) =>
  `fishonitory:platform-notices-dismissed:v1:${viewerRole || "user"}:${viewerId || "unknown"}`;

const noticeVersion = (notice) =>
  `${notice._id}:${notice.updatedAt || notice.createdAt || ""}`;

const readDismissedNoticeVersions = (key) => {
  try {
    const stored = JSON.parse(window.localStorage.getItem(key) || "[]");
    return new Set(Array.isArray(stored) ? stored : []);
  } catch {
    return new Set();
  }
};

const formatDateTime = (value) => {
  if (!value) return "Platform update";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Platform update";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

function PlatformNoticeBanner({ notices = [], onClose, viewerId, viewerRole, forceShow = false }) {
  const storageKey = dismissedStorageKey(viewerRole, viewerId);
  const dismissedVersions = readDismissedNoticeVersions(storageKey);
  const visibleNotices = forceShow
    ? notices
    : notices.filter((notice) => !dismissedVersions.has(noticeVersion(notice)));

  const closeNotices = useCallback(() => {
    try {
      const versions = new Set([...dismissedVersions, ...notices.map(noticeVersion)]);
      window.localStorage.setItem(storageKey, JSON.stringify([...versions]));
    } catch {
      // Keep closing usable when browser storage is unavailable.
    }
    onClose?.();
  }, [dismissedVersions, notices, onClose, storageKey]);

  useEffect(() => {
    if (!visibleNotices.length) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event) => {
      if (event.key === "Escape") closeNotices();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [visibleNotices.length, closeNotices]);

  if (!visibleNotices.length) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#020e1b]/80 p-4 backdrop-blur-sm sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="platform-notice-heading"
        className="my-auto grid w-full max-w-2xl gap-4 rounded-3xl border border-[#73c4ca]/25 bg-[#062d48] p-4 shadow-[0_28px_90px_rgba(0,0,0,.65)] sm:gap-5 sm:p-6"
      >
        <header className="flex items-start justify-between gap-4">
          <div>
          <p className="m-0 font-['Poppins'] text-[10px] font-semibold uppercase tracking-[.16em] text-[#73c4ca]">
            Fishonitory updates
          </p>
          <h2 id="platform-notice-heading" className="mb-0 mt-1 font-['Poppins'] text-lg font-semibold text-[#e3f2f4]">
            Platform announcements
          </h2>
          <p className="mb-0 mt-1 font-['Poppins'] text-xs text-[#9bbec7]">
            {visibleNotices.length} notice{visibleNotices.length === 1 ? "" : "s"} need your attention
          </p>
          </div>
          <button type="button" onClick={closeNotices} aria-label="Close platform notices" title="Close and keep in notifications" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-transparent text-2xl leading-none text-[#b7d2d7] transition hover:border-red-300/30 hover:text-red-200">{"\u00d7"}</button>
        </header>

        <ul className="m-0 grid max-h-[min(65vh,34rem)] list-none gap-3 overflow-y-auto p-0">
          {visibleNotices.map((notice) => (
            <li key={notice._id} className="relative rounded-2xl border border-white/[.07] bg-[#041f35] p-4 sm:p-5">
              <span aria-hidden="true" className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-[#73c4ca]/80" />
              <div className="flex items-start gap-3 sm:gap-4">
                <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#73c4ca]/15 font-['Poppins'] text-sm font-semibold text-[#bce9e9]">
                  F
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-['Poppins']">
                    <span className="text-sm font-semibold text-[#e3f2f4]">Fishonitory</span>
                    <span className="rounded-full bg-white/[.07] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#9fc5cc]">Platform</span>
                    <time className="text-xs text-[#8fb3ba]" dateTime={notice.createdAt || undefined}>
                      {formatDateTime(notice.createdAt)}
                    </time>
                  </div>
                  <span className="mt-2 inline-flex rounded-full bg-[#73c4ca]/15 px-2 py-0.5 font-['Poppins'] text-[10px] font-semibold uppercase tracking-[.12em] text-[#bce9e9]">
                    {notice.category || "General"}
                  </span>
                  <h3 className="mb-0 mt-3 font-['Poppins'] text-sm font-semibold text-[#e3f2f4]">{notice.title}</h3>
                  <p className="mb-0 mt-1 whitespace-pre-wrap break-words font-['Poppins'] text-sm leading-6 text-[#d9ecef]">{notice.message}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default PlatformNoticeBanner;

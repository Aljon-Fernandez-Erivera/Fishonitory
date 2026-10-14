import { useEffect, useState } from "react";

function PlatformNoticeBanner({ notices = [] }) {
  const [, setClock] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const activeNotices = notices.filter(
    (notice) => !notice.expiresAt || new Date(notice.expiresAt).getTime() > Date.now(),
  );
  if (!activeNotices.length) return null;

  return (
    <section aria-label="Platform notices" className="mb-5 grid gap-3">
      {activeNotices.map((notice) => (
        <article key={notice._id} className="rounded-2xl border border-cyan-200/20 bg-[linear-gradient(120deg,rgba(8,74,91,.94),rgba(6,45,72,.96))] p-4 shadow-[0_12px_28px_rgba(0,12,31,.16)] sm:px-5">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-cyan-100/15 bg-cyan-100/[.07] text-[#a9e0e2]" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 14v-4a2 2 0 0 1 2-2h2l9-4v16l-9-4H6a2 2 0 0 1-2-2Zm4 2 1.5 4H13l-2-5" />
                <path strokeLinecap="round" d="M20 9.5a4 4 0 0 1 0 5" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-cyan-200/20 bg-cyan-200/[.08] px-2 py-0.5 font-['Poppins'] text-[10px] font-semibold uppercase tracking-[.1em] text-[#b8eaeb]">Platform notice</span>
                <span className="rounded-full border border-cyan-100/10 bg-white/[.04] px-2 py-0.5 font-['Poppins'] text-[10px] font-medium uppercase tracking-wide text-[#c5dce1]">{notice.category || "general"}</span>
                {notice.expiresAt && <span className="font-['Poppins'] text-[10px] text-[#b0cbd1]">Until {new Date(notice.expiresAt).toLocaleDateString()}</span>}
              </div>
              <h2 className="mb-0 mt-2 font-['Poppins'] text-sm font-semibold text-[#e0f2f3]">{notice.title}</h2>
              <p className="mb-0 mt-1 whitespace-pre-wrap break-words font-['Poppins'] text-sm leading-relaxed text-[#c5dce1]">{notice.message}</p>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

export default PlatformNoticeBanner;

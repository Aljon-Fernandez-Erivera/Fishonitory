import { useState } from "react";

const fieldClass = "w-full rounded-xl border border-sky-100/15 bg-[#062d48] px-3.5 py-3 font-['Poppins'] text-sm text-[#d9ecef] outline-none transition placeholder:text-[#8fb3ba] focus:border-[#73c4ca] focus:ring-2 focus:ring-[#73c4ca]/20";

const formatDateTime = (value) => {
  if (!value) return "Recently published";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Recently published"
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

function PlatformNotices({ notices = [], loading = false, onCreate, onDelete }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");
  const [audience, setAudience] = useState("all");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!title.trim() || !message.trim() || saving) return;
    setSaving(true);
    const created = await onCreate({
      title,
      message,
      category,
      audience,
      expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59+08:00`).toISOString() : null,
    });
    setSaving(false);
    if (created) {
      setTitle("");
      setMessage("");
      setCategory("general");
      setAudience("all");
      setExpiresAt("");
    }
  };

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-5">
      <header>
        <h2 className="m-0 font-['Poppins'] text-xs font-semibold uppercase tracking-[.16em] text-[#73c4ca]">
          Platform Notice Board
        </h2>
        <p className="mb-0 mt-2 max-w-2xl font-['Poppins'] text-sm leading-relaxed text-[#b0cbd1]">
          Share maintenance windows, feature updates, policy changes, and reminders directly with business owners. Notices are read-only in owner dashboards and never appear in staff announcements.
        </p>
      </header>

      <form onSubmit={submit} className="grid gap-4 rounded-2xl bg-[#062d48]/80 p-4 sm:p-5">
        <div>
          <h3 className="m-0 font-['Poppins'] text-sm font-semibold text-[#e3f2f4]">Write a platform notice</h3>
          <p className="mb-0 mt-1 font-['Poppins'] text-xs text-[#8fb3ba]">This post will appear on the selected owners’ dashboards.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="grid content-start gap-1.5 font-['Poppins'] text-xs font-medium text-[#c5dce1]">
            Title
            <input className={fieldClass} maxLength={120} required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Scheduled maintenance" />
          </label>
          <label className="grid content-start gap-1.5 font-['Poppins'] text-xs font-medium text-[#c5dce1]">
            Notice type
            <select className={fieldClass} value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="general">General update</option>
              <option value="maintenance">Maintenance window</option>
              <option value="feature">New feature</option>
              <option value="policy">Policy or terms update</option>
              <option value="reminder">Reminder</option>
            </select>
          </label>
          <label className="grid gap-1.5 font-['Poppins'] text-xs font-medium text-[#c5dce1] lg:col-span-2">
            Message
            <textarea className={`${fieldClass} min-h-28 resize-y`} maxLength={2000} required value={message} onChange={(event) => setMessage(event.target.value)} placeholder="What should owners know?" />
          </label>
          <label className="grid content-start gap-1.5 font-['Poppins'] text-xs font-medium text-[#c5dce1]">
            Who can see this?
            <select className={fieldClass} value={audience} onChange={(event) => setAudience(event.target.value)}>
              <option value="all">All businesses</option>
              <option value="approved">Approved businesses only</option>
            </select>
          </label>
          <label className="grid content-start gap-1.5 font-['Poppins'] text-xs font-medium text-[#c5dce1]">
            Hide after <span className="font-normal text-[#a6c3cb]">(optional)</span>
            <input type="date" className={fieldClass} value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
          </label>
        </div>
        <button type="submit" disabled={!title.trim() || !message.trim() || saving} className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-[#76c7cd] px-5 py-2.5 font-['Poppins'] text-sm font-semibold text-[#052d45] shadow-[0_6px_18px_rgba(118,199,205,.2)] transition hover:bg-[#91d8dc] disabled:cursor-not-allowed disabled:bg-white/[.07] disabled:text-[#789faa] sm:ml-auto sm:w-auto">
          {saving ? "Publishing…" : "Publish notice"}
        </button>
      </form>

      <div className="grid gap-3">
        <h3 className="m-0 font-['Poppins'] text-xs font-semibold uppercase tracking-[.16em] text-[#73c4ca]">
          Published notices
        </h3>
        {loading && !notices.length ? (
          <p className="rounded-2xl bg-white/[.03] px-5 py-12 text-center font-['Poppins'] text-sm text-[#b0cbd1]">Loading platform notices…</p>
        ) : notices.length ? (
          <ul className="m-0 grid list-none gap-3 p-0">
            {notices.map((notice) => {
              const expired = notice.expiresAt && new Date(notice.expiresAt).getTime() <= Date.now();
              return (
                <li key={notice._id} className="relative rounded-2xl bg-[#062d48]/80 p-4 transition-colors hover:bg-[#07365a]/90 sm:p-5">
                  <span aria-hidden="true" className={`absolute inset-y-4 left-0 w-1 rounded-r-full ${expired ? "bg-red-300/70" : "bg-[#73c4ca]/80"}`} />
                  <div className="flex items-start gap-3 sm:gap-4">
                    <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#73c4ca]/15 font-['Poppins'] text-sm font-semibold text-[#bce9e9]">A</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-['Poppins']">
                        <span className="text-sm font-semibold text-[#e3f2f4]">Platform Admin</span>
                        <span className="rounded-full bg-white/[.07] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#9fc5cc]">Admin</span>
                        <span aria-hidden="true" className="text-xs text-[#6f929c]">·</span>
                        <time className="text-xs text-[#8fb3ba]" dateTime={notice.createdAt || undefined}>{formatDateTime(notice.createdAt)}</time>
                      </div>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#73c4ca]/15 px-2 py-0.5 font-['Poppins'] text-[10px] font-semibold uppercase tracking-[.12em] text-[#bce9e9]">{notice.category || "General"}</span>
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-['Poppins'] text-[10px] font-semibold uppercase tracking-[.12em] text-emerald-200">{notice.audience === "approved" ? "Approved businesses" : "All businesses"}</span>
                        {notice.expiresAt && <span className="rounded-full bg-white/[.06] px-2 py-0.5 font-['Poppins'] text-[10px] font-medium text-[#9fc5cc]">Expires {new Date(notice.expiresAt).toLocaleDateString()}</span>}
                        {expired && <span className="rounded-full bg-red-400/15 px-2 py-0.5 font-['Poppins'] text-[10px] font-semibold uppercase tracking-wide text-red-200">Expired</span>}
                      </div>
                      <h4 className="mb-0 mt-3 font-['Poppins'] text-sm font-semibold text-[#e3f2f4]">{notice.title}</h4>
                      <p className="mb-0 mt-1 whitespace-pre-wrap break-words font-['Poppins'] text-sm leading-6 text-[#d9ecef]">{notice.message}</p>
                    </div>
                    <button type="button" onClick={() => onDelete(notice)} className="shrink-0 rounded-full border border-red-200/20 bg-red-400/[.06] px-3 py-1.5 font-['Poppins'] text-xs font-medium text-red-200 transition hover:bg-red-400/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#76c7cd]">Remove</button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl bg-white/[.03] px-5 py-8 text-center">
            <span className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-[#73c4ca]/15 font-['Poppins'] text-sm font-semibold text-[#90d5d9]" aria-hidden="true">i</span>
            <p className="m-0 font-['Poppins'] text-sm font-medium text-[#d9ecef]">No platform notices yet</p>
            <p className="mb-0 mt-1 max-w-sm font-['Poppins'] text-xs text-[#b0cbd1]">Published notices will appear here and in the targeted owners’ dashboards.</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default PlatformNotices;

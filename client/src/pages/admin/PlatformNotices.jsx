import { useState } from "react";

const fieldClass = "w-full rounded-xl border border-sky-100/15 bg-[#062d48] px-3.5 py-3 font-['Poppins'] text-sm text-[#d9ecef] outline-none transition placeholder:text-[#8fb3ba] focus:border-[#73c4ca] focus:ring-2 focus:ring-[#73c4ca]/20";

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
        <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[.16em] text-[#73c4ca]">Platform Notices</p>
        <p className="mt-2 max-w-2xl font-['Poppins'] text-sm leading-relaxed text-[#b0cbd1]">
          Share maintenance windows, feature updates, policy changes, and reminders directly with business owners. Notices are read-only in owner dashboards and never appear in staff announcements.
        </p>
      </header>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(320px,.8fr)_minmax(0,1.2fr)]">
        <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-5">
          <h2 className="m-0 font-['Poppins'] text-sm font-semibold text-[#d9ecef]">Write a platform notice</h2>
          <label className="grid gap-1.5 font-['Poppins'] text-xs font-medium text-[#c5dce1]">
            Title
            <input className={fieldClass} maxLength={120} required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Scheduled maintenance" />
          </label>
          <label className="grid gap-1.5 font-['Poppins'] text-xs font-medium text-[#c5dce1]">
            Message
            <textarea className={`${fieldClass} min-h-36 resize-y`} maxLength={2000} required value={message} onChange={(event) => setMessage(event.target.value)} placeholder="What should owners know?" />
          </label>
          <label className="grid gap-1.5 font-['Poppins'] text-xs font-medium text-[#c5dce1]">
            Notice type
            <select className={fieldClass} value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="general">General update</option>
              <option value="maintenance">Maintenance window</option>
              <option value="feature">New feature</option>
              <option value="policy">Policy or terms update</option>
              <option value="reminder">Reminder</option>
            </select>
          </label>
          <label className="grid gap-1.5 font-['Poppins'] text-xs font-medium text-[#c5dce1]">
            Who can see this?
            <select className={fieldClass} value={audience} onChange={(event) => setAudience(event.target.value)}>
              <option value="all">All businesses</option>
              <option value="approved">Approved businesses only</option>
            </select>
          </label>
          <label className="grid gap-1.5 font-['Poppins'] text-xs font-medium text-[#c5dce1]">
            Hide after <span className="font-normal text-[#a6c3cb]">(optional)</span>
            <input type="date" className={fieldClass} value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
          </label>
          <button type="submit" disabled={!title.trim() || !message.trim() || saving} className="justify-self-end rounded-full border border-[#76c7cd] bg-[#76c7cd] px-5 py-2.5 font-['Poppins'] text-sm font-semibold text-[#052d45] transition hover:bg-[#91d8dc] disabled:cursor-not-allowed disabled:border-sky-100/10 disabled:bg-white/[.07] disabled:text-[#789faa]">
            {saving ? "Publishing…" : "Publish notice"}
          </button>
        </form>

        <div className="min-w-0">
          <h2 className="mb-2 font-['Poppins'] text-xs font-semibold uppercase tracking-[.14em] text-[#73c4ca]">Published notices</h2>
          <div className="overflow-hidden rounded-2xl border border-sky-100/10 bg-[#062d48]/80">
            {loading && !notices.length ? (
              <p className="px-5 py-12 text-center font-['Poppins'] text-sm text-[#b0cbd1]">Loading platform notices…</p>
            ) : notices.length ? (
              <ul className="m-0 max-h-[70vh] list-none divide-y divide-sky-100/[.08] overflow-y-auto p-0">
                {notices.map((notice) => (
                  <li key={notice._id} className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="m-0 font-['Poppins'] text-sm font-semibold text-[#e0eff1]">{notice.title}</h3>
                          <span className="rounded-full border border-cyan-300/20 bg-cyan-300/[.07] px-2 py-0.5 font-['Poppins'] text-[10px] font-semibold uppercase tracking-wide text-[#a9e0e2]">{notice.audience === "approved" ? "Approved businesses" : "All businesses"}</span>
                          <span className="rounded-full border border-sky-100/10 bg-white/[.04] px-2 py-0.5 font-['Poppins'] text-[10px] font-semibold uppercase tracking-wide text-[#c5dce1]">{notice.category || "general"}</span>
                          {notice.expiresAt && new Date(notice.expiresAt).getTime() <= Date.now() && (
                            <span className="rounded-full border border-red-200/20 bg-red-300/[.07] px-2 py-0.5 font-['Poppins'] text-[10px] font-semibold uppercase tracking-wide text-red-200">Expired</span>
                          )}
                        </div>
                        <p className="mb-0 mt-2 whitespace-pre-wrap break-words font-['Poppins'] text-sm leading-relaxed text-[#c5dce1]">{notice.message}</p>
                        <p className="mb-0 mt-2 font-['Poppins'] text-xs text-[#a6c3cb]">
                          Published {new Date(notice.createdAt).toLocaleString()}
                          {notice.expiresAt ? ` · Expires ${new Date(notice.expiresAt).toLocaleDateString()}` : " · No expiry"}
                        </p>
                      </div>
                      <button type="button" onClick={() => onDelete(notice)} className="rounded-full border border-red-200/20 bg-red-400/[.06] px-3 py-1.5 font-['Poppins'] text-xs font-medium text-red-200 transition hover:bg-red-400/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#76c7cd]">Remove</button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex min-h-48 flex-col items-center justify-center px-5 py-8 text-center">
                <span className="mb-3 grid h-11 w-11 place-items-center rounded-full border border-[#73c4ca]/20 bg-[#73c4ca]/10 text-[#90d5d9]" aria-hidden="true">i</span>
                <p className="m-0 font-['Poppins'] text-sm font-medium text-[#d9ecef]">No platform notices yet</p>
                <p className="mb-0 mt-1 max-w-sm font-['Poppins'] text-xs text-[#b0cbd1]">Published notices will appear here and in the targeted owners’ dashboards.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default PlatformNotices;

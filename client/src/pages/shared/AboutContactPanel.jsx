import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_URL } from "../../config.js";

const initialContent = {
  aboutEyebrow: "ABOUT FISHONITORY",
  aboutHeadline: "Clarity for every fish, tank, and sale.",
  aboutDescription: "Fishonitory helps ornamental fish businesses manage livestock, tanks, sales, staff, attendance, purchases, and business records in one workspace.",
  mission: "Give fish businesses a clear, dependable place to manage daily operations and make informed decisions.",
  vision: "Support healthier aquatic businesses with better visibility into the work behind every tank and sale.",
  contactHeadline: "How can we help?",
  contactMessage: "For account or workspace support, contact your business owner or the Fishonitory administrator.",
  supportEmail: "",
  supportPhone: "",
  supportHours: "",
};

const fieldMeta = {
  aboutEyebrow: ["About label", "text", 80],
  aboutHeadline: ["About headline", "text", 120],
  aboutDescription: ["About description", "textarea", 1200],
  mission: ["Mission", "textarea", 600],
  vision: ["Vision", "textarea", 600],
  contactHeadline: ["Contact headline", "text", 120],
  contactMessage: ["Contact guidance", "textarea", 600],
  supportEmail: ["Support email", "email", 254],
  supportPhone: ["Support phone", "tel", 40],
  supportHours: ["Support hours", "text", 120],
};

const inputClass = "mt-1.5 w-full rounded-xl border border-sky-100/15 bg-[#062d48] px-3.5 py-3 font-['Poppins'] text-sm text-[#d9ecef] outline-none transition placeholder:text-[#719ba8] focus:border-[#73c4ca] focus:ring-2 focus:ring-[#73c4ca]/15";

function AboutContactPanel({ section = "all", editable = false, onSave }) {
  const [content, setContent] = useState(initialContent);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/site-content`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Could not load company information.");
        if (active) setContent({ ...initialContent, ...(data.content || {}) });
      })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const aboutVisible = section === "about" || section === "all";
  const contactVisible = section === "contact" || section === "all";
  const update = (key, value) => setContent((current) => ({ ...current, [key]: value }));

  const save = async (event) => {
    event.preventDefault();
    if (!editable || !onSave) return;
    setSaving(true);
    setError("");
    setSaved("");
    try {
      const result = await onSave(content);
      setContent({ ...initialContent, ...(result?.content || content) });
      setSaved(result?.message || "Changes saved.");
    } catch (requestError) {
      setError(requestError.message || "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  const field = (key) => {
    const [label, type, maxLength] = fieldMeta[key];
    return (
      <label key={key} className="block font-['Poppins'] text-xs font-medium text-[#a9c8cf]">
        {label}
        {type === "textarea" ? (
          <textarea rows={key === "aboutDescription" ? 4 : 3} maxLength={maxLength} value={content[key]} onChange={(event) => update(key, event.target.value)} readOnly={!editable} className={`${inputClass} resize-y leading-6 read-only:border-transparent read-only:bg-white/[.025] read-only:px-0 read-only:focus:ring-0`} />
        ) : (
          <input type={type} maxLength={maxLength} value={content[key]} onChange={(event) => update(key, event.target.value)} readOnly={!editable} className={`${inputClass} read-only:border-transparent read-only:bg-transparent read-only:px-0 read-only:focus:ring-0`} />
        )}
      </label>
    );
  };

  if (loading) return <div className="w-full max-w-7xl animate-pulse rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-8 text-sm text-[#9bbec7]">Loading Fishonitory information…</div>;

  return (
    <form onSubmit={save} className="w-full max-w-7xl space-y-6">
      {error && <p role="alert" className="rounded-xl border border-red-200/25 bg-red-200/10 px-4 py-3 text-sm text-red-100">{error}</p>}
      {saved && <p role="status" className="rounded-xl border border-[#75bec4]/30 bg-[#75bec4]/10 px-4 py-3 text-sm text-[#c9e8e9]">{saved}</p>}

      {aboutVisible && (
        <section aria-labelledby="about-panel-title" className="overflow-hidden rounded-3xl border border-sky-100/10 bg-[radial-gradient(circle_at_90%_10%,rgba(115,196,202,.17),transparent_38%),linear-gradient(135deg,rgba(6,45,72,.96),rgba(3,30,50,.92))] shadow-[0_20px_55px_rgba(0,12,31,.2)]">
          <div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[1.15fr_.85fr] lg:p-11">
            <div>
              {!editable && <p className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-[.2em] text-[#73c4ca]">{content.aboutEyebrow}</p>}
              {editable ? <div className="space-y-3">{field("aboutEyebrow")}{field("aboutHeadline")}{field("aboutDescription")}</div> : <><h2 id="about-panel-title" className="mt-4 max-w-2xl font-['Fraunces'] text-3xl leading-tight text-[#e7f4f5] sm:text-4xl">{content.aboutHeadline}</h2><p className="mt-5 max-w-2xl font-['Poppins'] text-sm leading-7 text-[#a9c8cf]">{content.aboutDescription}</p></>}
              <div className="mt-7 flex flex-wrap gap-2">
                {["Tank & livestock records", "Sales & inventory", "Staff operations"].map((tag) => <span key={tag} className="rounded-full border border-sky-100/15 bg-white/[.04] px-3 py-1.5 font-['Poppins'] text-[11px] text-[#c9e1e5]">{tag}</span>)}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <article className="rounded-2xl border border-sky-100/10 bg-white/[.045] p-5">
                <p className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-[.16em] text-[#73c4ca]">Our mission</p>
                <div className="mt-3 font-['Poppins'] text-sm leading-6 text-[#c9e1e5]">{editable ? field("mission") : <p>{content.mission}</p>}</div>
              </article>
              <article className="rounded-2xl border border-sky-100/10 bg-white/[.045] p-5">
                <p className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-[.16em] text-[#73c4ca]">Our vision</p>
                <div className="mt-3 font-['Poppins'] text-sm leading-6 text-[#c9e1e5]">{editable ? field("vision") : <p>{content.vision}</p>}</div>
              </article>
            </div>
          </div>
        </section>
      )}

      {contactVisible && (
        <section aria-labelledby="contact-panel-title" className="rounded-3xl border border-sky-100/10 bg-[#062d48]/75 p-6 shadow-[0_18px_45px_rgba(0,12,31,.17)] sm:p-8">
          <div className="grid gap-7 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <p className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-[.18em] text-[#73c4ca]">CONTACT & SUPPORT</p>
              {editable ? field("contactHeadline") : <h2 id="contact-panel-title" className="mt-2 font-['Fraunces'] text-3xl text-[#e7f4f5]">{content.contactHeadline}</h2>}
              <div className="mt-3 font-['Poppins'] text-sm leading-7 text-[#a9c8cf]">{editable ? field("contactMessage") : <p>{content.contactMessage}</p>}</div>
              <Link to="/help" className="mt-5 inline-flex min-h-10 items-center rounded-xl bg-[#75bec4] px-4 py-2 font-['Poppins'] text-sm font-semibold text-[#052d45] no-underline transition hover:bg-[#91d2d5]">Open Help Center</Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <article className="rounded-2xl border border-sky-100/10 bg-white/[.04] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#73c4ca]">Email</p>
                <div className="mt-2 text-sm text-[#d9ecef]">{editable ? field("supportEmail") : content.supportEmail ? <a className="text-[#d9ecef] underline decoration-[#73c4ca]/60 underline-offset-4" href={`mailto:${content.supportEmail}`}>{content.supportEmail}</a> : <span>Contact your business owner</span>}</div>
              </article>
              <article className="rounded-2xl border border-sky-100/10 bg-white/[.04] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#73c4ca]">Phone</p>
                <div className="mt-2 text-sm text-[#d9ecef]">{editable ? field("supportPhone") : content.supportPhone ? <a className="text-[#d9ecef] underline decoration-[#73c4ca]/60 underline-offset-4" href={`tel:${content.supportPhone}`}>{content.supportPhone}</a> : <span>Not provided</span>}</div>
              </article>
              <article className="rounded-2xl border border-sky-100/10 bg-white/[.04] p-4 sm:col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#73c4ca]">Support hours</p>
                <div className="mt-2 text-sm text-[#d9ecef]">{editable ? field("supportHours") : content.supportHours || "Contact support for availability."}</div>
              </article>
            </div>
          </div>
        </section>
      )}

      {editable && <div className="sticky bottom-3 flex justify-end rounded-2xl border border-sky-100/10 bg-[#021d2e]/90 p-3 backdrop-blur"><button type="submit" disabled={saving} className="min-h-11 rounded-xl bg-[#75bec4] px-5 py-2.5 font-['Poppins'] text-sm font-semibold text-[#052d45] transition hover:bg-[#91d2d5] disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Saving…" : "Save About & Contact"}</button></div>}
    </form>
  );
}

export default AboutContactPanel;

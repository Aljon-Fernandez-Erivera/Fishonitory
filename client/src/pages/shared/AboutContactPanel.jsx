import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_URL } from "../../config.js";

const initialContent = {
  aboutEyebrow: "ABOUT FISHONITORY",
  aboutHeadline: "Clarity for every fish, tank, and sale.",
  aboutDescription:
    "Fishonitory helps ornamental fish businesses manage livestock, tanks, sales, staff, attendance, purchases, and business records in one workspace.",
  mission:
    "Give fish businesses a clear, dependable place to manage daily operations and make informed decisions.",
  vision:
    "Support healthier aquatic businesses with better visibility into the work behind every tank and sale.",
  contactHeadline: "How can we help?",
  contactMessage:
    "For account or workspace support, contact your business owner or the Fishonitory administrator.",
  supportEmail: "",
  supportPhone: "",
  supportHours: "",
};

const fieldMeta = {
  aboutEyebrow: ["About label", "text", 80, "e.g. ABOUT FISHONITORY"],
  aboutHeadline: [
    "About headline",
    "text",
    120,
    "A short headline about your business",
  ],
  aboutDescription: [
    "About description",
    "textarea",
    1200,
    "Describe what Fishonitory helps your business manage.",
  ],
  mission: ["Mission", "textarea", 600, "Describe your business mission."],
  vision: ["Vision", "textarea", 600, "Describe your business vision."],
  contactHeadline: ["Contact headline", "text", 120, "e.g. How can we help?"],
  contactMessage: [
    "Contact guidance",
    "textarea",
    600,
    "Tell users how to get support.",
  ],
  supportEmail: ["Support email", "email", 254, "support@example.com"],
  supportPhone: ["Support phone", "tel", 40, "+639171234567"],
  supportHours: ["Support hours", "text", 120, "e.g. Monday-Friday, 9 AM-5 PM"],
};

const inputClass =
  "w-full rounded-xl border border-sky-100/15 bg-[#062d48] px-3.5 py-3 font-['Poppins'] text-sm text-[#d9ecef] outline-none transition placeholder:text-[#719ba8] focus:border-[#73c4ca] focus:ring-2 focus:ring-[#73c4ca]/15";

function sanitizeContentInput(value, { multiline = false } = {}) {
  const normalized = value.normalize("NFKC").replace(/\r\n?/g, "\n");
  const withoutHiddenCharacters = Array.from(normalized)
    .filter((character) => {
      const code = character.codePointAt(0);
      return (
        code === 0x0a ||
        code === 0x09 ||
        (code >= 0x20 &&
          !(code >= 0x7f && code <= 0x9f) &&
          !(code >= 0x200b && code <= 0x200f) &&
          !(code >= 0x202a && code <= 0x202e) &&
          !(code >= 0x2060 && code <= 0x206f) &&
          code !== 0xfeff)
      );
    })
    .join("");
  return multiline
    ? withoutHiddenCharacters.replace(/[ \t]+/g, " ")
    : withoutHiddenCharacters.replace(/[\s\u00a0]+/g, " ");
}

function AboutContactPanel({ section = "all", editable = false, onSave }) {
  const [content, setContent] = useState(initialContent);
  const [savedContent, setSavedContent] = useState(initialContent);
  const [saved, setSaved] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!saved) return undefined;
    const timer = window.setTimeout(() => setSaved(""), 4000);
    return () => window.clearTimeout(timer);
  }, [saved]);

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/site-content`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(
            data.message || "Could not load company information.",
          );
        if (active) {
          const loadedContent = { ...initialContent, ...(data.content || {}) };
          setContent(loadedContent);
          setSavedContent(loadedContent);
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const aboutVisible = section === "about" || section === "all";
  const contactVisible = section === "contact" || section === "all";
  const hasChanges = Object.keys(initialContent).some(
    (key) => content[key] !== savedContent[key],
  );
  const update = (key, value) => {
    const [, type] = fieldMeta[key];
    let sanitized = sanitizeContentInput(value, {
      multiline: type === "textarea",
    });
    if (key === "supportEmail") sanitized = sanitized.trim().toLowerCase();
    if (key === "supportPhone")
      sanitized = sanitized.replace(/[^+\d().\-\s]/g, "");
    setContent((current) => ({ ...current, [key]: sanitized }));
  };

  const save = async (event) => {
    event.preventDefault();
    if (!editable || !onSave || !hasChanges) return;
    if (
      !content.aboutHeadline.trim() ||
      !content.aboutDescription.trim() ||
      !content.contactHeadline.trim() ||
      !content.contactMessage.trim()
    ) {
      setError(
        "About headline, description, contact headline, and contact guidance are required.",
      );
      return;
    }
    if (
      content.supportEmail &&
      !/^(?=.{1,254}$)(?=.{1,64}@)[A-Z0-9!#$%&'*+/=?^_`{|}~.-]+@(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,63}$/i.test(
        content.supportEmail,
      )
    ) {
      setError("Enter a valid support email address.");
      return;
    }
    if (
      content.supportPhone &&
      (!/^[+\d().\-\s]+$/.test(content.supportPhone) ||
        content.supportPhone.replace(/\D/g, "").length < 7)
    ) {
      setError("Enter a valid support phone number.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await onSave(content);
      const nextContent = {
        ...initialContent,
        ...(result?.content || content),
      };
      setContent(nextContent);
      setSavedContent(nextContent);
      setSaved(result?.message || "Changes saved.");
    } catch (requestError) {
      setError(requestError.message || "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  // hideLabel: keep the label for screen readers only (used inside cards that
  // already show a visible title, so the text isn't repeated).
  const field = (key, { hideLabel = false } = {}) => {
    const [label, type, maxLength, placeholder] = fieldMeta[key];
    const spacing = hideLabel ? "" : "mt-1.5";
    return (
      <label
        key={key}
        className="block font-['Poppins'] text-xs font-medium text-[#a9c8cf]"
      >
        <span className={hideLabel ? "sr-only" : ""}>{label}</span>
        {type === "textarea" ? (
          <textarea
            rows={key === "aboutDescription" ? 4 : 3}
            maxLength={maxLength}
            placeholder={placeholder}
            value={content[key]}
            onChange={(event) => update(key, event.target.value)}
            readOnly={!editable}
            className={`${spacing} ${inputClass} resize-y leading-6 read-only:border-transparent read-only:bg-white/[.025] read-only:px-0 read-only:focus:ring-0`}
          />
        ) : (
          <input
            type={type}
            maxLength={maxLength}
            placeholder={placeholder}
            value={content[key]}
            onChange={(event) => update(key, event.target.value)}
            readOnly={!editable}
            className={`${spacing} ${inputClass} read-only:border-transparent read-only:bg-transparent read-only:px-0 read-only:focus:ring-0`}
          />
        )}
      </label>
    );
  };

  if (loading)
    return (
      <div className="w-full max-w-7xl animate-pulse rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-8 text-sm text-[#9bbec7]">
        Loading Fishonitory information…
      </div>
    );

  return (
    <form onSubmit={save} className="w-full max-w-7xl space-y-6">
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200/25 bg-red-200/10 px-4 py-3 text-sm text-red-100"
        >
          {error}
        </p>
      )}
      {saved && (
        <div
          className="app-notification-toast app-notification-toast--success"
          role="status"
          aria-live="polite"
        >
          <span className="app-notification-toast__icon" aria-hidden="true">
            {"\u2713"}
          </span>
          <span>{saved}</span>
        </div>
      )}
      {aboutVisible && (
        <section
          aria-labelledby="about-panel-title"
          className="overflow-hidden rounded-3xl border border-sky-100/10 bg-[radial-gradient(circle_at_90%_10%,rgba(115,196,202,.17),transparent_38%),linear-gradient(135deg,rgba(6,45,72,.96),rgba(3,30,50,.92))] shadow-[0_20px_55px_rgba(0,12,31,.2)]"
        >
          <div
            className={`grid gap-8 p-6 sm:p-9 lg:p-11 ${
              editable ? "lg:grid-cols-2" : "lg:grid-cols-[1.15fr_.85fr]"
            }`}
          >
            <div>
              <p
                className={`font-['Poppins'] text-[10px] font-semibold uppercase tracking-[.2em] text-[#73c4ca] ${
                  editable ? "mb-4" : ""
                }`}
              >
                {editable ? "About section" : content.aboutEyebrow}
              </p>
              {editable ? (
                <div className="space-y-3">
                  {field("aboutEyebrow")}
                  {field("aboutHeadline")}
                  {field("aboutDescription")}
                </div>
              ) : (
                <>
                  <h2
                    id="about-panel-title"
                    className="mt-4 max-w-2xl font-['Fraunces'] text-3xl leading-tight text-[#e7f4f5] sm:text-4xl"
                  >
                    {content.aboutHeadline}
                  </h2>
                  <p className="mt-5 max-w-2xl font-['Poppins'] text-sm leading-7 text-[#a9c8cf]">
                    {content.aboutDescription}
                  </p>
                </>
              )}
              {!editable && (
                <div className="mt-7 flex flex-wrap gap-2">
                  {[
                    "Tank & livestock records",
                    "Sales & inventory",
                    "Staff operations",
                  ].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-sky-100/15 bg-white/[.04] px-3 py-1.5 font-['Poppins'] text-[11px] text-[#c9e1e5]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <article className="rounded-2xl border border-sky-100/10 bg-white/[.045] p-5">
                <p className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-[.16em] text-[#73c4ca]">
                  Our mission
                </p>
                <div className="mt-3 font-['Poppins'] text-sm leading-6 text-[#c9e1e5]">
                  {editable ? (
                    field("mission", { hideLabel: true })
                  ) : (
                    <p>{content.mission}</p>
                  )}
                </div>
              </article>
              <article className="rounded-2xl border border-sky-100/10 bg-white/[.045] p-5">
                <p className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-[.16em] text-[#73c4ca]">
                  Our vision
                </p>
                <div className="mt-3 font-['Poppins'] text-sm leading-6 text-[#c9e1e5]">
                  {editable ? (
                    field("vision", { hideLabel: true })
                  ) : (
                    <p className="whitespace-pre-line">{content.vision}</p>
                  )}
                </div>
              </article>
            </div>
          </div>
        </section>
      )}

      {contactVisible && (
        <section
          aria-labelledby="contact-panel-title"
          className="rounded-3xl border border-sky-100/10 bg-[#062d48]/75 p-6 shadow-[0_18px_45px_rgba(0,12,31,.17)] sm:p-8"
        >
          <div
            className={`grid gap-7 ${
              editable ? "lg:grid-cols-2" : "lg:grid-cols-[.8fr_1.2fr]"
            }`}
          >
            <div>
              <p
                className={`font-['Poppins'] text-[10px] font-semibold uppercase tracking-[.18em] text-[#73c4ca] ${
                  editable ? "mb-3" : ""
                }`}
              >
                CONTACT & SUPPORT
              </p>
              {editable ? (
                field("contactHeadline")
              ) : (
                <h2
                  id="contact-panel-title"
                  className="mt-2 font-['Fraunces'] text-3xl text-[#e7f4f5]"
                >
                  {content.contactHeadline}
                </h2>
              )}
              <div className="mt-3 font-['Poppins'] text-sm leading-7 text-[#a9c8cf]">
                {editable ? (
                  field("contactMessage")
                ) : (
                  <p>{content.contactMessage}</p>
                )}
              </div>
              {!editable && (
                <Link
                  to="/help"
                  className="mt-5 inline-flex min-h-10 items-center rounded-xl bg-[#75bec4] px-4 py-2 font-['Poppins'] text-sm font-semibold text-[#052d45] no-underline transition hover:bg-[#91d2d5]"
                >
                  Open Help Center
                </Link>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <article className="rounded-2xl border border-sky-100/10 bg-white/[.04] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#73c4ca]">
                  Email
                </p>
                <div className="mt-2 text-sm text-[#d9ecef]">
                  {editable ? (
                    field("supportEmail", { hideLabel: true })
                  ) : content.supportEmail ? (
                    <a
                      className="text-[#d9ecef] underline decoration-[#73c4ca]/60 underline-offset-4"
                      href={`mailto:${content.supportEmail}`}
                    >
                      {content.supportEmail}
                    </a>
                  ) : (
                    <span>Contact your business owner</span>
                  )}
                </div>
              </article>
              <article className="rounded-2xl border border-sky-100/10 bg-white/[.04] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#73c4ca]">
                  Phone
                </p>
                <div className="mt-2 text-sm text-[#d9ecef]">
                  {editable ? (
                    field("supportPhone", { hideLabel: true })
                  ) : content.supportPhone ? (
                    <a
                      className="text-[#d9ecef] underline decoration-[#73c4ca]/60 underline-offset-4"
                      href={`tel:${content.supportPhone}`}
                    >
                      {content.supportPhone}
                    </a>
                  ) : (
                    <span>Not provided</span>
                  )}
                </div>
              </article>
              <article className="rounded-2xl border border-sky-100/10 bg-white/[.04] p-4 sm:col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#73c4ca]">
                  Support hours
                </p>
                <div className="mt-2 text-sm text-[#d9ecef]">
                  {editable
                    ? field("supportHours", { hideLabel: true })
                    : content.supportHours ||
                      "Contact support for availability."}
                </div>
              </article>
            </div>
          </div>
        </section>
      )}

      {editable && (
        <div className="sticky bottom-3 z-10 flex items-center justify-between gap-3 rounded-2xl border border-sky-100/10 bg-[#021d2e]/90 p-3 backdrop-blur">
          <p
            aria-live="polite"
            className="m-0 font-['Poppins'] text-xs text-[#9bbec7]"
          >
            {hasChanges ? "You have unsaved changes." : "All changes saved."}
          </p>
          <button
            type="submit"
            disabled={saving || !hasChanges}
            className="min-h-11 rounded-xl bg-[#75bec4] px-5 py-2.5 font-['Poppins'] text-sm font-semibold text-[#052d45] transition hover:bg-[#91d2d5] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save About & Contact"}
          </button>
        </div>
      )}
    </form>
  );
}

export default AboutContactPanel;

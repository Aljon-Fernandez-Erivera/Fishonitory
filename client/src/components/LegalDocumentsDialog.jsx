function LegalDocumentsDialog({ activeDocument, onChangeDocument, onClose }) {
  if (!activeDocument) return null;

  const isTerms = activeDocument === "terms";

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-[#021a31]/80 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-labelledby="legal-document-title"
        aria-modal="true"
        className="flex max-h-[min(85dvh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-sky-100/15 bg-[#062d48] text-[#d9ecef] shadow-2xl"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-sky-100/10 px-5 py-4 sm:px-6">
          <div>
            <p className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#73c4ca]">
              Fishonitory · Registration
            </p>
            <h2 id="legal-document-title" className="m-0 mt-1 font-['Fraunces'] text-2xl font-medium text-[#d9ecef]">
              {isTerms ? "Terms of Service" : "Privacy Policy"}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close legal information"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-sky-100/10 bg-white/[.04] text-[#a9c8cf] transition hover:bg-white/[.1] hover:text-white"
          >
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="m18 6-12 12M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex gap-2 border-b border-sky-100/10 px-5 py-3 sm:px-6">
          <button
            type="button"
            aria-pressed={isTerms}
            onClick={() => onChangeDocument("terms")}
            className={`rounded-lg px-3 py-2 font-['Poppins'] text-xs font-medium ${isTerms ? "bg-[#367078] text-white" : "text-[#9bbec7] hover:bg-white/[.05]"}`}
          >
            Terms
          </button>
          <button
            type="button"
            aria-pressed={!isTerms}
            onClick={() => onChangeDocument("privacy")}
            className={`rounded-lg px-3 py-2 font-['Poppins'] text-xs font-medium ${!isTerms ? "bg-[#367078] text-white" : "text-[#9bbec7] hover:bg-white/[.05]"}`}
          >
            Privacy
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 font-['Poppins'] text-sm leading-6 text-[#c2d9de] sm:px-6">
          {isTerms ? (
            <div className="space-y-5">
              <section>
                <h3 className="mb-1 font-semibold text-white">Using Fishonitory</h3>
                <p>Provide accurate business and account information. You are responsible for activity performed by accounts you authorize for your business and for protecting their sign-in credentials.</p>
              </section>
              <section>
                <h3 className="mb-1 font-semibold text-white">Business records</h3>
                <p>Inventory, attendance, mortality, purchases, sales, and payroll entries affect business records and stock totals. Review entries before submitting. Keep any external records needed for accounting, regulatory, or animal-health decisions.</p>
              </section>
              <section>
                <h3 className="mb-1 font-semibold text-white">Acceptable use and availability</h3>
                <p>Use the service only for authorized business operations. We may restrict access to protect accounts or data. The service may be unavailable during maintenance or interruptions; maintain appropriate business backups.</p>
              </section>
              <p className="border-t border-sky-100/10 pt-4 text-xs text-[#8fb7be]">This project document is a product-use notice, not legal advice. Have it reviewed for your organization before production use.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <section>
                <h3 className="mb-1 font-semibold text-white">Information collected</h3>
                <p>Registration collects owner and business details, contact information, the typed business address, the selected map coordinates, and the uploaded business permit. Authorized users may add operational records, including attendance, inventory, mortality reports and photos, purchases, sales, and payroll.</p>
              </section>
              <section>
                <h3 className="mb-1 font-semibold text-white">How information is used</h3>
                <p>Information is used to operate the workspace, verify business registrations, maintain stock and activity records, provide reports, and protect the service. Business owners and authorized staff can access records according to their roles; administrators review registration documents.</p>
              </section>
              <section>
                <h3 className="mb-1 font-semibold text-white">Service providers and retention</h3>
                <p>The service uses hosting, database, email, and file-storage providers to deliver these features. Map tiles and reverse-address lookup are provided by OpenStreetMap services when you use the location picker. Operational records are retained to support business history and audit needs.</p>
              </section>
              <section>
                <h3 className="mb-1 font-semibold text-white">Questions or requests</h3>
                <p>Contact your business owner or the Fishonitory administrator to request help with account information or stored records. Do not upload information that is not needed for operating your business.</p>
              </section>
              <p className="border-t border-sky-100/10 pt-4 text-xs text-[#8fb7be]">This project document describes current app behavior and is not legal advice. Review it against applicable privacy requirements before production use.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default LegalDocumentsDialog;
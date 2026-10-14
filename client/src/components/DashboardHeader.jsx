function DashboardHeader({ title, currentTime, syncing = false, children }) {
  return (
    <header className="relative z-30 flex w-full shrink-0 flex-wrap items-start justify-between gap-3 border-b border-sky-100/10 bg-[#021d2e] px-4 py-4 sm:px-5 lg:px-5 lg:py-5">
      <div className="pl-14 md:pl-0">
        <p className="font-['Poppins'] text-[0.65rem] font-medium tracking-[0.16em] text-[#73c4ca]">
          {title}
        </p>
        <p className="mt-1 font-['Poppins'] text-xs text-[#759faa]">
          {currentTime.toLocaleDateString("en-PH", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      <div className="flex w-full shrink-0 items-center justify-between gap-2 sm:w-auto sm:justify-end">
        <span className="inline-flex items-center gap-2 rounded-full border border-sky-100/10 bg-white/[.04] px-3 py-1.5 font-['Poppins'] text-xs text-[#a8c9d0]">
          <span
            className={`h-1.5 w-1.5 rounded-full bg-[#73c4ca] shadow-[0_0_10px_#73c4ca] ${syncing ? "animate-pulse" : ""}`}
          />
          {syncing ? "Syncing..." : "System online"}
          <span aria-hidden="true">·</span>
          {currentTime.toLocaleTimeString("en-PH", {
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
        {children}
      </div>
    </header>
  );
}

export default DashboardHeader;


import {
  LayoutDashboard, Building2, Users, ScrollText, Settings,
  UserCog, Package, ShoppingCart, CalendarCheck, Wallet, Droplets,
  Fish, Megaphone, ClipboardList, ShieldCheck, Clock3, HeartPulse,
  Calculator, StickyNote,
} from "lucide-react";

const icons = {
  overview: LayoutDashboard,
  pending: ShieldCheck,
  businesses: Building2,
  accounts: Users,
  logs: ScrollText,
  "platform-notices": Megaphone,
  settings: Settings,
  staff: UserCog,
  inventory: Package,
  sales: ShoppingCart,
  attendance: CalendarCheck,
  payroll: Wallet,
  tanks: Droplets,
  fish: Fish,
  notes: Megaphone,
  announcements: Megaphone,
  operations: ClipboardList,
  orders: ClipboardList,
  "time-clock": Clock3,
  mortality: HeartPulse,
  calculator: Calculator,
  "leave-note": StickyNote,
};

function DashboardSidebar({
  sidebarOpen,
  onToggle,
  onClose,
  activePage,
  onNavigate,
  groups,
  navigationLabel,
  brandSubtitle,
  refreshLabel,
  identity,
  onIdentityClick,
  onLogout,
  thinScrollbar = true,
}) {

  const navClassName = `mt-4 flex min-w-0 gap-0.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mt-6 md:min-h-0 md:flex-1 md:flex-col md:overflow-y-auto md:overflow-x-hidden md:pr-1${thinScrollbar ? " [scrollbar-width:thin]" : ""}`;

  const renderItem = ({ page, label, badge }) => {
  const Icon = icons[page];
  return (
    <button
      key={page}
      className={`dashboard-nav-link ${activePage === page ? "is-active" : ""}`}
      type="button"
      aria-current={activePage === page ? "page" : undefined}
      onClick={() => onNavigate(page)}
    >
      <span className="dashboard-nav-icon" aria-hidden="true">
        {Icon ? <Icon size={18} strokeWidth={1.75} /> : "•"}
      </span>
      {label}
      {badge}
    </button>
  );
};

  return (
    <>
      <button
        type="button"
        aria-label={sidebarOpen ? "Close dashboard menu" : "Open dashboard menu"}
        aria-expanded={sidebarOpen}
        className={`owner-mobile-menu-toggle ${sidebarOpen ? "is-open" : ""}`}
        onClick={onToggle}
      >
        <span />
        <span />
        <span />
      </button>

      <div
        className={`owner-mobile-backdrop ${sidebarOpen ? "is-visible" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`owner-sidebar box-border flex w-full shrink-0 flex-col overflow-hidden border-b border-cyan-100/[.08] bg-[#021d2e] px-4 py-3 md:h-full md:w-56 md:border-b-0 md:border-r md:px-3 md:pt-4 md:pb-4 ${sidebarOpen ? "is-open" : ""}`}
      >
        <button
          type="button"
          onClick={() => window.location.reload()}
          aria-label={refreshLabel}
          title="Refresh dashboard"
          className="cursor-pointer flex shrink-0 items-center gap-2.5 rounded-lg border-0 bg-transparent px-1 py-1 text-left transition hover:bg-white/[.04] focus:outline-none focus:ring-2 focus:ring-[#73c4ca]"
        >
          <img src="/LOGO.svg" alt="Fishonitory" className="h-10 w-10 object-contain" />
          <div>
            <strong className="block font-['Poppins'] text-[0.9rem] font-medium text-[#cde4e6]">
              Fishonitory
            </strong>
            <small className="block font-['Poppins'] text-[0.7rem] text-[#8fb3ba]">
              {brandSubtitle}
            </small>
          </div>
        </button>

        <nav
          className={navClassName}
          aria-label={navigationLabel}
        >
          {groups.map((group, groupIndex) => {
            const items = group.items.map(renderItem);
            if (!group.title) return <div className="contents" key={`ungrouped-${groupIndex}`}>{items}</div>;
            return (
              <div className="contents md:block" key={group.title}>
                <div className="hidden px-3 pb-1.5 pt-4 md:block">
                  <p className="m-0 font-['Poppins'] text-[0.60rem] font-semibold uppercase tracking-[.14em] text-[#8fc5cb]">
                    {group.title}
                  </p>
                </div>
                <div className="contents md:flex md:flex-col md:gap-0.5 md:pl-3">
                  {items}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="mt-auto shrink-0 border-t border-cyan-100/[.08] pt-2.5 pb-0.5 md:pt-3 md:pb-1">
          <div
            className={`flex items-center gap-2.5 rounded-lg p-1.5 ${onIdentityClick ? "cursor-pointer transition hover:bg-white/[.04]" : ""}`}
            onClick={onIdentityClick}
            title={onIdentityClick ? "Open Settings" : undefined}
            role={onIdentityClick ? "button" : undefined}
            tabIndex={onIdentityClick ? 0 : undefined}
            onKeyDown={onIdentityClick ? (event) => {
              if (event.key === "Enter" || event.key === " ") onIdentityClick();
            } : undefined}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#75bec4]/20 font-['Poppins'] text-sm font-semibold text-[#bce9e9]">
              {(identity.avatar || "U").trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-['Poppins'] text-[0.78rem] font-medium text-[#cde4e6]">
                {identity.title}
              </p>
              <p className="truncate font-['Poppins'] text-[0.7rem] text-[#8fb3ba]" aria-live={identity.loading ? "polite" : undefined}>
                {identity.loading ? <><span>Updating name</span><span className="profile-sync-dots"> . . .</span></> : identity.subtitle}
              </p>
            </div>
          </div>
          <button
            className="mt-2.5 w-full rounded-lg border border-cyan-100/10 bg-white/[.05] px-3 py-2 text-center font-['Poppins'] text-[0.75rem] font-medium text-[#b8d8dd] outline-none transition hover:border-red-200/25 hover:bg-red-200/10 hover:text-red-100 focus:ring-2 focus:ring-[#73c4ca]/50 cursor-pointer"
            type="button"
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

export default DashboardSidebar;

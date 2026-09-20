import { useEffect, useMemo, useState } from "react";

const todayKey = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

const READ_STORAGE_KEY = "fishonitory-read-notifications";

const announcementAuthor = (note) => {
  const author = note.authorId || {};
  const name = author.ownerName || author.staffName || "Unknown author";
  const role = author.role === "Owner" ? "Owner" : author.staffPosition || "Staff";
  return `${name} · ${role}`;
};

function NotificationBell({
  notes = [],
  fish = [],
  tanks = [],
  attendance = [],
  onNavigate,
  announcementPage = "notes",
  viewerRole = "",
  viewerId = "",
}) {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(READ_STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(readIds.slice(-100)));
  }, [readIds]);

  const notifications = useMemo(() => {
    const items = [];
    notes
      .filter((note) => {
        const author = note.authorId || {};
        const authorId = String(author._id || author || "");
        if (viewerRole === "Owner") return author.role !== "Owner" && authorId !== String(viewerId);
        if (viewerRole === "masterStaff") return author.role === "Owner";
        return authorId !== String(viewerId);
      })
      .filter((note) => note.pinned || !note.resolved)
      .slice(0, 4)
      .forEach((note) =>
        items.push({
          id: `announcement-${note._id}`,
          title: announcementAuthor(note),
          body: note.text,
          page: announcementPage,
        }),
      );
    fish
      .filter((item) => Number(item.quantity) <= 5)
      .forEach((item) =>
        items.push({
          id: `stock-${item._id}`,
          title: "Low stock",
          body: `${item.name}: ${item.quantity} remaining`,
          page: "inventory",
        }),
      );
    tanks
      .filter(
        (tank) =>
          tank.nextMaintenance &&
          new Date(tank.nextMaintenance) <= new Date(Date.now() + 7 * 86400000),
      )
      .forEach((tank) =>
        items.push({
          id: `tank-${tank._id}`,
          title: "Maintenance due",
          body: `${tank.name} is due for maintenance soon.`,
          page: "tanks",
        }),
      );
    if (attendance.length) {
      const checkedIn = attendance.filter(
        (record) =>
          record.dateKey === todayKey() &&
          ["Present", "Late"].includes(record.status),
      ).length;
      items.push({
        id: "attendance-today",
        title: "Today's attendance",
        body: `${checkedIn} team member${checkedIn === 1 ? "" : "s"} checked in.`,
        page: "attendance",
      });
    }
    return items.slice(0, 8);
  }, [notes, fish, tanks, attendance, announcementPage]);
  const unreadCount = notifications.filter((item) => !readIds.includes(item.id)).length;

  const openNotification = (item) => {
    setReadIds((current) => (current.includes(item.id) ? current : [...current, item.id]));
    setOpen(false);
    onNavigate(item.page);
  };

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label="Open notifications"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative grid h-9 w-9 place-items-center rounded-full border border-sky-100/10 bg-white/[.04] text-[#c9e1e5] transition hover:bg-white/[.1]"
      >
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V10a6 6 0 1 0-12 0v4.2c0 .53-.21 1.04-.59 1.42L4 17h5m2 0v1a2 2 0 0 1-4 0v-1m4 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-[#6caeb3]" />
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-40 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-sky-100/15 bg-[#062d48] shadow-2xl">
          <div className="border-b border-sky-100/10 px-4 py-3 font-['Poppins'] text-xs font-semibold text-[#d9ecef]">
            Notifications
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length ? (
              notifications.map((item) => {
                const unread = !readIds.includes(item.id);
                return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openNotification(item)}
                  className={`relative block w-full border-b border-sky-100/[.06] px-4 py-3 text-left transition hover:bg-white/[.06] ${unread ? "bg-[#6caeb3]/[.08]" : "bg-transparent"}`}
                >
                  {unread && <span className="absolute right-4 top-4 h-2 w-2 rounded-full bg-[#6caeb3]" aria-label="Unread" />}
                  <strong className="block font-['Poppins'] text-xs text-[#d9ecef]">
                    {item.title}
                  </strong>
                  {item.author && <span className="mt-1 block font-['Poppins'] text-xs font-medium text-[#b9dfe1]">{item.author}</span>}
                  <span className="mt-1 block line-clamp-2 font-['Poppins'] text-xs text-[#9bbec7]">
                    {item.body}
                  </span>
                </button>
                );
              })
            ) : (
              <p className="px-4 py-6 font-['Poppins'] text-xs text-[#9bbec7]">
                You are all caught up.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;

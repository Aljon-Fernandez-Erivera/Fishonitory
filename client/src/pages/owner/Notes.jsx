import { useState, useRef, useEffect, useMemo } from "react";
import { confirmOceanicAction, oceanicFire } from "../../utils/oceanicSwal.js";

const MAX_NOTE_LENGTH = 1000;
const NOTE_CHARS_PER_LINE = 90;

const idOf = (value) =>
  value && value._id ? String(value._id) : String(value ?? "");

const authorLabel = (note) => {
  const author = note.authorId || {};
  const name = author.staffName || author.ownerName || "Unknown sender";
  const role =
    author.role === "Owner"
      ? "Owner"
      : author.role === "masterStaff"
        ? "Master Staff"
        : "Staff";
  return { name, role, position: author.staffPosition || "" };
};

const formatDateTime = (value) => {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
};

const isOverdue = (item) => {
  if (!item.isTask || !item.dueDate || item.taskStatus === "done") return false;
  const due = new Date(item.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
};

/* ---------- small icons ---------- */

function PlusIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function CloseIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function PinIcon({ className = "h-3 w-3" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
    >
      <path d="M14.5 3.5 20.5 9.5l-2 .8-3.3 3.3.3 4.4-1.4 1.4-3.2-4.3-4.6 4.6-1-1 4.6-4.6L5.6 11l1.4-1.4 4.4.3 3.3-3.3.8-2.1Z" />
    </svg>
  );
}

function CalendarIcon({ className = "h-3.5 w-3.5" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}

function PersonIcon({ className = "h-3.5 w-3.5" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.8-3.6 3.5-5.5 7-5.5s6.2 1.9 7 5.5" />
    </svg>
  );
}

/* ---------- note actions menu ---------- */

function EditIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17l-1 3Z" />
      <path d="m14.5 7.5 3 3" />
    </svg>
  );
}

function CheckCircleIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12.3 2.4 2.4 4.6-4.9" />
    </svg>
  );
}

function TrashIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 7h15M10 11v6M14 11v6" />
      <path d="M6.5 7l.8 11.2a2 2 0 0 0 2 1.8h5.4a2 2 0 0 0 2-1.8L17.5 7" />
      <path d="M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

const MENU_ITEM =
  "group flex w-full items-center gap-2.5 rounded-lg bg-transparent px-2.5 py-2 text-left font-['Poppins'] text-[0.8rem] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#73c4ca]/50";

function NoteActionsMenu({ item, onUpdateNote, edit, remove, perms }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const isAuthor = idOf(item.authorId) === perms.userId;
  const canEdit = isAuthor || perms.canModerate;

  const actions = [
    canEdit && {
      label: "Edit",
      icon: EditIcon,
      onClick: () => edit(item),
    },
    perms.canModerate && {
      label: item.pinned ? "Unpin" : "Pin to top",
      icon: PinIcon,
      onClick: () => onUpdateNote(item._id, { pinned: !item.pinned }),
    },
    item.isTask && {
      label: item.resolved ? "Mark unresolved" : "Mark resolved",
      icon: CheckCircleIcon,
      onClick: () => onUpdateNote(item._id, { resolved: !item.resolved }),
    },
  ].filter(Boolean);

  if (!actions.length && !canEdit) return null;

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        aria-label="Note actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={`grid h-8 w-8 place-items-center rounded-lg transition ${
          open
            ? "bg-[#73c4ca]/15 text-white"
            : "bg-transparent text-[#a9c8cf] hover:bg-white/10 hover:text-white"
        }`}
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1.5 w-48 rounded-xl bg-[#0a3d59] p-1.5 shadow-xl shadow-black/40"
        >
          {actions.map(({ label, icon: Icon, onClick }) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onClick();
              }}
              className={`${MENU_ITEM} text-[#d9ecef] hover:bg-white/[.08] hover:text-white`}
            >
              <Icon className="h-4 w-4 shrink-0 text-[#8fb3ba] transition group-hover:text-[#73c4ca]" />
              {label}
            </button>
          ))}

          {canEdit && (
            <>
              {actions.length > 0 && (
                <div className="mx-2 my-1.5 h-px bg-white/10" />
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  remove(item);
                }}
                className={`${MENU_ITEM} text-red-300 hover:bg-red-400/15 hover:text-red-100`}
              >
                <TrashIcon className="h-4 w-4 shrink-0" />
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- a single announcement / task card ---------- */

function NoteItem({ item, onUpdateNote, edit, remove, perms }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const text = item.text || "";
  const lineBreaks = (text.match(/\n/g) || []).length;
  const isLongNote = text.length > NOTE_CHARS_PER_LINE * 2 || lineBreaks >= 2;
  const author = authorLabel(item);
  const done = item.isTask && item.taskStatus === "done";
  const overdue = isOverdue(item);

  return (
    <li
      className={`relative rounded-2xl bg-[#062d48]/80 p-4 transition-colors hover:bg-[#07365a]/90 sm:p-5 ${
        item.resolved ? "opacity-60" : ""
      }`}
    >
      {item.pinned && (
        <span
          aria-hidden="true"
          className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-amber-300/70"
        />
      )}

      <div className="flex items-start gap-3 sm:gap-4">
        <span
          aria-hidden="true"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#73c4ca]/15 font-['Poppins'] text-sm font-semibold text-[#bce9e9]"
        >
          {author.name.trim().charAt(0).toUpperCase() || "?"}
        </span>

        <div className="min-w-0 flex-1">
          {/* who + when */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-['Poppins']">
            <span className="text-sm font-semibold text-[#e3f2f4]">
              {author.name}
            </span>
            <span className="rounded-full bg-white/[.07] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#9fc5cc]">
              {author.role}
            </span>
            {author.position && author.role !== "Owner" && (
              <span className="text-xs text-[#8fb3ba]">{author.position}</span>
            )}
            <span aria-hidden="true" className="text-xs text-[#6f929c]">
              ·
            </span>
            <time
              className="text-xs text-[#8fb3ba]"
              dateTime={item.createdAt || undefined}
            >
              {formatDateTime(item.createdAt)}
            </time>
          </div>

          {/* badges */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {item.pinned && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 font-['Poppins'] text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200">
                <PinIcon />
                Pinned
              </span>
            )}
            {item.isTask && (
              <span className="rounded-full bg-sky-400/15 px-2 py-0.5 font-['Poppins'] text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-200">
                Task
              </span>
            )}
            {item.visibility === "private" ? (
              <span className="rounded-full bg-rose-500/15 px-2 py-0.5 font-['Poppins'] text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-200">
                Only me
              </span>
            ) : (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-['Poppins'] text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-200">
                All staff
              </span>
            )}
            {item.isTask && (
              <button
                type="button"
                aria-pressed={done}
                title={done ? "Mark as pending" : "Mark as done"}
                onClick={() =>
                  onUpdateNote(item._id, {
                    taskStatus: done ? "pending" : "done",
                  })
                }
                className={`rounded-full px-2 py-0.5 font-['Poppins'] text-[10px] font-semibold uppercase tracking-[0.12em] transition ${
                  done
                    ? "bg-emerald-400/20 text-emerald-200 hover:bg-emerald-400/30"
                    : "bg-amber-400/15 text-amber-200 hover:bg-amber-400/25"
                }`}
              >
                {done ? "Done" : "Pending"}
              </button>
            )}
          </div>

          {/* body */}
          <p
            className={`m-0 mt-3 whitespace-pre-wrap break-words font-['Poppins'] text-sm leading-6 text-[#d9ecef] ${
              item.resolved ? "line-through" : ""
            } ${!isExpanded && isLongNote ? "line-clamp-2" : ""}`}
          >
            {text}
          </p>

          {isLongNote && (
            <button
              type="button"
              aria-expanded={isExpanded}
              className="mt-1 border-0 bg-transparent p-0 font-['Poppins'] text-xs font-semibold text-[#73c4ca] hover:underline"
              onClick={() => setIsExpanded((prev) => !prev)}
            >
              {isExpanded ? "Show less" : "Read more"}
            </button>
          )}

          {/* task details */}
          {item.isTask && (item.dueDate || item.assignedTo) && (
            <div className="mt-3 flex flex-wrap gap-2 font-['Poppins'] text-xs">
              {item.dueDate && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 ${
                    overdue
                      ? "bg-red-400/15 text-red-200"
                      : "bg-white/[.06] text-[#b0cbd1]"
                  }`}
                >
                  <CalendarIcon />
                  {overdue ? "Overdue · " : "Due "}
                  {formatDate(item.dueDate)}
                </span>
              )}
              {item.assignedTo && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/[.06] px-2.5 py-1 text-[#b0cbd1]">
                  <PersonIcon />
                  {item.assignedTo.staffName}
                </span>
              )}
            </div>
          )}
        </div>

        <NoteActionsMenu
          item={item}
          onUpdateNote={onUpdateNote}
          edit={edit}
          remove={remove}
          perms={perms}
        />
      </div>
    </li>
  );
}

/* ---------- page ---------- */

const FILTERS = [
  { value: "all", label: "All" },
  { value: "announcements", label: "Announcements" },
  { value: "tasks", label: "Tasks" },
];

function Notes({
  notes = [],
  staff = [],
  permissions = { canModerate: false, userId: "" },
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  showComposer = true,
}) {
  const [note, setNote] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [isTask, setIsTask] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [filter, setFilter] = useState("all");

  const perms = useMemo(
    () => ({
      canModerate: Boolean(permissions.canModerate),
      userId: String(permissions.userId ?? ""),
    }),
    [permissions.canModerate, permissions.userId],
  );

  const trimmed = note.trim();
  const overLimit = note.length > MAX_NOTE_LENGTH;
  const canPost = Boolean(trimmed) && !overLimit;

  const taskCount = notes.filter((item) => item.isTask).length;
  const counts = {
    all: notes.length,
    announcements: notes.length - taskCount,
    tasks: taskCount,
  };

  // Pinned items first; everything else keeps the order the server sent.
  const visibleNotes = useMemo(() => {
    const filtered = notes.filter((item) =>
      filter === "tasks"
        ? item.isTask
        : filter === "announcements"
          ? !item.isTask
          : true,
    );
    return [...filtered].sort(
      (a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)),
    );
  }, [notes, filter]);

  // Close the composer with Escape (the draft is kept).
  useEffect(() => {
    if (!composerOpen) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setComposerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [composerOpen]);

  const resetComposer = () => {
    setNote("");
    setIsTask(false);
    setVisibility("public");
    setDueDate("");
    setAssignedTo("");
  };

  const handleAddNote = (event) => {
    event?.preventDefault();
    if (!canPost) return;
    onAddNote({
      text: trimmed,
      visibility,
      isTask,
      taskStatus: isTask ? "pending" : undefined,
      dueDate: isTask ? dueDate || null : null,
      assignedTo: isTask ? assignedTo || null : null,
    });
    resetComposer();
    setComposerOpen(false);
  };

  // Plain Enter is left alone on purpose - it inserts a newline.
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleAddNote(e);
  };

  const edit = async (item) => {
    const result = await oceanicFire({
      title: "Edit note",
      input: "textarea",
      inputValue: item.text,
      inputAttributes: { maxlength: String(MAX_NOTE_LENGTH) },
      showCancelButton: true,
      confirmButtonText: "Save",
    });
    if (result.isConfirmed && result.value?.trim())
      onUpdateNote(item._id, { text: result.value.trim() });
  };

  const remove = async (item) => {
    const result = await confirmOceanicAction({
      title: "Delete note?",
      text: "This cannot be undone.",
      confirmText: "Delete",
      tone: "danger",
    });
    if (result) onDeleteNote(item._id);
  };

  const activeStaff = staff.filter((member) => member.accountStatus === "Active");

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-5">
      {/* HEADER: title on the left, add button in the top-right corner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="m-0 font-['Poppins'] text-xs font-semibold uppercase tracking-[.16em] text-[#73c4ca]">
            Announcement Board
          </h2>
          <p className="mb-0 mt-2 max-w-xl font-['Poppins'] text-sm text-[#b0cbd1]">
            Publish updates, quick tasks, and team notices without overwhelming
            inactive staff.
          </p>
        </div>

        {showComposer && (
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-[#76c7cd] px-5 py-2.5 font-['Poppins'] text-sm font-semibold text-[#052d45] shadow-[0_6px_18px_rgba(118,199,205,.2)] transition hover:bg-[#91d8dc] active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#76c7cd] sm:w-auto"
          >
            <PlusIcon />
            Add announcement or task
            {trimmed && (
              <span
                title="You have an unfinished draft"
                className="h-2 w-2 rounded-full bg-[#052d45]/70"
              />
            )}
          </button>
        )}
      </div>

      {/* TOOLBAR: label + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="m-0 font-['Poppins'] text-xs font-semibold uppercase tracking-[.16em] text-[#73c4ca]">
          Recent announcements
        </h3>

        <div
          role="group"
          aria-label="Filter announcements"
          className="flex w-full items-center gap-1 self-start rounded-xl bg-white/[.05] p-1 sm:w-auto sm:self-auto"
        >
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 font-['Poppins'] text-xs font-medium transition sm:flex-none ${
                filter === option.value
                  ? "bg-[#73c4ca] text-[#052d45] shadow-sm"
                  : "bg-transparent text-[#89afb9] hover:bg-white/[.07] hover:text-[#d9ecef]"
              }`}
            >
              {option.label}
              <span
                className={`rounded-full px-1.5 text-[10px] font-semibold ${
                  filter === option.value
                    ? "bg-[#052d45]/15 text-[#052d45]"
                    : "bg-white/[.07] text-[#9fc5cc]"
                }`}
              >
                {counts[option.value]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* LIST */}
      {visibleNotes.length > 0 ? (
        <ul className="m-0 grid list-none gap-3 p-0">
          {visibleNotes.map((item) => (
            <NoteItem
              key={item._id}
              item={item}
              onUpdateNote={onUpdateNote}
              edit={edit}
              remove={remove}
              perms={perms}
            />
          ))}
        </ul>
      ) : (
        <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl bg-white/[.03] px-5 py-10 text-center">
          <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-[#73c4ca]/15 text-[#90d5d9]">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 8h10M7 12h7m-8 8-3 1 1-4a8 8 0 1 1 3 3Z"
              />
            </svg>
          </span>
          <p className="m-0 max-w-xs font-['Poppins'] text-sm font-medium text-[#d9ecef]">
            {notes.length
              ? filter === "tasks"
                ? "No tasks yet"
                : "No announcements in this view"
              : "No announcements yet"}
          </p>
          <p className="mb-0 mt-1 max-w-sm font-['Poppins'] text-xs leading-relaxed text-[#b0cbd1]">
            {notes.length
              ? "Try another filter to see the rest."
              : "Post one to let your team know what’s happening."}
          </p>
          {showComposer && !notes.length && (
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#73c4ca]/15 px-4 py-2 font-['Poppins'] text-xs font-semibold text-[#bce9e9] transition hover:bg-[#73c4ca]/20"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Add announcement or task
            </button>
          )}
        </div>
      )}

      {/* COMPOSER DIALOG */}
      {showComposer && composerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setComposerOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="note-dialog-title"
            className="box-border flex max-h-[94dvh] w-full max-w-xl flex-col overflow-y-auto rounded-t-3xl bg-[#062d48] p-4 shadow-2xl sm:max-h-[88vh] sm:rounded-2xl sm:p-6"
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20 sm:hidden" />

            <div className="mb-5 flex items-start justify-between gap-4 border-b border-sky-100/10 pb-4">
              <div>
                <p className="m-0 font-['Poppins'] text-[10px] font-semibold uppercase tracking-[.15em] text-[#73c4ca]">
                  Announcement board
                </p>
                <h3
                  id="note-dialog-title"
                  className="mb-0 mt-1 font-['Fraunces'] text-xl font-medium text-[#d9ecef]"
                >
                  {isTask ? "New task" : "New announcement"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setComposerOpen(false)}
                aria-label="Close"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[.05] text-[#89afb9] transition hover:bg-white/[.1] hover:text-[#d9ecef]"
              >
                <CloseIcon />
              </button>
            </div>

            <form className="grid gap-4" onSubmit={handleAddNote}>
              {/* type */}
              <div
                role="group"
                aria-label="Post type"
                className="grid grid-cols-2 gap-1 rounded-xl bg-white/[.05] p-1"
              >
                {[
                  { value: false, label: "Announcement" },
                  { value: true, label: "Task" },
                ].map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    aria-pressed={isTask === option.value}
                    onClick={() => setIsTask(option.value)}
                    className={`rounded-lg px-3 py-2 font-['Poppins'] text-sm font-medium transition ${
                      isTask === option.value
                        ? "bg-[#73c4ca] text-[#052d45] shadow-sm"
                        : "bg-transparent text-[#89afb9] hover:bg-white/[.07] hover:text-[#d9ecef]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {/* text */}
              <div>
                <label
                  htmlFor="new-note-input"
                  className="block font-['Poppins'] text-xs font-medium text-[#a9c8cf]"
                >
                  {isTask ? "Task details" : "Message"}
                </label>
                <textarea
                  id="new-note-input"
                  autoFocus
                  className="mt-2 box-border min-h-32 w-full resize-y rounded-xl bg-white/[.06] p-3 font-['Poppins'] text-sm text-[#d9ecef] outline-none transition placeholder:text-[#8fb3ba] focus:bg-white/[.08] focus:ring-2 focus:ring-[#73c4ca]/40"
                  value={note}
                  maxLength={MAX_NOTE_LENGTH}
                  onChange={(event) => setNote(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isTask
                      ? "What needs to be done?"
                      : "Share an update with your team..."
                  }
                />
                <div className="mt-1.5 flex justify-between gap-3 font-['Poppins'] text-xs text-[#8fb3ba]">
                  <span>Enter adds a line break · Ctrl+Enter to post</span>
                  <span className={overLimit ? "text-red-300" : ""}>
                    {note.length}/{MAX_NOTE_LENGTH}
                  </span>
                </div>
              </div>

              {/* who can see it */}
              <div>
                <p
                  id="note-visibility-label"
                  className="m-0 font-['Poppins'] text-xs font-medium text-[#a9c8cf]"
                >
                  Who can see this
                </p>
                <div
                  role="radiogroup"
                  aria-labelledby="note-visibility-label"
                  className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-white/[.05] p-1"
                >
                  {[
                    { value: "public", label: "All staff" },
                    { value: "private", label: "Only me" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={visibility === option.value}
                      onClick={() => setVisibility(option.value)}
                      className={`rounded-lg px-3 py-2 font-['Poppins'] text-sm font-medium transition ${
                        visibility === option.value
                          ? "bg-[#73c4ca] text-[#052d45] shadow-sm"
                          : "bg-transparent text-[#89afb9] hover:bg-white/[.07] hover:text-[#d9ecef]"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="mb-0 mt-1.5 font-['Poppins'] text-[11px] text-[#8fb3ba]">
                  {visibility === "public"
                    ? "Shared with the whole team."
                    : "Visible only to you."}
                </p>
              </div>

              {/* task options */}
              {isTask && (
                <div className="grid gap-3 rounded-xl bg-white/[.04] p-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 font-['Poppins'] text-xs font-medium text-[#c5dce1]">
                    <span>
                      Due date{" "}
                      <span className="font-normal text-[#a6c3cb]">
                        (optional)
                      </span>
                    </span>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                      className="rounded-lg bg-[#0a3d59] px-3 py-2 text-sm text-[#d9ecef] outline-none [color-scheme:dark] focus:ring-2 focus:ring-[#73c4ca]/40"
                    />
                  </label>
                  <label className="grid gap-1.5 font-['Poppins'] text-xs font-medium text-[#c5dce1]">
                    <span>
                      Assign to{" "}
                      <span className="font-normal text-[#a6c3cb]">
                        (optional)
                      </span>
                    </span>
                    <select
                      value={assignedTo}
                      onChange={(event) => setAssignedTo(event.target.value)}
                      className="rounded-lg bg-[#0a3d59] px-3 py-2 text-sm text-[#d9ecef] outline-none focus:ring-2 focus:ring-[#73c4ca]/40"
                    >
                      <option value="">Anyone on the team</option>
                      {activeStaff.map((member) => (
                        <option key={member._id} value={member._id}>
                          {member.staffName}
                          {member.staffPosition
                            ? ` · ${member.staffPosition}`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {/* actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[.07] pt-4">
                {note.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      resetComposer();
                      setComposerOpen(false);
                    }}
                    className="border-0 bg-transparent p-0 font-['Poppins'] text-xs text-[#a9c8cf] underline-offset-2 transition hover:text-red-200 hover:underline"
                  >
                    Discard draft
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setComposerOpen(false)}
                    className="rounded-full bg-white/[.06] px-4 py-2.5 font-['Poppins'] text-sm text-[#c9e1e5] transition hover:bg-white/[.1]"
                  >
                    Close
                  </button>
                  <button
                    className={`rounded-full px-6 py-2.5 font-['Poppins'] text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#76c7cd] ${
                      canPost
                        ? "bg-[#76c7cd] text-[#052d45] shadow-[0_4px_14px_rgba(118,199,205,.18)] hover:bg-[#91d8dc]"
                        : "cursor-not-allowed bg-white/[.07] text-[#789faa]"
                    }`}
                    type="submit"
                    disabled={!canPost}
                  >
                    Post
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default Notes;
import { useState, useRef, useEffect, useMemo } from "react";
import Swal from "sweetalert2";

const MAX_NOTE_LENGTH = 1000;

const idOf = (value) =>
  value && value._id ? String(value._id) : String(value ?? "");

const authorLabel = (note) => {
  const author = note.authorId || {};
  const name = author.staffName || author.ownerName || "Unknown sender";
  const role =
    author.role === "Owner" ? "Owner" : author.staffPosition || "Staff";
  return `${name} | ${role}`;
};

function NoteActionsMenu({ item, onUpdateNote, edit, remove, perms }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const isAuthor = idOf(item.authorId) === perms.userId;
  const canEdit = isAuthor || perms.canModerate;

  // Grouped so related actions sit together with a divider between groups,
  // instead of one flat list.
  const primaryActions = [
    canEdit && { label: "Edit note", onClick: () => edit(item) },
    {
      label: item.resolved ? "Mark unresolved" : "Mark resolved",
      onClick: () => onUpdateNote(item._id, { resolved: !item.resolved }),
    },
    perms.canModerate && {
      label: item.pinned ? "Unpin note" : "Pin note",
      onClick: () => onUpdateNote(item._id, { pinned: !item.pinned }),
    },
  ].filter(Boolean);

  if (!primaryActions.length && !canEdit) return null;

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        aria-label="Note actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={`grid h-8 w-8 place-items-center rounded-md border transition ${
          open
            ? "border-[#73c4ca]/40 bg-[#73c4ca]/15 text-white"
            : "border-transparent bg-transparent text-[#a9c8cf] hover:bg-white/10 hover:text-white"
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
          className="absolute right-0 top-full z-20 mt-1.5 w-52 overflow-hidden rounded-xl border border-sky-100/15 bg-[#0a3d59] py-1.5 shadow-xl shadow-black/40"
        >
          <p className="px-3 pb-1.5 pt-0.5 font-['Poppins'] text-[0.65rem] font-semibold uppercase tracking-[.1em] text-[#5f8791]">
            Note actions
          </p>

          <div className="px-1">
            {primaryActions.map((choice) => (
              <button
                key={choice.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  choice.onClick();
                }}
                className="block w-full rounded-lg bg-transparent px-3 py-2 text-left font-['Poppins'] text-[0.8rem] font-medium text-[#d9ecef] transition hover:bg-white/[.08] hover:text-white"
              >
                {choice.label}
              </button>
            ))}
          </div>

          {canEdit && (
            <>
              <div className="my-1.5 h-px bg-white/10" />
              <div className="px-1">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    remove(item);
                  }}
                  className="block w-full rounded-lg bg-transparent px-3 py-2 text-left font-['Poppins'] text-[0.8rem] font-semibold text-red-300 transition hover:bg-red-400/15 hover:text-red-100"
                >
                  Delete note
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function NoteItem({ item, onUpdateNote, edit, remove, perms }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const text = item.text || "";
  const NOTE_CHARS_PER_LINE = 90;
  const lineBreaks = (text.match(/\n/g) || []).length;
  const isLongNote = text.length > NOTE_CHARS_PER_LINE * 2 || lineBreaks >= 2;
  const taskBusy = Boolean(item.isTask);

  return (
    <li
      className={`border-b border-sky-100/[.07] px-5 py-4 transition-colors ${
        item.resolved ? "opacity-60" : ""
      } ${item.pinned ? "bg-sky-500/[.03]" : ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {item.isTask && (
              <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-2 py-0.5 font-['Poppins'] text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200">
                Task
              </span>
            )}
            {item.visibility === "private" ? (
              <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 font-['Poppins'] text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-200">
                Only me
              </span>
            ) : (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-['Poppins'] text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-200">
                Public
              </span>
            )}
            {item.isTask && (
              <button
                type="button"
                onClick={() => onUpdateNote(item._id, { taskStatus: item.taskStatus === "done" ? "pending" : "done" })}
                className="rounded-full border border-sky-100/10 bg-white/[.04] px-2 py-0.5 font-['Poppins'] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#cfecef] transition hover:bg-white/[.08]"
              >
                {item.taskStatus === "done" ? "Done" : "Pending"}
              </button>
            )}
          </div>

          <p
            className={`m-0 whitespace-pre-wrap break-words font-['Poppins'] text-sm text-[#d9ecef] ${
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

          <small className="mt-2 block font-['Poppins'] text-xs text-[#789faa]">
            {item.pinned && (
              <span className="font-semibold text-amber-400">Pinned · </span>
            )}
            {authorLabel(item)} ·{" "}
            {item.createdAt
              ? new Date(item.createdAt).toLocaleString()
              : "Just now"}
          </small>
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

function Notes({
  notes = [],
  permissions = { canModerate: false, userId: "" },
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}) {
  const [note, setNote] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [isTask, setIsTask] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const perms = useMemo(
    () => ({
      canModerate: Boolean(permissions.canModerate),
      userId: String(permissions.userId ?? ""),
    }),
    [permissions.canModerate, permissions.userId],
  );

  const trimmed = note.trim();
  const overLimit = note.length > MAX_NOTE_LENGTH;

  const handleAddNote = (event) => {
    event?.preventDefault();
    if (!trimmed || overLimit) return;
    onAddNote({
      text: trimmed,
      visibility,
      isTask,
      taskStatus: isTask ? "pending" : undefined,
    });
    setNote("");
    setIsTask(false);
    setVisibility("public");
    setExpanded(false);
  };

  // Plain Enter is left alone on purpose — it inserts a newline.
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleAddNote(e);
  };

  const edit = async (item) => {
    const result = await Swal.fire({
      title: "Edit note",
      input: "textarea",
      inputValue: item.text,
      inputAttributes: { maxlength: String(MAX_NOTE_LENGTH) },
      showCancelButton: true,
      confirmButtonText: "Save",
      background: "#062d48",
      color: "#d9ecef",
    });
    if (result.isConfirmed && result.value?.trim())
      onUpdateNote(item._id, { text: result.value.trim() });
  };

  const remove = async (item) => {
    const result = await Swal.fire({
      title: "Delete note?",
      text: "This cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#d33",
      background: "#062d48",
      color: "#d9ecef",
    });
    if (result.isConfirmed) onDeleteNote(item._id);
  };

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6">
      <div>
        <h2 className="font-['Poppins'] text-xs font-semibold uppercase tracking-[.16em] text-[#73c4ca]">
          Announcement Board
        </h2>
        <p className="mt-3 font-['Poppins'] text-sm text-[#9bbec7]">
          Publish updates, quick tasks, and team notices without overwhelming inactive staff.
        </p>
      </div>

      <div className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-5 sm:p-6">
        {!expanded ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-sky-100/20 bg-white/[.03] px-4 py-3 font-['Poppins'] text-sm font-semibold text-[#d9ecef] transition hover:border-[#73c4ca]/50 hover:bg-white/[.06]"
          >
            <span className="text-xl leading-none">+</span>
            Add announcement or task
          </button>
        ) : (
          <form className="grid gap-3" onSubmit={handleAddNote}>
            <div>
              <label
                htmlFor="new-note-input"
                className="block font-['Poppins'] text-xs font-medium text-[#a9c8cf]"
              >
                New announcement
              </label>
              <textarea
                id="new-note-input"
                className="mt-2 box-border min-h-24 w-full resize-y rounded-xl border border-sky-100/10 bg-white/[.06] p-3 font-['Poppins'] text-sm text-[#d9ecef] outline-none transition focus:border-[#73c4ca]"
                value={note}
                maxLength={MAX_NOTE_LENGTH}
                onChange={(event) => setNote(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter the announcement or task details..."
              />
              <div className="mt-1 flex justify-between gap-3 font-['Poppins'] text-xs text-[#789faa]">
                <span>Enter adds a line break.</span>
                <span className={overLimit ? "text-red-300" : ""}>
                  {note.length}/{MAX_NOTE_LENGTH}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 font-['Poppins'] text-xs text-[#d9ecef]">
                  <input
                    type="radio"
                    checked={visibility === "public"}
                    onChange={() => setVisibility("public")}
                    className="accent-[#73c4ca]"
                  />
                  Public
                </label>
                <label className="inline-flex items-center gap-2 font-['Poppins'] text-xs text-[#d9ecef]">
                  <input
                    type="radio"
                    checked={visibility === "private"}
                    onChange={() => setVisibility("private")}
                    className="accent-[#73c4ca]"
                  />
                  Only me
                </label>
              </div>

              <label className="inline-flex items-center gap-2 font-['Poppins'] text-xs text-[#d9ecef]">
                <input
                  type="checkbox"
                  checked={isTask}
                  onChange={() => setIsTask((value) => !value)}
                  className="accent-[#73c4ca]"
                />
                Mark as task
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="rounded-full border border-sky-100/15 bg-transparent px-4 py-2 font-['Poppins'] text-xs text-[#a9c8cf] hover:text-[#d9ecef]"
              >
                Cancel
              </button>
              <button
                className="rounded-full bg-[#75bec4] px-5 py-2.5 font-['Poppins'] text-sm font-medium text-[#052d45] transition hover:bg-[#8fd0d6] disabled:cursor-not-allowed disabled:opacity-50"
                type="submit"
                disabled={!trimmed || overLimit}
              >
                Post
              </button>
            </div>
          </form>
        )}
      </div>

      <div>
        <h2 className="font-['Poppins'] text-xs font-semibold uppercase tracking-[.16em] text-[#73c4ca]">
          Recent announcements
        </h2>
      </div>

      <div className="overflow-hidden rounded-2xl border border-sky-100/10 bg-[#062d48]/80">
        <div className="max-h-[60vh] overflow-y-auto">
          <ul className="grid gap-0 p-0">
            {notes.map((item) => (
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

          {!notes.length && (
            <p className="px-5 py-12 text-center font-['Poppins'] text-sm text-[#789faa]">
              No announcements have been published yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export default Notes;

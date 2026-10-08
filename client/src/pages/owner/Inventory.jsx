import { useState } from "react";

import { formatPeso } from "../shared/salesUtils.js";

const NEW_OPTION = "__new__";

function ViewModeIcon({ mode }) {
  if (mode === "grid") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="4" y="14" width="6" height="6" rx="1" />
        <rect x="14" y="14" width="6" height="6" rx="1" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="5" y1="6" x2="19" y2="6" />
      <line x1="5" y1="12" x2="19" y2="12" />
      <line x1="5" y1="18" x2="19" y2="18" />
      <circle cx="3" cy="6" r="0.5" fill="currentColor" />
      <circle cx="3" cy="12" r="0.5" fill="currentColor" />
      <circle cx="3" cy="18" r="0.5" fill="currentColor" />
    </svg>
  );
}

function Inventory({
  fish,
  tanks,
  fishForm,
  setFishForm,
  editingFishId,
  setEditingFishId,
  onPhotoUpload,
  onSubmit,
  onDelete,
  onAdjust,
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [categoryView, setCategoryView] = useState("Fish");
  const [nameMode, setNameMode] = useState("select");
  const [speciesMode, setSpeciesMode] = useState("select");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [viewMode, setViewMode] = useState("grid");

  // Adjust stock dialog (count corrections with a reason)
  const [adjustItem, setAdjustItem] = useState(null);
  const [adjustValues, setAdjustValues] = useState({ change: "", reason: "" });
  const [adjustError, setAdjustError] = useState("");
  const [adjustBusy, setAdjustBusy] = useState(false);

  const closeAdjust = () => {
    if (adjustBusy) return;
    setAdjustItem(null);
    setAdjustValues({ change: "", reason: "" });
    setAdjustError("");
  };

  const submitAdjust = async (event) => {
    event.preventDefault();
    if (adjustBusy || !adjustItem) return;

    const change = Number(adjustValues.change);
    if (!Number.isInteger(change) || change === 0 || Math.abs(change) > 100000) {
      setAdjustError("Enter a whole number to add or remove (not 0).");
      return;
    }
    if (change < 0 && -change > Number(adjustItem.quantity)) {
      setAdjustError("You cannot remove more than the current stock.");
      return;
    }
    const reason = adjustValues.reason.replace(/[<>{}`$\\]/g, "").trim();
    if (reason.length < 3) {
      setAdjustError("Give a short reason (at least 3 characters).");
      return;
    }

    setAdjustBusy(true);
    setAdjustError("");
    try {
      await onAdjust(adjustItem._id, { change, reason });
      setAdjustBusy(false);
      setAdjustItem(null);
      setAdjustValues({ change: "", reason: "" });
    } catch (error) {
      setAdjustError(error.message || "Could not adjust the stock.");
      setAdjustBusy(false);
    }
  };

  const existingNames = [
    ...new Set(fish.map((item) => item.name).filter(Boolean)),
  ].sort();

  const existingSpecies = [
    ...new Set(fish.map((item) => item.species).filter(Boolean)),
  ].sort();

  const updateField = (event) =>
    setFishForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));

  const openForm = (nextForm, editingId) => {
    setEditingFishId(editingId);
    setFishForm(nextForm);

    setNameMode(
      nextForm.name && !existingNames.includes(nextForm.name)
        ? "new"
        : "select",
    );

    setSpeciesMode(
      nextForm.species && !existingSpecies.includes(nextForm.species)
        ? "new"
        : "select",
    );

    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
  };

  const handlePhoto = async (event) => {
    const file = event.target.files[0];

    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      window.alert("Only JPG and PNG images are allowed.");
      event.target.value = "";
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      window.alert("Image must be 3 MB or smaller.");
      event.target.value = "";
      return;
    }

    setPhotoUploading(true);

    try {
      const photoUrl = await onPhotoUpload(file);

      setFishForm((previous) => ({
        ...previous,
        photoUrl,
      }));
    } catch (error) {
      window.alert(error.message || "Could not upload the image.");
      event.target.value = "";
    } finally {
      setPhotoUploading(false);
    }
  };

  const visibleFish = fish.filter(
    (item) => (item.category || "Fish") === categoryView,
  );

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-4 px-3 pb-24 sm:gap-6 sm:px-0 sm:pb-6">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[0.16em] text-[#73c4ca]">
            Inventory Management
          </p>

          <p className="mt-2 font-['Poppins'] text-sm text-[#9bbec7]">
            Add fish and fish food for your store.
          </p>
        </div>

        <button
          className="min-h-[44px] w-full rounded-2xl border border-[#73c4ca]/30 bg-[#73c4ca]/10 px-4 py-3 font-['Poppins'] text-sm font-semibold text-[#bce9e9] transition active:scale-[.98] hover:bg-[#73c4ca]/20 sm:w-auto sm:rounded-full sm:py-2.5"
          type="button"
          onClick={() =>
            openForm(
              {
                name: "",
                species: "",
                category: "Fish",
                tankId: "",
                price: "",
                costPrice: "",
                quantity: "",
                source: "Purchased",
                supplierName: "",
                description: "",
                photoUrl: "",
              },
              null,
            )
          }
        >
          Add Item
        </button>
      </div>

      {/* CATEGORY AND VIEW CONTROLS */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 rounded-xl border border-sky-100/10 p-1">
          <button
            type="button"
            className={`min-h-[42px] rounded-xl px-5 py-2.5 font-['Poppins'] text-base font-medium transition ${
              categoryView === "Fish"
                ? "bg-[#73c4ca] text-[#052d45] shadow-sm"
                : "bg-transparent text-[#89afb9] hover:bg-white/[.05] hover:text-[#d9ecef]"
            }`}
            onClick={() => setCategoryView("Fish")}
          >
            Fish
          </button>

          <button
            type="button"
            className={`min-h-[42px] rounded-xl px-5 py-2.5 font-['Poppins'] text-base font-medium transition ${
              categoryView === "Fish Food"
                ? "bg-[#73c4ca] text-[#052d45] shadow-sm"
                : "bg-transparent text-[#89afb9] hover:bg-white/[.05] hover:text-[#d9ecef]"
            }`}
            onClick={() => setCategoryView("Fish Food")}
          >
            Fish Food
          </button>
        </div>

        <div
          className="flex items-center gap-1 self-start rounded-xl border border-sky-100/10 p-1 sm:self-auto"
          aria-label="Inventory view"
        >
          {["grid", "list"].map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={viewMode === mode}
              aria-label={mode === "grid" ? "Cards view" : "List view"}
              title={mode === "grid" ? "Cards view" : "List view"}
              className={`grid h-9 w-9 place-items-center rounded-lg transition ${
                viewMode === mode
                  ? "bg-[#73c4ca] text-[#052d45] shadow-sm"
                  : "bg-transparent text-[#89afb9] hover:text-[#d9ecef]"
              }`}
              onClick={() => setViewMode(mode)}
            >
              <ViewModeIcon mode={mode} />
            </button>
          ))}
        </div>
      </div>

      {/* INVENTORY GRID */}
      <div
        className={`${
          viewMode === "grid" ? "grid" : "hidden"
        } grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4`}
      >
        {visibleFish.map((item) => (
          <article
            key={item._id}
            className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-sky-100/[.09] bg-[#062d48]/70 shadow-[0_8px_25px_rgba(0,12,31,.12)] transition hover:border-[#73c4ca]/40 hover:shadow-[0_10px_25px_rgba(0,12,31,.25)]"
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#0a4261] sm:aspect-square">
              {item.photoUrl ? (
                <img
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  src={item.photoUrl}
                  alt={item.name}
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-5xl"
                  aria-label="No item photo"
                >
                  🐟
                </div>
              )}

              <span className="absolute right-2 top-2 max-w-[75%] truncate rounded-lg bg-black/55 px-2.5 py-1.5 font-['Poppins'] text-xs font-medium text-[#bce9e9] backdrop-blur-sm">
                {item.species || item.description || "Fish"}
              </span>
            </div>

            <div className="flex flex-1 flex-col p-4">
              <h3 className="m-0 truncate font-['Poppins'] text-lg font-semibold text-[#d9ecef] sm:text-xl">
                {item.name}
              </h3>

              <p className="mt-1 font-['Fraunces'] text-xl font-bold text-[#73c4ca]">
                {formatPeso(item.price)}
              </p>

              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-['Poppins'] text-xs text-[#a8c6cc]">
                <span>
                  Stock: <b className="text-[#d9ecef]">{item.quantity}</b>
                </span>

                {item.tankId?.name && <span>{item.tankId.name}</span>}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {onAdjust && (
                  <button
                    type="button"
                    className="col-span-2 min-h-[40px] rounded-xl border border-[#73c4ca]/25 bg-[#73c4ca]/10 py-2 font-['Poppins'] text-xs font-medium text-[#bce9e9] transition active:scale-[.98] hover:bg-[#73c4ca]/20"
                    onClick={() => setAdjustItem(item)}
                  >
                    Adjust stock
                  </button>
                )}

                <button
                  type="button"
                  className="min-h-[40px] rounded-xl border border-sky-100/15 bg-white/[.04] py-2 font-['Poppins'] text-xs font-medium text-[#a8c6cc] transition active:scale-[.98] hover:border-[#73c4ca]/50 hover:bg-white/[.08] hover:text-[#bce9e9]"
                  onClick={() =>
                    openForm(
                      {
                        ...item,
                        tankId: item.tankId?._id || item.tankId || "",
                        price: item.price ?? "",
                        costPrice: item.costPrice ?? "",
                        category: item.category || "Fish",
                      },
                      item._id,
                    )
                  }
                >
                  Edit
                </button>

                <button
                  type="button"
                  className="min-h-[40px] rounded-xl border border-red-300/15 bg-red-400/[.06] py-2 font-['Poppins'] text-xs font-medium text-[#e9a7a7] transition active:scale-[.98] hover:border-red-300/40 hover:bg-red-400/15 hover:text-[#ffd0d0]"
                  onClick={() => onDelete(item._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          </article>
        ))}

        {!visibleFish.length && (
          <div className="col-span-full rounded-2xl border border-dashed border-sky-100/15 bg-white/[.02] px-5 py-12 text-center">
            <div className="text-4xl">🐟</div>

            <p className="mt-3 font-['Poppins'] text-sm text-[#9bbec7]">
              No {categoryView.toLowerCase()} items yet.
            </p>
          </div>
        )}
      </div>

      {/* INVENTORY LIST */}
      <div
        className={`${
          viewMode === "list" ? "block" : "hidden"
        } max-h-[60vh] overflow-x-auto overflow-y-auto rounded-2xl border border-sky-100/10 bg-[#062d48]/70`}
      >
        {visibleFish.length ? (
          <table className="min-w-[720px] w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-10">
              <tr>
                {["Item", "Category", "Price", "Stock", "Tank", "Actions"].map(
                  (heading) => (
                    <th
                      key={heading}
                      className="border-b border-sky-100/10 bg-[#062d48] px-4 py-3 text-left font-['Poppins'] text-[10px] font-semibold uppercase tracking-[.12em] text-[#89afb9]"
                    >
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>

            <tbody>
              {visibleFish.map((item) => (
                <tr
                  key={item._id}
                  className="transition hover:bg-white/[.035]"
                >
                  {/* ITEM */}
                  <td className="border-b border-sky-100/[.07] px-4 py-3">
                    <div className="flex items-center gap-3">
                      {item.photoUrl ? (
                        <img
                          className="h-12 w-12 shrink-0 rounded-lg object-cover"
                          src={item.photoUrl}
                          alt=""
                        />
                      ) : (
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-[#0a4261] text-xl">
                          🐟
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="truncate font-['Poppins'] text-sm font-semibold text-[#d9ecef]">
                          {item.name}
                        </p>

                        <p className="truncate font-['Poppins'] text-xs text-[#9bbec7]">
                          {item.species || item.description || "No species"}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* CATEGORY */}
                  <td className="border-b border-sky-100/[.07] px-4 py-3 font-['Poppins'] text-xs text-[#b7d2d7]">
                    {item.category || "Fish"}
                  </td>

                  {/* PRICE */}
                  <td className="border-b border-sky-100/[.07] px-4 py-3 font-['Fraunces'] text-lg font-bold text-[#73c4ca]">
                    {formatPeso(item.price)}
                  </td>

                  {/* STOCK */}
                  <td className="border-b border-sky-100/[.07] px-4 py-3 font-['Poppins'] text-sm text-[#d9ecef]">
                    {item.quantity}
                  </td>

                  {/* TANK */}
                  <td className="border-b border-sky-100/[.07] px-4 py-3 font-['Poppins'] text-xs text-[#b7d2d7]">
                    {item.tankId?.name || "Unassigned"}
                  </td>

                  {/* ACTIONS */}
                  <td className="border-b border-sky-100/[.07] px-4 py-3">
                    <div className="flex gap-2">
                      {onAdjust && (
                        <button
                          type="button"
                          className="rounded-lg border border-[#73c4ca]/25 bg-[#73c4ca]/10 px-3 py-2 font-['Poppins'] text-xs text-[#bce9e9] transition hover:bg-[#73c4ca]/20"
                          onClick={() => setAdjustItem(item)}
                        >
                          Adjust
                        </button>
                      )}
                      <button
                        type="button"
                        className="rounded-lg border border-sky-100/15 bg-white/[.04] px-3 py-2 font-['Poppins'] text-xs text-[#b7d2d7] transition hover:border-[#73c4ca]/50 hover:text-[#d9ecef]"
                        onClick={() =>
                          openForm(
                            {
                              ...item,
                              tankId:
                                item.tankId?._id || item.tankId || "",
                              price: item.price ?? "",
                              costPrice: item.costPrice ?? "",
                              category: item.category || "Fish",
                            },
                            item._id,
                          )
                        }
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="rounded-lg border border-red-300/15 bg-red-400/[.06] px-3 py-2 font-['Poppins'] text-xs text-[#e9a7a7] transition hover:border-red-300/40 hover:bg-red-400/15 hover:text-[#ffd0d0]"
                        onClick={() => onDelete(item._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-5 py-12 text-center">
            <div className="text-4xl">🐟</div>

            <p className="mt-3 font-['Poppins'] text-sm text-[#9bbec7]">
              No {categoryView.toLowerCase()} items yet.
            </p>
          </div>
        )}
      </div>

      {/* ADJUST STOCK DIALOG */}
      {adjustItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeAdjust();
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-sky-100/15 bg-[#062d48] p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="adjust-dialog-title"
          >
            <h3
              id="adjust-dialog-title"
              className="m-0 font-['Fraunces'] text-xl font-medium text-[#d9ecef]"
            >
              Adjust stock
            </h3>
            <p className="mt-1 font-['Poppins'] text-xs text-[#9bbec7]">
              {adjustItem.name} · current stock {adjustItem.quantity}. For new
              stock bought from a supplier, use Record purchase instead.
            </p>

            <form className="mt-4 grid gap-4" onSubmit={submitAdjust} noValidate>
              <label className="flex flex-col gap-1.5 font-['Poppins'] text-xs font-medium text-[#a9c8cf]">
                Change (use a minus to remove)
                <input
                  className="min-h-[44px] rounded-xl border border-sky-100/10 bg-white/[.06] px-3 text-sm text-[#d9ecef] outline-none focus:border-[#73c4ca]"
                  type="number"
                  step="1"
                  inputMode="numeric"
                  placeholder="e.g. -3 or 5"
                  autoFocus
                  value={adjustValues.change}
                  onChange={(event) => {
                    setAdjustValues((previous) => ({ ...previous, change: event.target.value }));
                    setAdjustError("");
                  }}
                  disabled={adjustBusy}
                />
              </label>

              <label className="flex flex-col gap-1.5 font-['Poppins'] text-xs font-medium text-[#a9c8cf]">
                Reason
                <input
                  className="min-h-[44px] rounded-xl border border-sky-100/10 bg-white/[.06] px-3 text-sm text-[#d9ecef] outline-none focus:border-[#73c4ca]"
                  type="text"
                  maxLength={200}
                  placeholder="e.g. Recount found 3 missing"
                  value={adjustValues.reason}
                  onChange={(event) => {
                    setAdjustValues((previous) => ({ ...previous, reason: event.target.value }));
                    setAdjustError("");
                  }}
                  disabled={adjustBusy}
                />
              </label>

              {adjustError && (
                <p className="m-0 rounded-xl border border-red-300/20 bg-red-400/10 p-3 font-['Poppins'] text-xs text-[#ffb4b4]">
                  {adjustError}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="submit"
                  disabled={adjustBusy}
                  className="min-h-[44px] rounded-xl bg-[#75bec4] px-4 py-2.5 font-['Poppins'] text-sm font-bold text-[#052d45] transition hover:bg-[#91d2d5] disabled:opacity-60"
                >
                  {adjustBusy ? "Saving..." : "Save adjustment"}
                </button>
                <button
                  type="button"
                  onClick={closeAdjust}
                  disabled={adjustBusy}
                  className="min-h-[44px] rounded-xl border border-sky-100/15 bg-white/[.04] px-4 py-2.5 font-['Poppins'] text-sm text-[#c9e1e5] transition hover:bg-white/[.08]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeForm();
            }
          }}
        >
          <div
            className="box-border flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-y-auto rounded-t-3xl border border-sky-100/15 bg-[#062d48] p-4 shadow-2xl sm:max-h-[85vh] sm:rounded-2xl sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fish-dialog-title"
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20 sm:hidden" />

            <div className="mb-5 flex items-center justify-between border-b border-sky-100/10 pb-4">
              <div>
                <p className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-[.15em] text-[#73c4ca]">
                  Inventory
                </p>

                <h3
                  id="fish-dialog-title"
                  className="mt-1 font-['Fraunces'] text-xl font-medium text-[#d9ecef]"
                >
                  {editingFishId ? "Edit Item" : "Add Fish / Fish Food"}
                </h3>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="grid h-10 w-10 place-items-center rounded-xl bg-white/[.05] text-xl text-[#89afb9] hover:bg-white/[.1] hover:text-[#d9ecef]"
                aria-label="Close form"
              >
                ×
              </button>
            </div>

            <form
              className="grid gap-4"
              onSubmit={async (event) => {
                const succeeded = await onSubmit(event);

                if (succeeded) {
                  closeForm();
                }
              }}
            >
              {/* NAME */}
              <label className="flex flex-col gap-1.5 font-['Poppins'] text-xs font-medium text-[#a9c8cf]">
                Fish Name

                {nameMode === "new" ? (
                  <input
                    className="min-h-[44px] rounded-xl border border-sky-100/10 bg-white/[.06] px-3 text-sm text-[#d9ecef] outline-none focus:border-[#73c4ca]"
                    name="name"
                    maxLength={100}
                    placeholder="Enter new fish name"
                    value={fishForm.name}
                    onChange={updateField}
                    required
                    autoFocus
                  />
                ) : (
                  <select
                    className="min-h-[44px] rounded-xl border border-sky-100/10 bg-[#062d48] px-3 text-sm text-[#d9ecef] outline-none focus:border-[#73c4ca]"
                    name="name"
                    value={
                      existingNames.includes(fishForm.name)
                        ? fishForm.name
                        : ""
                    }
                    onChange={(event) => {
                      if (event.target.value === NEW_OPTION) {
                        setNameMode("new");

                        setFishForm((previous) => ({
                          ...previous,
                          name: "",
                        }));

                        return;
                      }

                      updateField(event);
                    }}
                    required
                  >
                    <option value="">Choose a name</option>

                    {existingNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}

                    <option value={NEW_OPTION}>+ Add new name</option>
                  </select>
                )}

                {nameMode === "new" && existingNames.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setNameMode("select");

                      setFishForm((previous) => ({
                        ...previous,
                        name: "",
                      }));
                    }}
                    className="mt-1 w-fit bg-transparent p-0 text-left font-['Poppins'] text-xs text-[#73c4ca] underline"
                  >
                    Choose existing name
                  </button>
                )}
              </label>

              {/* CATEGORY */}
              <label className="flex flex-col gap-1.5 font-['Poppins'] text-xs font-medium text-[#a9c8cf]">
                Category

                <select
                  className="min-h-[44px] rounded-xl border border-sky-100/10 bg-[#062d48] px-3 text-sm text-[#d9ecef] outline-none focus:border-[#73c4ca]"
                  name="category"
                  value={fishForm.category || "Fish"}
                  onChange={updateField}
                  required
                >
                  <option value="Fish">Fish</option>
                  <option value="Fish Food">Fish Food</option>
                </select>
              </label>

              {/* SOURCE (new items only) */}
              {!editingFishId && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5 font-['Poppins'] text-xs font-medium text-[#a9c8cf]">
                    Where did this stock come from?

                    <select
                      className="min-h-[44px] rounded-xl border border-sky-100/10 bg-[#062d48] px-3 text-sm text-[#d9ecef] outline-none focus:border-[#73c4ca]"
                      name="source"
                      value={fishForm.source || "Purchased"}
                      onChange={updateField}
                      required
                    >
                      <option value="Purchased">Bought from a supplier</option>
                      <option value="Bred in-house">Bred in-house</option>
                      <option value="Opening stock">
                        Opening stock (already owned)
                      </option>
                    </select>
                  </label>

                  {(fishForm.source || "Purchased") === "Purchased" && (
                    <label className="flex flex-col gap-1.5 font-['Poppins'] text-xs font-medium text-[#a9c8cf]">
                      Supplier name

                      <input
                        className="min-h-[44px] rounded-xl border border-sky-100/10 bg-white/[.06] px-3 text-sm text-[#d9ecef] outline-none focus:border-[#73c4ca]"
                        type="text"
                        name="supplierName"
                        maxLength={120}
                        placeholder="e.g. Dagupan Aquatic Supplier"
                        value={fishForm.supplierName || ""}
                        onChange={updateField}
                        required
                      />
                    </label>
                  )}

                  {(fishForm.source || "Purchased") === "Purchased" && (
                    <p className="m-0 font-['Poppins'] text-[11px] leading-relaxed text-[#789faa] sm:col-span-2">
                      A purchase record will be added to Purchase history
                      automatically using the quantity and cost price below.
                    </p>
                  )}
                </div>
              )}

              {/* TANK */}
              {fishForm.category !== "Fish Food" && (
                <label className="flex flex-col gap-1.5 font-['Poppins'] text-xs font-medium text-[#a9c8cf]">
                  Tank

                  <select
                    className="min-h-[44px] rounded-xl border border-sky-100/10 bg-[#062d48] px-3 text-sm text-[#d9ecef] outline-none focus:border-[#73c4ca]"
                    name="tankId"
                    value={fishForm.tankId || ""}
                    onChange={updateField}
                    required
                  >
                    <option value="">Choose a tank first</option>

                    {tanks.map((tank) => (
                      <option
                        key={tank._id}
                        value={tank._id}
                        disabled={tank.status === "Under Maintenance"}
                      >
                        {tank.name} ({tank.status})
                        {tank.status === "Under Maintenance"
                          ? " - unavailable"
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {/* PRICE / COST */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 font-['Poppins'] text-xs font-medium text-[#a9c8cf]">
                  Selling Price

                  <input
                    className="min-h-[44px] rounded-xl border border-sky-100/10 bg-white/[.06] px-3 text-sm text-[#d9ecef] outline-none focus:border-[#73c4ca]"
                    type="number"
                    name="price"
                    min="1"
                    step="0.01"
                    placeholder="Price per unit"
                    value={fishForm.price ?? ""}
                    onChange={updateField}
                    required
                  />
                </label>

                <label className="flex flex-col gap-1.5 font-['Poppins'] text-xs font-medium text-[#a9c8cf]">
                  Cost Price (per unit)

                  <input
                    className="min-h-[44px] rounded-xl border border-sky-100/10 bg-white/[.06] px-3 text-sm text-[#d9ecef] outline-none focus:border-[#73c4ca]"
                    type="number"
                    name="costPrice"
                    min="1"
                    step="0.01"
                    placeholder="Purchase cost"
                    value={fishForm.costPrice ?? ""}
                    onChange={updateField}
                    required
                  />
                </label>
              </div>

              {/* SPECIES */}
              <label className="flex flex-col gap-1.5 font-['Poppins'] text-xs font-medium text-[#a9c8cf]">
                Species

                {speciesMode === "new" ? (
                  <input
                    className="min-h-[44px] rounded-xl border border-sky-100/10 bg-white/[.06] px-3 text-sm text-[#d9ecef] outline-none focus:border-[#73c4ca]"
                    name="species"
                    maxLength={100}
                    placeholder="Enter new species"
                    value={fishForm.species}
                    onChange={updateField}
                    required
                  />
                ) : (
                  <select
                    className="min-h-[44px] rounded-xl border border-sky-100/10 bg-[#062d48] px-3 text-sm text-[#d9ecef] outline-none focus:border-[#73c4ca]"
                    name="species"
                    value={
                      existingSpecies.includes(fishForm.species)
                        ? fishForm.species
                        : ""
                    }
                    onChange={(event) => {
                      if (event.target.value === NEW_OPTION) {
                        setSpeciesMode("new");

                        setFishForm((previous) => ({
                          ...previous,
                          species: "",
                        }));

                        return;
                      }

                      updateField(event);
                    }}
                    required
                  >
                    <option value="">Choose a species</option>

                    {existingSpecies.map((species) => (
                      <option key={species} value={species}>
                        {species}
                      </option>
                    ))}

                    <option value={NEW_OPTION}>+ Add new species</option>
                  </select>
                )}

                {speciesMode === "new" && existingSpecies.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSpeciesMode("select");

                      setFishForm((previous) => ({
                        ...previous,
                        species: "",
                      }));
                    }}
                    className="mt-1 w-fit bg-transparent p-0 text-left font-['Poppins'] text-xs text-[#73c4ca] underline"
                  >
                    Choose existing species
                  </button>
                )}
              </label>

              {/* QUANTITY */}
              <label className="flex flex-col gap-1.5 font-['Poppins'] text-xs font-medium text-[#a9c8cf]">
                Quantity

                <input
                  className="min-h-[44px] rounded-xl border border-sky-100/10 bg-white/[.06] px-3 text-sm text-[#d9ecef] outline-none focus:border-[#73c4ca] disabled:cursor-not-allowed disabled:opacity-60"
                  type="number"
                  name="quantity"
                  min="1"
                  step={fishForm.category === "Fish Food" ? "any" : "1"}
                  placeholder="Quantity"
                  value={fishForm.quantity}
                  onChange={updateField}
                  disabled={Boolean(editingFishId)}
                  required
                />

                {editingFishId && (
                  <span className="text-[11px] font-normal text-[#789faa]">
                    Quantity is locked. Use Adjust stock for corrections, or
                    Record purchase to restock.
                  </span>
                )}
              </label>

              {/* DESCRIPTION */}
              <label className="flex flex-col gap-1.5 font-['Poppins'] text-xs font-medium text-[#a9c8cf]">
                Description

                <textarea
                  className="min-h-[90px] resize-none rounded-xl border border-sky-100/10 bg-white/[.06] px-3 py-2.5 text-sm text-[#d9ecef] outline-none focus:border-[#73c4ca]"
                  name="description"
                  maxLength={1000}
                  placeholder="Description"
                  value={fishForm.description}
                  onChange={updateField}
                />
              </label>

              {/* PHOTO */}
              <label className="flex flex-col gap-2 font-['Poppins'] text-xs font-medium text-[#a9c8cf]">
                Photo

                <span className="text-[10px] font-normal text-[#789faa]">
                  Optional · JPG or PNG · maximum 3 MB
                </span>

                <div className="flex flex-col gap-3 rounded-2xl border border-sky-100/15 bg-[#052235] p-3 sm:flex-row sm:items-center">
                  {fishForm.photoUrl ? (
                    <img
                      className="h-24 w-full rounded-xl object-cover sm:h-16 sm:w-16"
                      src={fishForm.photoUrl}
                      alt="Selected item preview"
                    />
                  ) : (
                    <div className="flex h-24 w-full items-center justify-center rounded-xl bg-[#0a4261] text-3xl sm:h-16 sm:w-16">
                      🐟
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handlePhoto}
                    disabled={photoUploading}
                    className="block w-full text-xs text-[#a8c6cc] file:mr-3 file:rounded-xl file:border-0 file:bg-[#75bec4] file:px-3 file:py-2.5 file:text-xs file:font-semibold file:text-[#052d45] hover:file:bg-[#86d0d6]"
                  />

                  {photoUploading && (
                    <span className="font-['Poppins'] text-[10px] text-[#9bbec7]">
                      Uploading photo...
                    </span>
                  )}
                </div>
              </label>

              {/* ACTIONS */}
              <div className="grid grid-cols-2 gap-2 border-t border-white/[.07] pt-4">
                <button
                  type="submit"
                  disabled={photoUploading}
                  className="min-h-[46px] rounded-xl bg-[#75bec4] px-4 py-2.5 font-['Poppins'] text-sm font-bold text-[#052d45] transition active:scale-[.98] hover:bg-[#91d2d5]"
                >
                  {photoUploading
                    ? "Uploading photo..."
                    : editingFishId
                      ? "Update Item"
                      : "Add Item"}
                </button>

                <button
                  type="button"
                  onClick={closeForm}
                  className="min-h-[46px] rounded-xl border border-sky-100/15 bg-white/[.04] px-4 py-2.5 font-['Poppins'] text-sm text-[#c9e1e5] transition hover:bg-white/[.08]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default Inventory;
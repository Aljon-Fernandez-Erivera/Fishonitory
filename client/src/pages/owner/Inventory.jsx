import { useState } from "react";

import { formatPeso } from "../shared/salesUtils.js";

const NEW_OPTION = "__new__";

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
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [categoryView, setCategoryView] = useState("Fish");
  const [nameMode, setNameMode] = useState("select");
  const [speciesMode, setSpeciesMode] = useState("select");

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

    try {
      const photoUrl = await onPhotoUpload(file);

      setFishForm((previous) => ({
        ...previous,
        photoUrl,
      }));
    } catch (error) {
      window.alert(error.message || "Could not upload the image.");

      event.target.value = "";
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

      {/* CATEGORY TABS */}
      <div className="flex items-center gap-2 rounded-xl border border-sky-100/10 p-1">
        <button
          type="button"
          className={`min-h-42px rounded-xl px-5 py-2.5 font-['Poppins'] text-base font-medium transition ${
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

      {/* INVENTORY GRID */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
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
                      existingNames.includes(fishForm.name) ? fishForm.name : ""
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
                  Cost Price
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
                  className="min-h-[44px] rounded-xl border border-sky-100/10 bg-white/[.06] px-3 text-sm text-[#d9ecef] outline-none focus:border-[#73c4ca]"
                  type="number"
                  name="quantity"
                  min="1"
                  placeholder="Quantity"
                  value={fishForm.quantity}
                  onChange={updateField}
                  required
                />
              </label>

              {/* DESCRIPTION */}
              <label className="flex flex-col gap-1.5 font-['Poppins'] text-xs font-medium text-[#a9c8cf]">
                Description
                <textarea
                  className="min-h-[90px] resize-none rounded-xl border border-sky-100/10 bg-white/[.06] px-3 py-2.5 text-sm text-[#d9ecef] outline-none focus:border-[#73c4ca]"
                  name="description"
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
                    className="block w-full text-xs text-[#a8c6cc] file:mr-3 file:rounded-xl file:border-0 file:bg-[#75bec4] file:px-3 file:py-2.5 file:text-xs file:font-semibold file:text-[#052d45] hover:file:bg-[#86d0d6]"
                  />
                </div>
              </label>

              {/* ACTIONS */}
              <div className="grid grid-cols-2 gap-2 border-t border-white/[.07] pt-4">
                <button
                  type="submit"
                  className="min-h-[46px] rounded-xl bg-[#75bec4] px-4 py-2.5 font-['Poppins'] text-sm font-bold text-[#052d45] transition active:scale-[.98] hover:bg-[#91d2d5]"
                >
                  {editingFishId ? "Update Item" : "Add Item"}
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

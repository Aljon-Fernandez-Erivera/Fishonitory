import { useState } from "react";

import { formatPeso } from "../shared/salesUtils.js";

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
  const updateField = (event) =>
    setFishForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
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
      setFishForm((previous) => ({ ...previous, photoUrl }));
    } catch (error) {
      window.alert(error.message || "Could not upload the image.");
      event.target.value = "";
    }
  };

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[0.16em] text-[#73c4ca]">
            Inventory Management
          </p>
          <p className="mt-3 font-['Poppins'] text-sm text-[#9bbec7]">
            {" "}
            Add fish and fish food for your store.
          </p>
        </div>
        <button
          className="rounded-full border border-sky-100/15 bg-white/[.05] px-4 py-2.5 font-['Poppins'] text-sm font-medium text-[#d9ecef] transition hover:bg-white/[.1] focus:outline-none focus:ring-2 focus:ring-[#73c4ca]"
          type="button"
          onClick={() => {
            setEditingFishId(null);
            setFishForm({
              name: "",
              species: "",
              category: "Fish",
              tankId: "",
              price: "",
              costPrice: "",
              quantity: "",
              description: "",
              photoUrl: "",
            });
            setFormOpen(true);
          }}
        >
          Add Item
        </button>
      </div>
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setFormOpen(false);
          }}
        >
          <div
            className="box-border max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-sky-100/15 bg-[#062d48] p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fish-dialog-title"
          >
            <div className="mb-5 flex items-center justify-between border-b border-sky-100/10 pb-4">
              <h3
                id="fish-dialog-title"
                className="font-['Fraunces'] text-xl font-medium text-[#d9ecef]"
              >
                {editingFishId ? "Edit Fish" : "Add Fish/Fish Food"}
              </h3>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="text-lg bg-transparent border-0 text-[#89afb9] hover:text-[#d9ecef]"
                aria-label="Close form"
              >
                X
              </button>
            </div>
            <form
              className="dashboard-form"
              onSubmit={async (event) => {
                const succeeded = await onSubmit(event);
                if (succeeded) setFormOpen(false);
              }}
            >
              <label>
                Fish Name
                <input
                  name="name"
                  placeholder="Fish name"
                  value={fishForm.name}
                  onChange={updateField}
                  required
                />
              </label>

              <label>
                Category
                <select
                  name="category"
                  value={fishForm.category || "Fish"}
                  onChange={updateField}
                  required
                >
                  <option value="Fish">Fish</option>
                  <option value="Fish Food">Fish Food</option>
                </select>
              </label>

              {fishForm.category !== "Fish Food" && (
                <label>
                  Tank
                  <select
                    name="tankId"
                    value={fishForm.tankId || ""}
                    onChange={updateField}
                    required
                  >
                    <option value="">Choose a tank first</option>
                    {tanks.map((tank) => (
                      <option key={tank._id} value={tank._id}>
                        {tank.name} ({tank.status})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label>
                Price
                <input
                  type="number"
                  name="price"
                  min="0"
                  step="0.01"
                  placeholder="Price per unit"
                  value={fishForm.price ?? ""}
                  onChange={updateField}
                  required
                />
              </label>

              <label>
                Cost Price
                <input
                  type="number"
                  name="costPrice"
                  min="0"
                  step="0.01"
                  placeholder="Purchase cost per unit"
                  value={fishForm.costPrice ?? ""}
                  onChange={updateField}
                  required
                />
              </label>

              <label>
                Species
                <input
                  name="species"
                  placeholder="Species"
                  value={fishForm.species}
                  onChange={updateField}
                  required
                />
              </label>

              <label>
                Quantity
                <input
                  type="number"
                  name="quantity"
                  min="0"
                  placeholder="Quantity"
                  value={fishForm.quantity}
                  onChange={updateField}
                  required
                />
              </label>

              <label>
                Description
                <input
                  name="description"
                  placeholder="Description"
                  value={fishForm.description}
                  onChange={updateField}
                />
              </label>

                <label className="flex flex-col gap-2">
                  Photo(Optional)
                  <div className="flex items-center gap-3 rounded-lg border border-sky-100/15 bg-[#052235] p-3">
                    {fishForm.photoUrl ? (
                      <img
                        className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                        src={fishForm.photoUrl}
                        alt="Selected item preview"
                      />
                    ) : (
                      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-[#0a4261] text-2xl">
                        🐟
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handlePhoto}
                      className="block w-full text-sm text-[#a8c6cc] file:mr-3 file:rounded-lg file:border-0 file:bg-[#75bec4] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#052d45] hover:file:bg-[#86d0d6]"
                    />
                  </div>
                  <small>JPG or PNG only, maximum 3 MB.</small>
                </label>

              <div className="form-actions">
                <button type="submit">
                  {editingFishId ? "Update Item" : "Add"}
                </button>
                <button type="button" onClick={() => setFormOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="category-tabs">
        <button
          type="button"
          className={categoryView === "Fish" ? "active" : ""}
          onClick={() => setCategoryView("Fish")}
        >
          Fish
        </button>
        <button
          type="button"
          className={categoryView === "Fish Food" ? "active" : ""}
          onClick={() => setCategoryView("Fish Food")}
        >
          Fish Food
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {fish
          .filter((item) => (item.category || "Fish") === categoryView)
          .map((item) => (
            <article
              key={item._id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-sky-100/[.09] bg-white/[.035] transition hover:border-[#73c4ca]/40 hover:shadow-[0_10px_25px_rgba(0,12,31,.25)]"
            >
              {/* Image on top — full width, square */}
              <div className="relative aspect-square w-full overflow-hidden bg-[#0a4261]">
                {item.photoUrl ? (
                  <img
                    className="h-full w-full object-cover transition group-hover:scale-105"
                    src={item.photoUrl}
                    alt={item.name}
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-4xl"
                    aria-label="No item photo"
                  >
                    🐟
                  </div>
                )}
                <span className="absolute right-2 top-2 rounded-md bg-black/50 px-2 py-1 font-['Poppins'] text-[15px] font-medium text-[#bce9e9] backdrop-blur-sm">
                  {item.species || item.description || "Fish"}
                </span>
              </div>

              {/* Details below */}
              <div className="flex flex-1 flex-col px-3 pb-3 pt-1.5">
                <h3 className="truncate font-['Poppins'] text-[20px] font-semibold text-[#d9ecef] m-0">
                  {item.name}
                </h3>
                <p className="mt-2 font-['Fraunces'] text-lg font-bold text-[#73c4ca]">
                  {formatPeso(item.price)}
                </p>

                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-['Poppins'] text-[11px] text-[#a8c6cc]">
                  <span>
                    Stock: <b className="text-[#d9ecef]">{item.quantity}</b>
                  </span>
                  {item.tankId?.name && <span>{item.tankId.name}</span>}
                </div>

                {/* Actions as real buttons, pinned to bottom */}
                <div className="mt-3 flex gap-2 pt-1">
                  <button
                    type="button"
                    className="flex-1 rounded-lg border border-sky-100/15 bg-white/[.04] py-1.5 font-['Poppins'] text-xs font-medium text-[#a8c6cc] transition hover:border-[#73c4ca]/50 hover:bg-white/[.08] hover:text-[#bce9e9]"
                    onClick={() => {
                      setEditingFishId(item._id);
                      setFishForm({
                        ...item,
                        tankId: item.tankId?._id || item.tankId || "",
                        price: item.price ?? "",
                        category: item.category || "Fish",
                      });
                      setFormOpen(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-lg border border-red-300/15 bg-red-400/[.06] py-1.5 font-['Poppins'] text-xs font-medium text-[#e9a7a7] transition hover:border-red-300/40 hover:bg-red-400/15 hover:text-[#ffd0d0]"
                    onClick={() => onDelete(item._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        {!fish.some((item) => (item.category || "Fish") === categoryView) && (
          <p className="col-span-full rounded-xl border border-dashed border-sky-100/15 p-6 text-center font-['Poppins'] text-sm text-[#9bbec7]">
            No {categoryView.toLowerCase()} items yet.
          </p>
        )}
      </div>
    </section>
  );
}

export default Inventory;

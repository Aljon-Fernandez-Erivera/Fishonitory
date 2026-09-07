import { useState } from "react";

import { formatPeso } from "../shared/salesUtils.js";

function Inventory({
  fish,
  tanks,
  fishForm,
  setFishForm,
  editingFishId,
  setEditingFishId,
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
  const handlePhoto = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      setFishForm((previous) => ({ ...previous, photoUrl: reader.result }));
    reader.readAsDataURL(file);
  };

  return (
    <section className="dashboard-page">
      <div className="page-heading">
        <div>
          <h2>Fish Inventory</h2>
          <p>Add fish and fish food for your store.</p>
        </div>
        <button
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
      <dialog open={formOpen} aria-labelledby="fish-dialog-title">
        <h3 id="fish-dialog-title">
          {editingFishId ? "Edit Fish" : "Add Fish"}
        </h3>
        <form
          className="dashboard-form"
          onSubmit={(event) => {
            onSubmit(event);
            setFormOpen(false);
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

          <label>
            Photo
            <input type="file" accept="image/*" onChange={handlePhoto} />
          </label>

          <button type="submit">{editingFishId ? "Update Fish" : "Add"}</button>

          <button type="button" onClick={() => setFormOpen(false)}>
            Cancel
          </button>
        </form>
      </dialog>
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
      <div className="report-card inventory-table-wrap">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Species/Details</th>
              <th>Category</th>
              <th>Tank</th>
              <th>Price</th>
              <th>Cost Price</th>
              <th>Stock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {fish
              .filter((item) => (item.category || "Fish") === categoryView)
              .map((item) => (
                <tr key={item._id}>
                  <td>{item.name}</td>
                  <td>{item.species || item.description || "-"}</td>
                  <td>{item.category || "Fish"}</td>
                  <td>{item.tankId?.name || "-"}</td>
                  <td>{formatPeso(item.price)}</td>
                  <td>{formatPeso(item.costPrice)}</td>
                  <td>{item.quantity}</td>
                  <td>
                    <button
                      type="button"
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
                    </button>{" "}
                    <button type="button" onClick={() => onDelete(item._id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {!fish.some((item) => (item.category || "Fish") === categoryView) && (
          <p>No {categoryView.toLowerCase()} items yet.</p>
        )}
      </div>
    </section>
  );
}

export default Inventory;

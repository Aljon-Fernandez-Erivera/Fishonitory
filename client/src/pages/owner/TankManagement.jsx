import { useState } from "react";

const tankStatuses = [
  "Needs Cleaning",
  "Clean",
  "For Replacement",
  "Damaged",
  "Under Maintenance",
  "Available",
];

function TankManagement({
  tanks,
  tankForm,
  setTankForm,
  editingTankId,
  setEditingTankId,
  onSubmit,
  onDelete,
}) {
  const [formOpen, setFormOpen] = useState(false);
  const updateField = (event) =>
    setTankForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));

  return (
    <section className="dashboard-page">
      <div className="page-heading">
        <div>
          <h2>Tank Management</h2>
          <p>Add and manage your store tanks.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingTankId(null);
            setTankForm({
              name: "",
              status: "Needs Cleaning",
              nextMaintenance: "",
              notes: "",
            });
            setFormOpen(true);
          }}
        >
          Add Tank
        </button>
      </div>
      <dialog open={formOpen} aria-labelledby="tank-dialog-title">
        <h3 id="tank-dialog-title">
          {editingTankId ? "Edit Tank" : "Add Tank"}
        </h3>
        <form
          className="dashboard-form"
          onSubmit={(event) => {
            onSubmit(event);
            setFormOpen(false);
          }}
        >
          <label>
            Tank Name
            <input
              name="name"
              placeholder="Tank name"
              value={tankForm.name}
              onChange={updateField}
              required
            />
          </label>
          <label>
            Status
            <select
              name="status"
              value={tankForm.status}
              onChange={updateField}
              required
            >
              <option value="">Select status</option>
              {tankStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label>
            Next Maintenance
            <input
              type="date"
              name="nextMaintenance"
              value={tankForm.nextMaintenance}
              onChange={updateField}
            />
          </label>
          <label>
            Maintenance Notes
            <input
              name="notes"
              placeholder="Maintenance notes"
              value={tankForm.notes}
              onChange={updateField}
            />
          </label>
          <button type="submit">
            {editingTankId ? "Update Tank" : "Add Tank"}
          </button>
          <button type="button" onClick={() => setFormOpen(false)}>
            Cancel
          </button>
        </form>
      </dialog>
      <ul>
        {tanks.map((tank) => (
          <li key={tank._id}>
            {tank.name} - {tank.status} - next maintenance:{" "}
            {tank.nextMaintenance || "Not scheduled"}
            {tank.updatedBy && (
              <small>
                {" "}
                (last updated by{" "}
                {tank.updatedBy.staffName ||
                  tank.updatedBy.ownerName ||
                  tank.updatedBy.staffPosition ||
                  "Account"})
              </small>
            )}
            <button
              type="button"
              onClick={() => {
                setEditingTankId(tank._id);
                setTankForm({
                  ...tank,
                  nextMaintenance: tank.nextMaintenance
                    ? tank.nextMaintenance.slice(0, 10)
                    : "",
                });
                setFormOpen(true);
              }}
            >
              Edit
            </button>
            <button type="button" onClick={() => onDelete(tank._id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default TankManagement;

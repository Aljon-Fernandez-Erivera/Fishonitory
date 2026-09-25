import { useState } from "react";

const tankStatuses = ["Under Maintenance", "Available"];

const statusStyles = {
  "Under Maintenance": "bg-sky-400/15 text-sky-200",
  Available: "bg-[#75bec4]/15 text-[#aee0e1]",
};

const frequencyOptions = [
  { label: "No repeat", value: "" },
  { label: "Every week", value: "7" },
  { label: "Every 2 weeks", value: "14" },
  { label: "Every month", value: "30" },
];

const fieldClass =
  "mt-1.5 box-border w-full rounded-xl border border-sky-100/10 bg-white/[.06] px-3 py-2.5 font-['Poppins'] text-sm text-[#d9ecef] outline-none [color-scheme:dark] focus:border-[#73c4ca]";

const todayISODate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function TankManagement({
  tanks,
  fish = [],
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
  const openAdd = () => {
    setEditingTankId(null);
    setTankForm({
      name: "",
      status: "Available",
      nextMaintenance: "",
      notes: "",
    });
    setFormOpen(true);
  };
  const openEdit = (tank) => {
    setEditingTankId(tank._id);
    setTankForm({
      ...tank,
      nextMaintenance: tank.nextMaintenance
        ? tank.nextMaintenance.slice(0, 10)
        : "",
    });
    setFormOpen(true);
  };

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[0.16em] text-[#73c4ca]">
            Tank Management
          </p>
          <p className="mt-3 font-['Poppins'] text-sm text-[#9bbec7]">
            Keep every tank maintained, stocked, and ready.
          </p>
        </div>
        <button
          className="rounded-full border border-sky-100/15 bg-white/[.05] px-4 py-2.5 font-['Poppins'] text-sm font-medium text-[#d9ecef] transition hover:bg-white/[.1] focus:outline-none focus:ring-2 focus:ring-[#73c4ca]"
          type="button"
          onClick={openAdd}
        >
          Add Tank
        </button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-sky-100/10 bg-[#062d48]/80 shadow-[0_14px_35px_rgba(0,12,31,.14)]">
        <div className="border-b border-sky-100/10 px-5 py-4">
          <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[.14em] text-[#73c4ca]">
            Tanks & ponds
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse font-['Poppins'] text-sm">
            <thead className="bg-white/[.025] text-left text-xs uppercase tracking-[.1em] text-[#89afb9]">
              <tr>
                <th className="px-5 py-3 font-medium">Tank</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Fish</th>
                <th className="px-5 py-3 font-medium">Next maintenance</th>
                <th className="px-5 py-3 font-medium">Last updated</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tanks.map((tank) => {
                const tankFish = fish.filter(
                  (item) =>
                    String(item.tankId?._id || item.tankId) ===
                    String(tank._id),
                );

                return (
                  <tr
                    className="border-t border-sky-100/[.07] text-[#b7d2d7]"
                    key={tank._id}
                  >
                    <td className="px-5 py-4 font-medium text-[#d9ecef]">
                      {tank.name}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs ${
                          statusStyles[tank.status] ||
                          "bg-white/10 text-[#aee0e1]"
                        }`}
                      >
                        {tank.status}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {tankFish.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {tankFish.map((item) => (
                            <span
                              key={item._id}
                              className="rounded-full bg-white/[.06] px-2 py-1 text-xs text-[#b9dfe1]"
                            >
                              {item.name}
                              <span className="ml-1 text-[#789faa]">
                                ×{item.quantity}
                              </span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-[#5f8790]">
                          No fish assigned
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {tank.nextMaintenance || "Not scheduled"}
                    </td>
                    <td className="px-5 py-4 text-xs text-[#789faa]">
                      {tank.updatedBy?.staffName ||
                        tank.updatedBy?.ownerName ||
                        tank.updatedBy?.staffPosition ||
                        "—"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button
                          className="rounded-full border border-emerald-200/25 bg-white/[.05] px-3 py-1.5 font-['Poppins'] text-xs font-medium text-[#8ccdd0] transition hover:bg-emerald-500/20 hover:text-emerald-100 hover:border-emerald-300/40 focus:outline-none focus:ring-2 focus:ring-[#73c4ca]"
                          type="button"
                          onClick={() => openEdit(tank)}
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-full border border-red-200/25 bg-white/[.05] px-3 py-1.5 font-['Poppins'] text-xs font-medium text-red-200/80 transition hover:bg-red-500/20 hover:text-red-100 hover:border-red-300/40 focus:outline-none focus:ring-2 focus:ring-[#73c4ca]"
                          type="button"
                          onClick={() => onDelete(tank._id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!tanks.length && (
          <p className="px-5 py-12 text-center font-['Poppins'] text-sm text-[#789faa]">
            No tanks have been added yet.
          </p>
        )}
      </div>
      <dialog
        open={formOpen}
        aria-labelledby="tank-dialog-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) setFormOpen(false);
        }}
        className="w-[min(560px,calc(100%-2rem))] rounded-2xl border border-sky-100/15 bg-[#062d48] p-0 text-[#d9ecef] shadow-2xl backdrop:bg-[#021a31]/75"
      >
        <div className="p-5 ">
          <h3 id="tank-dialog-title" className="m-0 font-['Fraunces'] text-2xl">
            {editingTankId ? "Edit Tank" : "Add Tank"}
          </h3>
          <form
            className="mt-5 grid gap-4 sm:grid-cols-2"
            onSubmit={(event) => {
              onSubmit(event);
              setFormOpen(false);
            }}
          >
            <label className="font-['Poppins'] text-xs font-medium text-[#a9c8cf]">
              Tank Name
              <input
                className={fieldClass}
                type="date"
                name="nextMaintenance"
                min={todayISODate()}
                value={tankForm.nextMaintenance}
                onChange={updateField}
              />
            </label>
            <label className="font-['Poppins'] text-xs font-medium text-[#a9c8cf]">
              Status
              <select
                className={fieldClass}
                name="status"
                value={tankForm.status}
                onChange={updateField}
                required
              >
                {tankStatuses.map((status) => (
                  <option className="bg-[#062d48]" key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="font-['Poppins'] text-xs font-medium text-[#a9c8cf]">
              Next Maintenance
              <input
                className={fieldClass}
                type="date"
                name="nextMaintenance"
                value={tankForm.nextMaintenance}
                onChange={updateField}
              />
            </label>
            <label className="font-['Poppins'] text-xs font-medium text-[#a9c8cf]">
              Repeat Cleaning
              <select
                className={fieldClass}
                name="cleaningFrequencyDays"
                value={tankForm.cleaningFrequencyDays || ""}
                onChange={updateField}
              >
                {frequencyOptions.map((opt) => (
                  <option
                    className="bg-[#062d48]"
                    key={opt.value}
                    value={opt.value}
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="font-['Poppins'] text-xs font-medium text-[#a9c8cf]">
              Maintenance Notes
              <input
                className={fieldClass}
                name="notes"
                placeholder="Maintenance notes"
                value={tankForm.notes}
                onChange={updateField}
              />
            </label>
            <div className="flex gap-3 sm:col-span-2">
              <button
                className="rounded-full bg-[#75bec4] px-5 py-2.5 font-['Poppins'] text-sm font-medium text-[#052d45]"
                type="submit"
              >
                {editingTankId ? "Update Tank" : "Add Tank"}
              </button>
              <button
                className="rounded-full border border-sky-100/15 bg-white/[.05] px-4 py-2.5 font-['Poppins'] text-sm font-medium text-[#d9ecef] transition hover:bg-white/[.1] focus:outline-none focus:ring-2 focus:ring-[#73c4ca]"
                type="button"
                onClick={() => setFormOpen(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </section>
  );
}

export default TankManagement;

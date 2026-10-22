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

const formatMaintenanceDate = (value) => {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not scheduled"
    : date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      });
};

function TankManagement({
  tanks,
  fish = [],
  stockLoading = false,
  tankForm,
  setTankForm,
  editingTankId,
  setEditingTankId,
  onSubmit,
  onDelete,
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [viewTank, setViewTank] = useState(null);
  const updateField = (event) =>
    setTankForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  const openAdd = () => {
    setEditingTankId(null);
    setTankForm({
      name: "",
      capacity: "",
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
        <div className="hidden overflow-x-auto xl:block">
          <table className="w-full min-w-[720px] border-collapse font-['Poppins'] text-sm">
            <thead className="bg-white/[.025] text-left text-xs uppercase tracking-[.1em] text-[#89afb9]">
              <tr>
                <th className="px-5 py-3 font-medium">Tank</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Fish / Capacity</th>
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
                const occupied = tankFish.reduce(
                  (sum, item) => sum + Number(item.quantity || 0),
                  0,
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
                      <div className="mb-2 flex items-center gap-2 text-xs">
                        <span>
                          {stockLoading
                            ? "Loading stock counts…"
                            : `${occupied} / ${tank.capacity || "—"} capacity`}
                        </span>
                        {!stockLoading && tank.capacity && occupied > tank.capacity ? (
                          <span className="rounded-full bg-red-300/15 px-2 py-1 text-red-200">
                            Over capacity · no space
                          </span>
                        ) : !stockLoading && tank.capacity && occupied === Number(tank.capacity) ? (
                          <span className="rounded-full bg-red-300/15 px-2 py-1 font-semibold text-red-200">
                            Full capacity · no space
                          </span>
                        ) : !stockLoading && tank.capacity && occupied / tank.capacity >= 0.9 ? (
                          <span className="rounded-full bg-amber-300/15 px-2 py-1 text-amber-200">
                            Near capacity
                          </span>
                        ) : null}
                      </div>
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
                      {formatMaintenanceDate(tank.nextMaintenance)}
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
                          className="rounded-full border  bg-white/[.05] border-sky-100/15 px-3 py-1.5 text-xs text-[#b9dfe1]"
                          type="button"
                          onClick={() => setViewTank(tank)}
                        >
                          View more
                        </button>
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
        <div className="divide-y divide-sky-100/[.08] xl:hidden">
          {tanks.map((tank) => {
            const tankFish = fish.filter(
              (item) =>
                String(item.tankId?._id || item.tankId) === String(tank._id),
            );
            const occupied = tankFish.reduce(
              (sum, item) => sum + Number(item.quantity || 0),
              0,
            );
            return (
              <article
                key={tank._id}
                className="space-y-3 p-4 font-['Poppins'] text-sm text-[#b7d2d7]"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="m-0 min-w-0 truncate font-medium text-[#d9ecef]">
                    {tank.name}
                  </h3>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${statusStyles[tank.status] || "bg-white/10 text-[#aee0e1]"}`}
                  >
                    {tank.status}
                  </span>
                </div>
                <p className="m-0 text-xs">
                  <span className="text-[#789faa]">Capacity: </span>
                  {stockLoading
                    ? "Loading stock counts…"
                    : `${occupied} / ${tank.capacity || "—"}`}
                </p>
                {!stockLoading && tank.capacity && occupied >= Number(tank.capacity) ? (
                  <span className="inline-flex rounded-full bg-red-300/15 px-2.5 py-1 text-xs font-semibold text-red-200">
                    {occupied > Number(tank.capacity)
                      ? "Over capacity · no space"
                      : "Full capacity · no space"}
                  </span>
                ) : !stockLoading && tank.capacity && occupied / tank.capacity >= 0.9 ? (
                  <span className="inline-flex rounded-full bg-amber-300/15 px-2.5 py-1 text-xs text-amber-200">
                    Near capacity
                  </span>
                ) : null}
                <div className="flex flex-wrap gap-1.5">
                  {tankFish.length ? (
                    tankFish.map((item) => (
                      <span
                        key={item._id}
                        className="rounded-full bg-white/[.06] px-2 py-1 text-xs text-[#b9dfe1]"
                      >
                        {item.name} ×{item.quantity}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[#789faa]">
                      No fish assigned
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-sky-100/[.07] pt-3 text-xs">
                  <p className="m-0">
                    <span className="block text-[#789faa]">
                      Next maintenance
                    </span>
                    {formatMaintenanceDate(tank.nextMaintenance)}
                  </p>
                  <p className="m-0">
                    <span className="block text-[#789faa]">
                      Last updated by
                    </span>
                    {tank.updatedBy?.staffName ||
                      tank.updatedBy?.ownerName ||
                      tank.updatedBy?.staffPosition ||
                      "—"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="min-h-10 rounded-lg border border-sky-100/15 bg-white/[.05] px-3 py-2 text-xs text-[#b9dfe1]"
                    type="button"
                    onClick={() => setViewTank(tank)}
                  >
                    View more
                  </button>
                  <button
                    className="min-h-10 rounded-lg border border-emerald-200/25 bg-white/[.05] px-3 py-2 text-xs text-[#8ccdd0]"
                    type="button"
                    onClick={() => openEdit(tank)}
                  >
                    Edit
                  </button>
                  <button
                    className="min-h-10 rounded-lg border border-red-200/25 bg-white/[.05] px-3 py-2 text-xs text-red-200/80"
                    type="button"
                    onClick={() => onDelete(tank._id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        {!tanks.length && (
          <p className="px-5 py-12 text-center font-['Poppins'] text-sm text-[#789faa]">
            No tanks have been added yet.
          </p>
        )}
      </div>
      {formOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#021a31]/75 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setFormOpen(false);
          }}
        >
          <div
            aria-labelledby="tank-dialog-title"
            aria-modal="true"
            className="w-[min(560px,calc(100%-2rem))] rounded-2xl border border-sky-100/15 bg-[#062d48] p-0 text-[#d9ecef] shadow-2xl"
            role="dialog"
          >
            <div className="p-5">
              <h3
                id="tank-dialog-title"
                className="m-0 font-['Fraunces'] text-2xl"
              >
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
                    type="text"
                    name="name"
                    value={tankForm.name}
                    placeholder="e.g. Display Tank A"
                    onChange={updateField}
                    required
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
                      <option
                        className="bg-[#062d48]"
                        key={status}
                        value={status}
                      >
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="font-['Poppins'] text-xs font-medium text-[#a9c8cf]">
                  Capacity (total fish)
                  <input
                    className={fieldClass}
                    type="number"
                    min="1"
                    name="capacity"
                    value={tankForm.capacity || ""}
                    onChange={updateField}
                    placeholder="e.g. 100"
                  />
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
          </div>
        </div>
      )}
      {viewTank && (
  <div
    className="fixed inset-0 z-50 flex items-end justify-center bg-[#021a31]/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    role="presentation"
    onClick={(event) => {
      if (event.target === event.currentTarget) setViewTank(null);
    }}
  >
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="tank-details-title"
      className="max-h-[92dvh] w-full max-w-[560px] overflow-y-auto rounded-t-3xl border border-sky-100/15 bg-[#062d48] p-5 text-[#d9ecef] shadow-2xl sm:rounded-2xl sm:p-6"
    >
      <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20 sm:hidden" />

      <div className="flex items-start justify-between gap-3 border-b border-sky-100/10 pb-4">
        <div className="min-w-0">
          <p className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-[.15em] text-[#73c4ca]">
            Tank details
          </p>
          <h3
            id="tank-details-title"
            className="mt-1 break-words font-['Fraunces'] text-2xl font-medium"
          >
            {viewTank.name}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setViewTank(null)}
          aria-label="Close details"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-sky-100/10 bg-white/[.05] text-[#a8c6cc] transition hover:bg-white/[.1] hover:text-[#d9ecef]"
        >
          ✕
        </button>
      </div>

      <dl className="mt-5 grid gap-4 font-['Poppins'] text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-[#89afb9]">Status</dt>
          <dd className="mt-1">
            <span
              className={`rounded-full px-2.5 py-1 text-xs ${
                statusStyles[viewTank.status] || "bg-white/10 text-[#aee0e1]"
              }`}
            >
              {viewTank.status || "—"}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[#89afb9]">Capacity</dt>
          <dd className="mt-1">
            {viewTank.capacity ? `${viewTank.capacity} fish` : "Not set"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[#89afb9]">Current occupancy</dt>
          <dd className="mt-1">
            {stockLoading
              ? "Loading stock count…"
              : fish
                  .filter(
                    (item) =>
                      String(item.tankId?._id || item.tankId) ===
                      String(viewTank._id),
                  )
                  .reduce((sum, item) => sum + Number(item.quantity || 0), 0)}{" "}
            {!stockLoading && "fish"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[#89afb9]">Next maintenance</dt>
          <dd className="mt-1">
            {formatMaintenanceDate(viewTank.nextMaintenance)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[#89afb9]">Cleaning frequency</dt>
          <dd className="mt-1">
            {viewTank.cleaningFrequencyDays
              ? `Every ${viewTank.cleaningFrequencyDays} days`
              : "Not set"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[#89afb9]">Last updated by</dt>
          <dd className="mt-1">
            {viewTank.updatedBy?.staffName ||
              viewTank.updatedBy?.ownerName ||
              viewTank.updatedBy?.staffPosition ||
              "—"}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-[#89afb9]">Fish assigned</dt>
          <dd className="mt-1">
            {fish
              .filter(
                (item) =>
                  String(item.tankId?._id || item.tankId) ===
                  String(viewTank._id),
              )
              .map((item) => `${item.name} (${item.quantity})`)
              .join(", ") || "No fish assigned"}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-[#89afb9]">Maintenance notes</dt>
          <dd className="mt-1 whitespace-pre-wrap break-words">
            {viewTank.notes || "No notes"}
          </dd>
        </div>
      </dl>

      <button
        className="mt-6 min-h-11 w-full rounded-full bg-[#75bec4] px-5 py-2.5 font-['Poppins'] text-sm font-medium text-[#052d45] transition hover:bg-[#91d2d5] sm:w-auto"
        type="button"
        onClick={() => setViewTank(null)}
      >
        Close
      </button>
    </section>
  </div>
)}
    </section>
  );
}

export default TankManagement;

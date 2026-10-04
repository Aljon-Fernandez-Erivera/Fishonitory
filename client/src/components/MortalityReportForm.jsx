import { useState } from "react";

const suspectedCauses = [
  "Disease",
  "Water quality",
  "Handling stress",
  "Transport",
  "Predation",
  "Cannibalism",
  "Unknown",
];

const lifeStages = ["Fry", "Juvenile", "Adult", "Broodstock"];

const observedSigns = [
  "Lethargy",
  "White spots",
  "Fin rot",
  "Gasping",
  "Red patches",
];

const disposalMethods = ["Burial", "Incineration", "Composting"];

const treatmentOptions = [
  "None",
  "Salt bath",
  "Antibiotic",
  "Water change",
  "Isolation / quarantine",
];

const OTHER_TREATMENT = "__other_treatment__";

const getManilaDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const getManilaTime = () =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());

const getId = (value) => String(value?._id || value?.id || value || "");

function MortalityReportForm({
  fish = [],
  tanks = [],
  staff = [],
  user,
  onSubmit,
}) {
  const liveFish = fish.filter((item) => item.category !== "Fish Food");

  const ownerId = getId(user?.id || user?._id);

  const ownerOption = {
    _id: ownerId,
    staffName: user?.ownerName || user?.staffName || user?.email || "Owner",
    staffPosition: user?.role === "Owner" ? "Owner" : user?.staffPosition,
  };

  const recorderOptions =
    user?.role === "Owner" ? [ownerOption, ...staff] : [user].filter(Boolean);

  const [form, setForm] = useState({
    date: getManilaDate(),
    time: getManilaTime(),
    recordedBy: user?.role === "Owner" ? ownerId : getId(user),
    tankId: "",
    fishId: "",
    lifeStage: "Adult",
    batchNumber: "",
    initialStockCount: "",
    quantity: "",
    suspectedCause: "Unknown",
    signsObserved: [],
    treatmentGiven: "None",
    disposalMethod: "Burial",
    remarks: "",
  });

  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [treatmentMode, setTreatmentMode] = useState("select");

  const selectedFish =
    liveFish.find((item) => getId(item) === form.fishId) || liveFish[0];

  const selectedTankId =
    form.tankId || getId(selectedFish?.tankId) || getId(tanks[0]);

  const selectedRecorderId = form.recordedBy || getId(recorderOptions[0]);

  const initialStockValue =
    form.initialStockCount || String(selectedFish?.quantity ?? "");

  const update = (event) => {
    const { name, value } = event.target;

    if (name === "fishId") {
      const nextFish = liveFish.find((item) => getId(item) === value);

      setForm((current) => ({
        ...current,
        fishId: value,
        tankId: getId(nextFish?.tankId) || current.tankId || getId(tanks[0]),
        initialStockCount: String(nextFish?.quantity ?? ""),
      }));

      return;
    }

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const toggleSign = (sign) => {
    setForm((current) => ({
      ...current,
      signsObserved: current.signsObserved.includes(sign)
        ? current.signsObserved.filter((item) => item !== sign)
        : [...current.signsObserved, sign],
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const formElement = event.currentTarget;

    setFormError("");

    const quantity = Number(form.quantity);
    const initialStockCount = Number(initialStockValue);

    if (!selectedFish || !selectedTankId || !selectedRecorderId) {
      setFormError(
        "Select a recorder, facility, and species before submitting.",
      );
      return;
    }

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > initialStockCount ||
      quantity > Number(selectedFish.quantity)
    ) {
      setFormError(
        "Dead count must be within both the starting and available stock counts.",
      );
      return;
    }

    setBusy(true);

    try {
      const payload = new FormData();

      payload.append("fishId", getId(selectedFish));
      payload.append("tankId", selectedTankId);
      payload.append("species", selectedFish.species || selectedFish.name);
      payload.append("lifeStage", form.lifeStage);
      payload.append("batchNumber", form.batchNumber.trim());
      payload.append("initialStockCount", initialStockValue);
      payload.append("quantity", String(quantity));
      payload.append("suspectedCause", form.suspectedCause);
      payload.append("signsObserved", JSON.stringify(form.signsObserved));
      payload.append("treatmentGiven", form.treatmentGiven.trim() || "None");
      payload.append("disposalMethod", form.disposalMethod);
      payload.append("remarks", form.remarks.trim());
      payload.append("recordedBy", selectedRecorderId);

      payload.append(
        "recordedAt",
        new Date(`${form.date}T${form.time}:00+08:00`).toISOString(),
      );

      if (photo) {
        payload.append("photo", photo);
      }

      const result = await onSubmit(payload);

      if (result === false) {
        return;
      }

      setForm((current) => ({
        ...current,
        date: getManilaDate(),
        time: getManilaTime(),
        batchNumber: "",
        initialStockCount: String(selectedFish.quantity - quantity),
        quantity: "",
        signsObserved: [],
        treatmentGiven: "None",
        remarks: "",
      }));

      setTreatmentMode("select");

      setPhoto(null);

      const fileInput = formElement.querySelector('input[type="file"]');

      if (fileInput) {
        fileInput.value = "";
      }
    } catch (error) {
      setFormError(error.message || "Could not save this mortality report.");
    } finally {
      setBusy(false);
    }
  };

  const fieldClass =
    "grid gap-1.5 font-['Poppins'] text-xs font-medium text-[#a9c8cf]";

  const inputClass =
    "min-h-10 w-full rounded-xl border border-sky-100/10 bg-white/[.06] px-3 py-2.5 font-['Poppins'] text-sm text-[#d9ecef] outline-none focus:border-[#73c4ca]";

  return (
    <form
      className="grid gap-4 rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-5 shadow-[0_14px_35px_rgba(0,12,31,.14)] sm:p-6"
      onSubmit={handleSubmit}
    >
      <div>
        <h3 className="m-0 font-['Fraunces'] text-2xl font-medium text-[#d9ecef]">
          Record mortality
        </h3>

        <p className="mt-1 font-['Poppins'] text-xs text-[#9bbec7]">
          Log the loss and reduce available fish stock.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={fieldClass}>
          Date

          <input
            className={inputClass}
            type="date"
            name="date"
            value={form.date}
            onChange={update}
            required
          />
        </label>

        <label className={fieldClass}>
          Time of checking

          <input
            className={inputClass}
            type="time"
            name="time"
            value={form.time}
            onChange={update}
            required
          />
        </label>

        <label className={fieldClass}>
          Recorded by

          <select
            className={inputClass}
            name="recordedBy"
            value={selectedRecorderId}
            onChange={update}
            required
            disabled={user?.role !== "Owner"}
          >
            {recorderOptions.map((person) => (
              <option
                className="bg-[#062d48]"
                key={getId(person)}
                value={getId(person)}
              >
                {person.staffName ||
                  person.ownerName ||
                  person.email ||
                  "Staff"}
              </option>
            ))}
          </select>
        </label>

        <label className={fieldClass}>
          Facility / tank / pond / aquarium

          <select
            className={inputClass}
            name="tankId"
            value={selectedTankId}
            onChange={update}
            required
          >
            <option className="bg-[#062d48]" value="">
              Select facility
            </option>

            {tanks.map((tank) => (
              <option
                className="bg-[#062d48]"
                key={getId(tank)}
                value={getId(tank)}
              >
                {tank.name}
              </option>
            ))}
          </select>
        </label>

        <label className={fieldClass}>
          Species / variety

          <select
            className={inputClass}
            name="fishId"
            value={form.fishId || getId(selectedFish)}
            onChange={update}
            required
          >
            {liveFish.map((item) => (
              <option
                className="bg-[#062d48]"
                key={getId(item)}
                value={getId(item)}
              >
                {item.species || item.name}
                {item.name && item.name !== item.species
                  ? ` (${item.name})`
                  : ""}
              </option>
            ))}
          </select>
        </label>

        <label className={fieldClass}>
          Life stage

          <select
            className={inputClass}
            name="lifeStage"
            value={form.lifeStage}
            onChange={update}
          >
            {lifeStages.map((stage) => (
              <option className="bg-[#062d48]" key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
        </label>

        <label className={fieldClass}>
          Batch / lot number

          <input
            className={inputClass}
            name="batchNumber"
            value={form.batchNumber}
            onChange={update}
            maxLength={100}
          />
        </label>

        <label className={fieldClass}>
          Initial stock count (start of day)

          <input
            className={inputClass}
            type="number"
            name="initialStockCount"
            min="1"
            step="1"
            value={initialStockValue}
            onChange={update}
            required
          />
        </label>

        <label className={fieldClass}>
          Number of dead

          <input
            className={inputClass}
            type="number"
            name="quantity"
            min="1"
            max={selectedFish?.quantity || undefined}
            step="1"
            value={form.quantity}
            onChange={update}
            required
          />
        </label>

        <label className={fieldClass}>
          Suspected cause

          <select
            className={inputClass}
            name="suspectedCause"
            value={form.suspectedCause}
            onChange={update}
          >
            {suspectedCauses.map((cause) => (
              <option className="bg-[#062d48]" key={cause} value={cause}>
                {cause}
              </option>
            ))}
          </select>
        </label>

        {/* TREATMENT GIVEN: DROPDOWN OR CUSTOM INPUT */}
        <label className={fieldClass}>
          Treatment given

          {treatmentMode === "custom" ? (
            <>
              <input
                className={inputClass}
                type="text"
                name="treatmentGiven"
                placeholder="Enter treatment given"
                value={form.treatmentGiven}
                onChange={update}
                maxLength={200}
                required
                autoFocus
              />

              <button
                type="button"
                onClick={() => {
                  setTreatmentMode("select");

                  setForm((current) => ({
                    ...current,
                    treatmentGiven: "None",
                  }));
                }}
                className="w-fit bg-transparent p-0 font-['Poppins'] text-xs text-[#73c4ca] underline transition hover:text-[#bce9e9]"
              >
                Choose from the treatment list
              </button>
            </>
          ) : (
            <select
              className={inputClass}
              value={form.treatmentGiven}
              onChange={(event) => {
                const selectedTreatment = event.target.value;

                if (selectedTreatment === OTHER_TREATMENT) {
                  setTreatmentMode("custom");

                  setForm((current) => ({
                    ...current,
                    treatmentGiven: "",
                  }));

                  return;
                }

                setForm((current) => ({
                  ...current,
                  treatmentGiven: selectedTreatment,
                }));
              }}
            >
              {treatmentOptions.map((treatment) => (
                <option
                  className="bg-[#062d48]"
                  key={treatment}
                  value={treatment}
                >
                  {treatment}
                </option>
              ))}

              <option className="bg-[#062d48]" value={OTHER_TREATMENT}>
                Other — enter custom treatment
              </option>
            </select>
          )}
        </label>

        <label className={fieldClass}>
          Disposal method

          <select
            className={inputClass}
            name="disposalMethod"
            value={form.disposalMethod}
            onChange={update}
          >
            {disposalMethods.map((method) => (
              <option className="bg-[#062d48]" key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </label>

        <label className={`${fieldClass} sm:col-span-2`}>
          Photo of dead fish (optional)

          <input
            className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-[#75bec4] file:px-3 file:py-1.5 file:font-medium file:text-[#052d45]`}
            type="file"
            accept="image/jpeg,image/png"
            onChange={(event) => setPhoto(event.target.files?.[0] || null)}
          />

          <span className="font-normal text-[#789faa]">
            JPEG or PNG, up to 3 MB.
          </span>
        </label>

        <fieldset className="grid gap-2 border-0 p-0 sm:col-span-2">
          <legend className="mb-2 font-['Poppins'] text-xs font-medium text-[#a9c8cf]">
            Signs observed
          </legend>

          <div className="flex flex-wrap gap-2">
            {observedSigns.map((sign) => (
              <label
                className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 font-['Poppins'] text-xs ${
                  form.signsObserved.includes(sign)
                    ? "border-[#75bec4]/50 bg-[#75bec4]/15 text-[#d9ecef]"
                    : "border-sky-100/10 bg-white/[.03] text-[#a9c8cf]"
                }`}
                key={sign}
              >
                <input
                  className="accent-[#75bec4]"
                  type="checkbox"
                  checked={form.signsObserved.includes(sign)}
                  onChange={() => toggleSign(sign)}
                />

                {sign}
              </label>
            ))}
          </div>
        </fieldset>

        <label className={`${fieldClass} sm:col-span-2`}>
          Remarks

          <textarea
            className={`${inputClass} min-h-24 p-3`}
            name="remarks"
            value={form.remarks}
            onChange={update}
            maxLength={1000}
            placeholder="Mortality after water change"
          />
        </label>
      </div>

      {formError && (
        <p role="alert" className="m-0 font-['Poppins'] text-xs text-red-200">
          {formError}
        </p>
      )}

      <div className="flex justify-end">
        <button
          className="min-h-11 rounded-full bg-[#75bec4] px-5 py-2.5 font-['Poppins'] text-sm font-semibold text-[#052d45] transition hover:bg-[#91d2d5] disabled:cursor-not-allowed disabled:opacity-50"
          type="submit"
          disabled={busy || !liveFish.length || !tanks.length}
        >
          {busy ? "Saving report…" : "Save mortality report and reduce stock"}
        </button>
      </div>
    </form>
  );
}

export default MortalityReportForm;
import { lazy, Suspense, useCallback, useEffect, useState } from "react";

// Same map picker the registration page uses.
const BusinessLocationPicker = lazy(
  () => import("../../components/BusinessLocationPicker.jsx"),
);

// Same rules as the server (server/utils/validators.js).
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u;

const isHiddenChar = (code) =>
  code <= 0x1f ||
  (code >= 0x7f && code <= 0x9f) ||
  (code >= 0x200b && code <= 0x200f) ||
  (code >= 0x202a && code <= 0x202e) ||
  (code >= 0x2060 && code <= 0x206f) ||
  code === 0xfeff;

const cleanText = (value) =>
  Array.from(
    String(value ?? "")
      .normalize("NFKC")
      .replace(/[\t\n\r]/g, " "),
  )
    .filter((char) => !isHiddenChar(char.codePointAt(0)))
    .join("")
    .replace(/\s+/g, " ");

function validate({ ownerName, phoneNumber }) {
  const errors = {};
  const name = cleanText(ownerName).trim();
  if (name.length < 2 || name.length > 100) {
    errors.ownerName = "Name must be 2-100 characters.";
  } else if (!NAME_PATTERN.test(name)) {
    errors.ownerName =
      "Name can only contain letters, spaces, apostrophes, periods, and hyphens.";
  }

  const phone = String(phoneNumber ?? "").replace(/[\s.()-]/g, "");
  if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
    errors.phoneNumber = "Use international format, for example +639171234567.";
  }
  return { errors, name, phone };
}

const inputClass =
  "mt-1.5 box-border w-full rounded-xl border border-sky-100/10 bg-white/[.07] px-3.5 py-2.5 font-['Poppins'] text-sm text-[#d8f1f1] outline-none transition-all placeholder:text-[#6f96a0] focus:border-[#73c4ca] focus:ring-2 focus:ring-[#73c4ca]/20 disabled:cursor-not-allowed disabled:opacity-50";
const labelClass =
  "block font-['Poppins'] text-[10px] font-semibold tracking-[0.14em] text-[#9ebfc8]";
const errorClass = "mt-1.5 font-['Poppins'] text-xs text-[#ffb4b4]";
const primaryButton =
  "cursor-pointer rounded-full border-0 bg-[#75bec4] px-6 py-2.5 font-['Poppins'] text-sm font-semibold text-[#052d45] transition hover:bg-[#91d2d5] disabled:cursor-not-allowed disabled:opacity-60";
const ghostButton =
  "cursor-pointer rounded-full border border-sky-100/15 bg-white/[.05] px-5 py-2.5 font-['Poppins'] text-sm text-[#cfe6ea] transition hover:bg-white/[.1] disabled:cursor-not-allowed disabled:opacity-60";

/*
  Props
    user      current owner (ownerName, phoneNumber, businessName, businessAddress,
              businessLatitude, businessLongitude)
    onClose()
    onSave({ ownerName, phoneNumber, [businessAddress, businessLatitude, businessLongitude] })
*/
function OwnerEditProfileDialog({ user, onClose, onSave }) {
  const [values, setValues] = useState({
    ownerName: user?.ownerName || "",
    phoneNumber: user?.phoneNumber || "",
  });
  const [address, setAddress] = useState(user?.businessAddress || "");
  const savedLat = Number(user?.businessLatitude);
  const savedLng = Number(user?.businessLongitude);
  const hasSavedPin =
    user?.businessLatitude != null &&
    user?.businessLongitude != null &&
    Number.isFinite(savedLat) &&
    Number.isFinite(savedLng);
  const [location, setLocation] = useState(
    hasSavedPin ? { latitude: savedLat, longitude: savedLng } : null,
  );
  const [locationChanged, setLocationChanged] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const close = useCallback(() => {
    if (!busy) onClose();
  }, [busy, onClose]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      if (mapOpen) setMapOpen(false);
      else close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, mapOpen]);

  const setField = (name) => (event) => {
    let value = cleanText(event.target.value);
    if (name === "phoneNumber") {
      value = value.replace(/[^\d+\s.()-]/g, "").slice(0, 24);
    } else {
      value = value.slice(0, 100);
    }
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: "" }));
    setFormError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;

    const result = validate(values);
    const nextErrors = { ...result.errors };
    if (!location || !address) {
      nextErrors.location = "Pin your business location on the map.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const payload = { ownerName: result.name, phoneNumber: result.phone };
    if (locationChanged) {
      payload.businessAddress = address;
      payload.businessLatitude = location.latitude;
      payload.businessLongitude = location.longitude;
    }

    setBusy(true);
    setFormError("");
    try {
      await onSave(payload);
      onClose();
    } catch (error) {
      setFormError(error.message || "We could not save your profile.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#021a2b]/80 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="owner-edit-profile-title"
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-sky-100/10 bg-[#062d48] p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id="owner-edit-profile-title"
            className="m-0 font-['Fraunces'] text-xl font-semibold text-[#e4f4f6]"
          >
            Edit profile
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="cursor-pointer rounded-full border-0 bg-white/[.06] px-3 py-1 text-lg leading-none text-[#a9c8cf] hover:bg-white/[.12]"
          >
            ×
          </button>
        </div>

        <form className="mt-5 grid gap-4" onSubmit={submit} noValidate>
          <div>
            <label className={labelClass} htmlFor="oe-name">
              OWNER NAME
            </label>
            <input
              id="oe-name"
              className={inputClass}
              type="text"
              autoComplete="name"
              autoFocus
              maxLength={100}
              value={values.ownerName}
              onChange={setField("ownerName")}
              disabled={busy}
            />
            {errors.ownerName && <p className={errorClass}>{errors.ownerName}</p>}
          </div>

          <div>
            <label className={labelClass} htmlFor="oe-phone">
              CONTACT PHONE
            </label>
            <input
              id="oe-phone"
              className={inputClass}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+639171234567"
              maxLength={24}
              value={values.phoneNumber}
              onChange={setField("phoneNumber")}
              disabled={busy}
            />
            {errors.phoneNumber && (
              <p className={errorClass}>{errors.phoneNumber}</p>
            )}
          </div>

          <div>
            <label className={labelClass} htmlFor="oe-address">
              BUSINESS ADDRESS (CHOOSE ON MAP)
            </label>
            <div className="relative">
              <input
                id="oe-address"
                className={`${inputClass} cursor-pointer pr-12`}
                type="text"
                readOnly
                value={address}
                placeholder="Click to choose your location on the map"
                onClick={() => setMapOpen(true)}
                disabled={busy}
              />
              <button
                type="button"
                aria-label={mapOpen ? "Close location map" : "Choose location on map"}
                aria-expanded={mapOpen}
                onClick={() => setMapOpen((open) => !open)}
                disabled={busy}
                className="absolute inset-y-0 right-0 mt-1.5 grid w-11 cursor-pointer place-items-center rounded-r-xl border-0 bg-transparent p-0 text-[#9ebfc8] transition hover:bg-white/[.08] hover:text-[#d9ecef] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
              </button>
            </div>
            {errors.location && <p className={errorClass}>{errors.location}</p>}
            {locationChanged && (
              <p className="mt-1.5 font-['Poppins'] text-[11px] text-emerald-300">
                New location selected. It is saved when you click Save changes.
              </p>
            )}

            {mapOpen && (
              <div className="mt-3 rounded-xl border border-sky-100/10 bg-[#04263c] p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="m-0 font-['Poppins'] text-xs text-[#a9c8cf]">
                    Place the pin at your store, then confirm.
                  </p>
                  <button
                    type="button"
                    onClick={() => setMapOpen(false)}
                    className="cursor-pointer border-0 bg-transparent p-0 font-['Poppins'] text-xs text-[#8cc7cc] underline"
                  >
                    Close map
                  </button>
                </div>

                <Suspense
                  fallback={
                    <div className="grid h-[40vh] min-h-[240px] place-items-center rounded-xl border border-sky-100/10 bg-[#001523] font-['Poppins'] text-xs text-[#91b5bf]">
                      Loading map...
                    </div>
                  }
                >
                  <BusinessLocationPicker
                    value={location}
                    isOpen={mapOpen}
                    onChange={(next) =>
                      setLocation({
                        latitude: next.latitude,
                        longitude: next.longitude,
                      })
                    }
                    onConfirm={(next) => {
                      setLocation({
                        latitude: next.latitude,
                        longitude: next.longitude,
                      });
                      setAddress(cleanText(next.address).trim().slice(0, 255));
                      setLocationChanged(true);
                      setErrors((previous) => ({ ...previous, location: "" }));
                      setMapOpen(false);
                    }}
                    mapClassName="h-[40vh] min-h-[240px]"
                    disabled={busy}
                  />
                </Suspense>
              </div>
            )}
          </div>

          <p className="m-0 font-['Poppins'] text-xs leading-relaxed text-[#9bbec7]">
            Your sign-in email and business name cannot be changed here. To
            change them, contact support.
          </p>

          {formError && (
            <p className="m-0 rounded-xl border border-red-300/20 bg-red-400/10 p-3 font-['Poppins'] text-xs text-[#ffb4b4]">
              {formError}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={ghostButton} onClick={close} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className={primaryButton} disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default OwnerEditProfileDialog;
import {
  sanitizePhoneDigits,
  maxLocalDigitsForCountry,
} from "../shared/phoneUtils.js";

import PasswordRequirements from "../shared/passwordRequirements.jsx";

function ManageStaff({
  staff,
  staffForm,
  setStaffForm,
  staffStep,
  setStaffStep,
  staffModalOpen,
  setStaffModalOpen,
  staffMode,
  staffOtpSeconds,
  staffOtpLoading,
  staffError,
  staffToast,
  deletionModalOpen,
  deletionTarget,
  deletionOtp,
  setDeletionOtp,
  deletionOtpSeconds,
  deletionError,
  onAddStaff,
  onEdit,
  onDelete,
  onConfirmDelete,
  onCloseDeletion,
  onSendOtp,
  onCreateStaff,
  onUpdate,
  onStatus,
}) {
  const updateField = (event) =>
    setStaffForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));

  const timerText = `${String(
    Math.floor(staffOtpSeconds / 60),
  ).padStart(2, "0")}:${String(
    staffOtpSeconds % 60,
  ).padStart(2, "0")}`;

  const deletionTimerText = `${String(
    Math.floor(deletionOtpSeconds / 60),
  ).padStart(2, "0")}:${String(
    deletionOtpSeconds % 60,
  ).padStart(2, "0")}`;

  const inputClass =
    "box-border min-h-[44px] w-full rounded-xl border border-sky-100/10 bg-white/[.06] px-3 py-2.5 font-['Poppins'] text-sm text-[#d9ecef] outline-none placeholder:text-[#668e99] focus:border-[#73c4ca] focus:ring-2 focus:ring-[#73c4ca]/10";

  const selectClass =
    "box-border min-h-[44px] w-full rounded-xl border border-sky-100/10 bg-[#062d48] px-3 py-2.5 font-['Poppins'] text-sm text-[#d9ecef] outline-none focus:border-[#73c4ca] focus:ring-2 focus:ring-[#73c4ca]/10";

  const labelClass =
    "flex flex-col gap-1.5 font-['Poppins'] text-xs font-medium text-[#a9c8cf]";

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-4 px-3 pb-24 sm:gap-6 sm:px-0 sm:pb-6">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[0.16em] text-[#73c4ca]">
            Staff Management
          </p>

          <p className="mt-2 font-['Poppins'] text-sm text-[#9bbec7]">
            Manage your staff accounts.
          </p>
        </div>

        <button
          className="min-h-[44px] w-full rounded-2xl border border-[#73c4ca]/30 bg-[#73c4ca]/10 px-4 py-3 font-['Poppins'] text-sm font-semibold text-[#bce9e9] transition active:scale-[.98] hover:bg-[#73c4ca]/20 sm:w-auto sm:rounded-full sm:py-2.5"
          type="button"
          onClick={onAddStaff}
        >
          + Add Staff
        </button>
      </div>

      {/* STAFF FORM MODAL */}
      {staffModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setStaffModalOpen(false);
            }
          }}
        >
          <div
            className="box-border max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-sky-100/15 bg-[#062d48] p-4 text-[#d9ecef] shadow-2xl sm:max-h-[90vh] sm:rounded-2xl sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-dialog-title"
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20 sm:hidden" />

            <div className="mb-5 flex items-start justify-between gap-3 border-b border-sky-100/10 pb-4">
              <div>
                <p className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-[.15em] text-[#73c4ca]">
                  Staff
                </p>

                <h3
                  id="staff-dialog-title"
                  className="mt-1 font-['Fraunces'] text-2xl font-medium text-[#d9ecef]"
                >
                  {staffMode === "edit"
                    ? "Edit Staff"
                    : staffStep === 1
                      ? "Add Staff"
                      : "Verify Staff"}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setStaffModalOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-xl bg-white/[.05] text-xl text-[#89afb9] hover:bg-white/[.1]"
              >
                ×
              </button>
            </div>

            {staffError && (
              <div className="mb-4 rounded-xl border border-red-300/20 bg-red-400/10 px-3 py-3 font-['Poppins'] text-xs text-red-200">
                {staffError}
              </div>
            )}

            {/* EDIT */}
            {staffMode === "edit" ? (
              <form
                className="grid gap-4"
                onSubmit={onUpdate}
              >
                <label className={labelClass}>
                  Staff Name

                  <input
                    className={inputClass}
                    name="staffName"
                    placeholder="Enter staff name"
                    value={staffForm.staffName}
                    onChange={updateField}
                    required
                  />
                </label>

                <label className={labelClass}>
                  Staff Position

                  <select
                    name="staffPosition"
                    className={selectClass}
                    value={staffForm.staffPosition}
                    onChange={updateField}
                    required
                  >
                    <option value="">
                      Select position
                    </option>

                    <option value="Staff">Staff</option>

                    <option value="Master Staff">
                      Master Staff
                    </option>
                  </select>
                </label>

                <label className={labelClass}>
                  Email

                  <input
                    className={inputClass}
                    type="email"
                    name="staffEmail"
                    placeholder="Enter email"
                    value={staffForm.staffEmail}
                    onChange={updateField}
                    required
                  />
                </label>

                <label className={labelClass}>
                  New Password

                  <input
                    className={inputClass}
                    type="password"
                    name="staffPassword"
                    placeholder="Optional"
                    value={staffForm.staffPassword}
                    onChange={updateField}
                    minLength={8}
                  />
                </label>

                <label className={labelClass}>
                  Phone Number

                  <input
                    className={inputClass}
                    name="staffPhoneNumber"
                    placeholder="Digits only"
                    inputMode="numeric"
                    value={staffForm.staffPhoneNumber}
                    onChange={(event) =>
                      setStaffForm((previous) => ({
                        ...previous,
                        staffPhoneNumber:
                          sanitizePhoneDigits(
                            event.target.value,
                          ).slice(
                            0,
                            maxLocalDigitsForCountry(
                              "PH",
                            ),
                          ),
                      }))
                    }
                    required
                  />
                </label>

                <div className="grid grid-cols-2 gap-2 border-t border-white/[.07] pt-4">
                  <button
                    type="submit"
                    className="min-h-[46px] rounded-xl bg-[#75bec4] px-4 py-2.5 font-['Poppins'] text-sm font-bold text-[#052d45] transition active:scale-[.98] hover:bg-[#91d2d5]"
                  >
                    Save Changes
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setStaffModalOpen(false)
                    }
                    className="min-h-[46px] rounded-xl border border-sky-100/15 bg-white/[.04] px-4 py-2.5 font-['Poppins'] text-sm text-[#c9e1e5]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : staffStep === 1 ? (
              /* CREATE STEP 1 */
              <form
                className="grid gap-4"
                onSubmit={onSendOtp}
              >
                <label className={labelClass}>
                  Staff Name

                  <input
                    className={inputClass}
                    name="staffName"
                    placeholder="Enter staff name"
                    value={staffForm.staffName}
                    onChange={updateField}
                    required
                  />
                </label>

                <label className={labelClass}>
                  Staff Position

                  <select
                    name="staffPosition"
                    value={staffForm.staffPosition}
                    onChange={updateField}
                    required
                    className={selectClass}
                  >
                    <option value="">
                      Select position
                    </option>

                    <option value="Staff">Staff</option>

                    <option value="Master Staff">
                      Master Staff
                    </option>
                  </select>
                </label>

                <label className={labelClass}>
                  Email

                  <input
                    className={inputClass}
                    type="email"
                    name="staffEmail"
                    placeholder="Enter email"
                    value={staffForm.staffEmail}
                    onChange={updateField}
                    required
                  />
                </label>

                <label className={labelClass}>
                  Password

                  <input
                    className={inputClass}
                    type="password"
                    name="staffPassword"
                    placeholder="Enter password"
                    value={staffForm.staffPassword}
                    onChange={updateField}
                    minLength={8}
                    required
                  />

                  <PasswordRequirements
                    password={staffForm.staffPassword}
                  />
                </label>

                <label className={labelClass}>
                  Phone Number

                  <input
                    className={inputClass}
                    name="staffPhoneNumber"
                    placeholder="Digits only"
                    inputMode="numeric"
                    value={staffForm.staffPhoneNumber}
                    onChange={(event) =>
                      setStaffForm((previous) => ({
                        ...previous,
                        staffPhoneNumber:
                          event.target.value
                            .replace(/\D/g, "")
                            .slice(0, 15),
                      }))
                    }
                    required
                  />
                </label>

                <div className="grid grid-cols-2 gap-2 border-t border-white/[.07] pt-4">
                  <button
                    type="submit"
                    disabled={staffOtpLoading}
                    className="min-h-[46px] rounded-xl bg-[#75bec4] px-4 py-2.5 font-['Poppins'] text-sm font-bold text-[#052d45] transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Get OTP
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setStaffModalOpen(false)
                    }
                    className="min-h-[46px] rounded-xl border border-sky-100/15 bg-white/[.04] px-4 py-2.5 font-['Poppins'] text-sm text-[#c9e1e5]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              /* OTP STEP */
              <form
                className="grid gap-4"
                onSubmit={onCreateStaff}
              >
                <div className="rounded-2xl border border-[#73c4ca]/15 bg-[#73c4ca]/[.06] p-4">
                  <p className="font-['Poppins'] text-sm text-[#d9ecef]">
                    Verification code sent to:
                  </p>

                  <p className="mt-1 break-all font-['Poppins'] text-sm font-semibold text-[#73c4ca]">
                    {staffForm.staffEmail}
                  </p>

                  <p className="mt-3 font-['Poppins'] text-xs text-[#9bbec7]">
                    OTP expires in{" "}
                    <strong className="text-[#d9ecef]">
                      {timerText}
                    </strong>
                  </p>
                </div>

                <label className={labelClass}>
                  Verification OTP

                  <input
                    className={`${inputClass} text-center text-xl tracking-[.35em]`}
                    name="otp"
                    placeholder="000000"
                    value={staffForm.otp}
                    onChange={updateField}
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="one-time-code"
                    required
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="submit"
                    disabled={staffOtpSeconds === 0}
                    className="min-h-[46px] rounded-xl bg-[#75bec4] px-4 py-2.5 font-['Poppins'] text-sm font-bold text-[#052d45] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Verify & Create
                  </button>

                  <button
                    type="button"
                    onClick={() => setStaffStep(1)}
                    className="min-h-[46px] rounded-xl border border-sky-100/15 bg-white/[.04] px-4 py-2.5 font-['Poppins'] text-sm text-[#c9e1e5]"
                  >
                    Back
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setStaffModalOpen(false)
                  }
                  className="min-h-[44px] font-['Poppins'] text-xs text-[#89afb9] hover:text-[#d9ecef]"
                >
                  Cancel
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* OTP LOADING */}
      {staffOtpLoading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-sky-100/10 bg-[#062d48] p-6 text-center shadow-2xl">
            <div
              className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-[#73c4ca]"
              aria-hidden="true"
            />

            <h3 className="mt-4 font-['Fraunces'] text-xl text-[#d9ecef]">
              Sending verification code
            </h3>

            <p className="mt-2 font-['Poppins'] text-xs leading-5 text-[#9bbec7]">
              Sending the OTP to the staff email. Please wait.
            </p>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deletionModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              onCloseDeletion();
            }
          }}
        >
          <div
            className="box-border max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-red-200/10 bg-[#062d48] p-4 text-[#d9ecef] shadow-2xl sm:rounded-2xl sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-staff-dialog-title"
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20 sm:hidden" />

            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-[.15em] text-red-300">
                  Security Verification
                </p>

                <h3
                  id="delete-staff-dialog-title"
                  className="mt-1 font-['Fraunces'] text-2xl text-[#d9ecef]"
                >
                  Terminate Staff
                </h3>
              </div>

              <button
                type="button"
                onClick={onCloseDeletion}
                className="grid h-10 w-10 place-items-center rounded-xl bg-white/[.05] text-xl text-[#89afb9]"
              >
                ×
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-red-300/15 bg-red-400/[.06] p-4">
              <p className="font-['Poppins'] text-xs leading-5 text-[#d9ecef]">
                A verification code was sent to your owner
                email.
              </p>

              <p className="mt-2 font-['Poppins'] text-xs leading-5 text-[#9bbec7]">
                Enter the code to permanently delete{" "}
                <strong className="text-[#d9ecef]">
                  {deletionTarget?.staffName ||
                    "this staff"}
                </strong>
                's account.
              </p>

              <p className="mt-3 font-['Poppins'] text-xs text-[#9bbec7]">
                Code expires in{" "}
                <strong className="text-red-200">
                  {deletionTimerText}
                </strong>
              </p>
            </div>

            {deletionError && (
              <div className="mt-4 rounded-xl border border-red-300/20 bg-red-400/10 px-3 py-3 font-['Poppins'] text-xs text-red-200">
                {deletionError}
              </div>
            )}

            <form
              className="mt-4 grid gap-4"
              onSubmit={onConfirmDelete}
            >
              <label className={labelClass}>
                Deletion Verification Code

                <input
                  className={`${inputClass} text-center text-xl tracking-[.35em]`}
                  name="deletionOtp"
                  placeholder="000000"
                  value={deletionOtp}
                  onChange={(event) =>
                    setDeletionOtp(
                      event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6),
                    )
                  }
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="submit"
                  disabled={deletionOtpSeconds === 0}
                  className="min-h-[46px] rounded-xl bg-red-400 px-4 py-2.5 font-['Poppins'] text-sm font-bold text-[#3d0d12] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Terminate
                </button>

                <button
                  type="button"
                  onClick={onCloseDeletion}
                  className="min-h-[46px] rounded-xl border border-sky-100/15 bg-white/[.04] px-4 py-2.5 font-['Poppins'] text-sm text-[#c9e1e5]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST */}
      {staffToast && (
        <div
          className="fixed bottom-20 left-3 right-3 z-[70] rounded-2xl border border-[#73c4ca]/20 bg-[#062d48]/95 px-4 py-3 text-center font-['Poppins'] text-xs text-[#d9ecef] shadow-2xl backdrop-blur-xl sm:bottom-6 sm:left-auto sm:right-6 sm:w-auto"
          role="status"
          aria-live="polite"
        >
          {staffToast}
        </div>
      )}

      {/* STAFF DESKTOP */}
      <div className="hidden overflow-hidden rounded-2xl border border-sky-100/10 bg-[#062d48]/80 shadow-[0_14px_35px_rgba(0,12,31,.14)] md:block">
        <div className="border-b border-sky-100/10 px-5 py-4">
          <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[.14em] text-[#73c4ca]">
            Staff Accounts
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-['Poppins'] text-sm">
            <thead className="bg-white/[.025] text-left text-xs uppercase tracking-[.1em] text-[#89afb9]">
              <tr>
                <th className="px-5 py-3 font-medium">
                  Name
                </th>

                <th className="px-5 py-3 font-medium">
                  Position
                </th>

                <th className="px-5 py-3 font-medium">
                  Email
                </th>

                <th className="px-5 py-3 font-medium">
                  Status
                </th>

                <th className="px-5 py-3 font-medium">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {staff.map((item) => (
                <tr
                  className="border-t border-sky-100/[.07] text-[#b7d2d7]"
                  key={item._id}
                >
                  <td className="px-5 py-4 font-medium text-[#d9ecef]">
                    {item.staffName}
                  </td>

                  <td className="px-5 py-4">
                    {item.staffPosition}
                  </td>

                  <td className="px-5 py-4 text-xs text-[#789faa]">
                    {item.email}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs ${
                        item.accountStatus ===
                        "Disabled"
                          ? "bg-red-200/15 text-red-100"
                          : "bg-[#75bec4]/15 text-[#aee0e1]"
                      }`}
                    >
                      {item.accountStatus || "Active"}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button
                        className="rounded-xl border border-emerald-200/25 bg-white/[.05] px-3 py-1.5 font-['Poppins'] text-xs font-medium text-[#8ccdd0] transition hover:bg-emerald-500/20"
                        type="button"
                        onClick={() => onEdit(item)}
                      >
                        Edit
                      </button>

                      <button
                        className="rounded-xl border border-red-200/25 bg-white/[.05] px-3 py-1.5 font-['Poppins'] text-xs font-medium text-red-200/80 transition hover:bg-red-500/20"
                        type="button"
                        onClick={() => onDelete(item)}
                      >
                        Terminate
                      </button>

                      <button
                        className="rounded-xl border border-amber-200/25 bg-white/[.05] px-3 py-1.5 font-['Poppins'] text-xs font-medium text-[#8ccdd0] transition hover:bg-amber-500/20"
                        type="button"
                        onClick={() =>
                          onStatus(
                            item._id,
                            item.accountStatus ===
                              "Disabled"
                              ? "Active"
                              : "Disabled",
                          )
                        }
                      >
                        {item.accountStatus ===
                        "Disabled"
                          ? "Enable"
                          : "Disable"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!staff.length && (
          <p className="px-5 py-12 text-center font-['Poppins'] text-sm text-[#789faa]">
            No staff accounts have been added yet.
          </p>
        )}
      </div>

      {/* STAFF MOBILE CARDS */}
      <div className="grid gap-3 md:hidden">
        {staff.map((item) => (
          <article
            key={item._id}
            className="rounded-2xl border border-sky-100/[.08] bg-[#062d48]/80 p-4 shadow-[0_8px_25px_rgba(0,12,31,.12)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-['Poppins'] text-base font-semibold text-[#d9ecef]">
                  {item.staffName}
                </h3>

                <p className="mt-1 font-['Poppins'] text-xs text-[#89afb9]">
                  {item.staffPosition}
                </p>

                <p className="mt-2 break-all font-['Poppins'] text-xs text-[#789faa]">
                  {item.email}
                </p>
              </div>

              <span
                className={`shrink-0 rounded-full px-2.5 py-1 font-['Poppins'] text-[10px] ${
                  item.accountStatus === "Disabled"
                    ? "bg-red-200/15 text-red-100"
                    : "bg-[#75bec4]/15 text-[#aee0e1]"
                }`}
              >
                {item.accountStatus || "Active"}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                className="min-h-[42px] rounded-xl border border-sky-100/15 bg-white/[.04] px-3 py-2 font-['Poppins'] text-xs font-medium text-[#a8c6cc] transition active:scale-[.98] hover:bg-white/[.08]"
                type="button"
                onClick={() => onEdit(item)}
              >
                Edit
              </button>

              <button
                className="min-h-[42px] rounded-xl border border-amber-200/20 bg-amber-400/[.06] px-3 py-2 font-['Poppins'] text-xs font-medium text-[#d9c17f] transition active:scale-[.98] hover:bg-amber-400/[.12]"
                type="button"
                onClick={() =>
                  onStatus(
                    item._id,
                    item.accountStatus === "Disabled"
                      ? "Active"
                      : "Disabled",
                  )
                }
              >
                {item.accountStatus === "Disabled"
                  ? "Enable"
                  : "Disable"}
              </button>

              <button
                className="col-span-2 min-h-[42px] rounded-xl border border-red-200/20 bg-red-500/[.06] px-3 py-2 font-['Poppins'] text-xs font-medium text-red-200 transition active:scale-[.98] hover:bg-red-500/[.12]"
                type="button"
                onClick={() => onDelete(item)}
              >
                Terminate Account
              </button>
            </div>
          </article>
        ))}

        {!staff.length && (
          <div className="rounded-2xl border border-dashed border-sky-100/15 px-5 py-12 text-center">
            <p className="font-['Poppins'] text-sm text-[#789faa]">
              No staff accounts have been added yet.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export default ManageStaff;
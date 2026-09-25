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
  const timerText = `${String(Math.floor(staffOtpSeconds / 60)).padStart(2, "0")}:${String(staffOtpSeconds % 60).padStart(2, "0")}`;
  const deletionTimerText = `${String(Math.floor(deletionOtpSeconds / 60)).padStart(2, "0")}:${String(deletionOtpSeconds % 60).padStart(2, "0")}`;

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[0.16em] text-[#73c4ca]">
            STAFF MANAGEMENT
          </p>
          <p className="mt-3 font-['Poppins'] text-sm text-[#9bbec7]">
            Manage your staff accounts.
          </p>
        </div>
        <button
          className="rounded-full border border-sky-100/15 bg-white/[.05] px-4 py-2.5 font-['Poppins'] text-sm font-medium text-[#d9ecef] transition hover:bg-white/[.1] focus:outline-none focus:ring-2 focus:ring-[#73c4ca]"
          type="button"
          onClick={onAddStaff}
        >
          Add Staff
        </button>
      </div>

      <dialog
        open={staffModalOpen}
        aria-labelledby="staff-dialog-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) setStaffModalOpen(false);
        }}
      >
        <h3 id="staff-dialog-title">
          {staffMode === "edit" ? "Edit Staff" : "Add Staff"}
        </h3>
        {staffError && (
          <p className="feedback error" role="alert">
            {staffError}
          </p>
        )}
        {staffMode === "edit" ? (
          <form className="dashboard-form" onSubmit={onUpdate}>
            <label>
              Staff Name
              <input
                name="staffName"
                placeholder="Enter staff name"
                value={staffForm.staffName}
                onChange={updateField}
                required
              />
            </label>
            <label>
              Staff Position
              <select
                name="staffPosition"
                className="w-full rounded-lg border border-sky-100/15 bg-white px-3 py-2 text-sm text-[#052d45]"
                value={staffForm.staffPosition}
                onChange={updateField}
                required
              >
                <option className="bg-white text-[#052d45]" value="">
                  Select position
                </option>
                <option className="bg-white text-[#052d45]" value="Staff">
                  Staff
                </option>
                <option
                  className="bg-white text-[#052d45]"
                  value="Master Staff"
                >
                  Master Staff
                </option>
              </select>
            </label>
            <label>
              Email
              <input
                type="email"
                name="staffEmail"
                placeholder="Enter email"
                value={staffForm.staffEmail}
                onChange={updateField}
                required
              />
            </label>
            <label>
              New Password
              <input
                type="password"
                name="staffPassword"
                placeholder="Optional"
                value={staffForm.staffPassword}
                onChange={updateField}
                minLength={8}
              />
            </label>
            <label>
              Phone Number
              <input
                name="staffPhoneNumber"
                placeholder="Digits only"
                value={staffForm.staffPhoneNumber}
                onChange={(event) =>
                  setStaffForm((previous) => ({
                    ...previous,
                    staffPhoneNumber: sanitizePhoneDigits(
                      event.target.value,
                    ).slice(0, maxLocalDigitsForCountry("PH")),
                  }))
                }
                required
              />
            </label>
            <div className="form-actions">
              <button type="submit">Save Changes</button>
              <button type="button" onClick={() => setStaffModalOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : staffStep === 1 ? (
          <form className="dashboard-form" onSubmit={onSendOtp}>
            <label>
              Staff Name
              <input
                name="staffName"
                placeholder="Enter staff name"
                value={staffForm.staffName}
                onChange={updateField}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-[#9bbec7]">
              Staff Position
              <select
                name="staffPosition"
                value={staffForm.staffPosition}
                onChange={updateField}
                required
                className="w-full rounded-lg border border-sky-100/15 bg-[#062d48] px-3 py-2 text-sm text-[#d9ecef] transition focus:border-[#73c4ca] focus:outline-none focus:ring-2 focus:ring-[#73c4ca]"
              >
                <option value="" className="bg-[#062d48] text-[#789faa]">
                  Select position
                </option>
                <option value="Staff" className="bg-[#062d48] text-[#d9ecef]">
                  Staff
                </option>
                <option
                  value="Master Staff"
                  className="bg-[#062d48] text-[#d9ecef]"
                >
                  Master Staff
                </option>
              </select>
            </label>
            <label>
              Email
              <input
                type="email"
                name="staffEmail"
                placeholder="Enter email"
                value={staffForm.staffEmail}
                onChange={updateField}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                name="staffPassword"
                placeholder="Enter password"
                value={staffForm.staffPassword}
                onChange={updateField}
                minLength={8}
                required
              />
              <PasswordRequirements password={staffForm.staffPassword} />
            </label>
            <label>
              Phone Number
              <input
                name="staffPhoneNumber"
                placeholder="Digits only"
                value={staffForm.staffPhoneNumber}
                onChange={(event) =>
                  setStaffForm((previous) => ({
                    ...previous,
                    staffPhoneNumber: event.target.value.replace(/\D/g, ""),
                  }))
                }
                required
              />
            </label>
            <div className="form-actions">
              <button type="submit" disabled={staffOtpLoading}>
                Get OTP
              </button>
              <button type="button" onClick={() => setStaffModalOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <form className="dashboard-form" onSubmit={onCreateStaff}>
            <p>Enter the OTP sent to {staffForm.staffEmail}.</p>
            <p>OTP expires in {timerText}</p>
            <label>
              Verification OTP
              <input
                name="otp"
                placeholder="6-digit OTP"
                value={staffForm.otp}
                onChange={updateField}
                inputMode="numeric"
                maxLength={6}
                required
              />
            </label>
            <div className="form-actions">
              <button type="submit" disabled={staffOtpSeconds === 0}>
                Verify OTP and Create Staff
              </button>
              <button
                className="rounded-full border border-sky-100/15 bg-white/[.05] px-4 py-2.5 font-['Poppins'] text-sm font-medium text-[#d9ecef] transition hover:bg-white/[.1] focus:outline-none focus:ring-2 focus:ring-[#73c4ca]"
                type="button"
                onClick={() => setStaffStep(1)}
              >
                Back
              </button>
              <button type="button" onClick={() => setStaffModalOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </dialog>

      <dialog
        open={staffOtpLoading}
        className="staff-otp-loading-dialog"
        aria-labelledby="staff-otp-loading-title"
        aria-modal="true"
      >
        <div className="staff-otp-spinner" aria-hidden="true" />
        <div>
          <h3 id="staff-otp-loading-title">Sending verification code</h3>
          <p>Sending the OTP to the staff email. Please wait.</p>
        </div>
      </dialog>

      <dialog
        open={deletionModalOpen}
        aria-labelledby="delete-staff-dialog-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) onCloseDeletion();
        }}
      >
        <h3 id="delete-staff-dialog-title">Confirm staff termination</h3>
        <p>
          A verification code was sent to your owner email. Enter it to
          permanently delete {deletionTarget?.staffName || "this staff"}&apos;s
          account.
        </p>
        <p>Code expires in {deletionTimerText}.</p>
        {deletionError && (
          <p className="feedback error" role="alert">
            {deletionError}
          </p>
        )}
        <form className="dashboard-form" onSubmit={onConfirmDelete}>
          <label>
            Deletion verification code
            <input
              name="deletionOtp"
              placeholder="6-digit code"
              value={deletionOtp}
              onChange={(event) =>
                setDeletionOtp(
                  event.target.value.replace(/\D/g, "").slice(0, 6),
                )
              }
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
            />
          </label>
          <div className="form-actions">
            <button type="submit" disabled={deletionOtpSeconds === 0}>
              Verify and terminate account
            </button>
            <button type="button" onClick={onCloseDeletion}>
              Cancel
            </button>
          </div>
        </form>
      </dialog>

      {staffToast && (
        <div className="staff-toast" role="status" aria-live="polite">
          {staffToast}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-sky-100/10 bg-[#062d48]/80 shadow-[0_14px_35px_rgba(0,12,31,.14)]">
        <div className="border-b border-sky-100/10 px-5 py-4">
          <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[.14em] text-[#73c4ca]">
            Staff accounts
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse font-['Poppins'] text-sm">
            <thead className="bg-white/[.025] text-left text-xs uppercase tracking-[.1em] text-[#89afb9]">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Position</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Actions</th>
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
                  <td className="px-5 py-4">{item.staffPosition}</td>
                  <td className="px-5 py-4 text-xs text-[#789faa]">
                    {item.email}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs ${
                        item.accountStatus === "Disabled"
                          ? "bg-red-200/15 text-red-100"
                          : "bg-[#75bec4]/15 text-[#aee0e1]"
                      }`}
                    >
                      {item.accountStatus || "Active"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-3">
                      <button
                        className="rounded-full border border-emerald-200/25 bg-white/[.05] px-3 py-1.5 font-['Poppins'] text-xs font-medium text-[#8ccdd0] transition hover:bg-emerald-500/20 hover:text-emerald-100 hover:border-emerald-300/40 focus:outline-none focus:ring-2 focus:ring-[#73c4ca]"
                        type="button"
                        onClick={() => onEdit(item)}
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-full border border-red-200/25 bg-white/[.05] px-3 py-1.5 font-['Poppins'] text-xs font-medium text-red-200/80 transition hover:bg-red-500/20 hover:text-red-100 hover:border-red-300/40 focus:outline-none focus:ring-2 focus:ring-[#73c4ca]"
                        type="button"
                        onClick={() => onDelete(item)}
                      >
                        Terminate
                      </button>
                      <button
                        className="rounded-full border border-amber-200/25 bg-white/[.05] px-3 py-1.5 font-['Poppins'] text-xs font-medium text-[#8ccdd0] transition hover:bg-amber-500/20 hover:text-amber-100 hover:border-amber-300/40 focus:outline-none focus:ring-2 focus:ring-[#73c4ca]"
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
    </section>
  );
}

export default ManageStaff;

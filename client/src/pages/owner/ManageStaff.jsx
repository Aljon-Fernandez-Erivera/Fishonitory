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
  staffError,
  onAddStaff,
  onEdit,
  onDelete,
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

  return (
    <section className="dashboard-page">
      <div className="page-heading">
        <div>
          <h2>Staff Management</h2>
          <p>Manage your staff accounts and account status.</p>
        </div>
        <button type="button" onClick={onAddStaff}>
          Add Staff
        </button>
      </div>

      <dialog open={staffModalOpen} aria-labelledby="staff-dialog-title">
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
                value={staffForm.staffPosition}
                onChange={updateField}
                required
              >
                <option value="">Select position</option>
                <option value="Staff">Staff</option>
                <option value="Master Staff">Master Staff</option>
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
                    staffPhoneNumber: event.target.value.replace(/\D/g, ""),
                  }))
                }
                required
              />
            </label>
            <button type="submit">Save Changes</button>
            <button type="button" onClick={() => setStaffModalOpen(false)}>
              Cancel
            </button>
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
            <label>
              Staff Position
              <select
                name="staffPosition"
                value={staffForm.staffPosition}
                onChange={updateField}
                required
              >
                <option value="">Select position</option>
                <option value="Staff">Staff</option>
                <option value="Master Staff">Master Staff</option>
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
            <button type="submit">Get OTP</button>
            <button type="button" onClick={() => setStaffModalOpen(false)}>
              Cancel
            </button>
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
            <button type="submit" disabled={staffOtpSeconds === 0}>
              Verify OTP and Create Staff
            </button>
            <button type="button" onClick={() => setStaffStep(1)}>
              Back
            </button>
            <button type="button" onClick={() => setStaffModalOpen(false)}>
              Cancel
            </button>
          </form>
        )}
      </dialog>

      <ul>
        {staff.map((item) => (
          <li key={item._id}>
            {item.staffName} - {item.staffPosition} - {item.email} -{" "}
            {item.accountStatus || "Active"}
            <button type="button" onClick={() => onEdit(item)}>
              Edit
            </button>
            <button type="button" onClick={() => onDelete(item._id)}>
              Terminate
            </button>
            <button
              type="button"
              onClick={() =>
                onStatus(
                  item._id,
                  item.accountStatus === "Disabled" ? "Active" : "Disabled",
                )
              }
            >
              {item.accountStatus === "Disabled" ? "Enable" : "Disable"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default ManageStaff;

function ManageStaff({
  staff, staffForm, setStaffForm, staffStep, setStaffStep, staffModalOpen, setStaffModalOpen,
  staffMode, staffOtpSeconds, onAddStaff, onEdit, onDelete, onSendOtp, onCreateStaff, onUpdate, onStatus
}) {
  const updateField = (event) => setStaffForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  const timerText = `${String(Math.floor(staffOtpSeconds / 60)).padStart(2, '0')}:${String(staffOtpSeconds % 60).padStart(2, '0')}`;

  return (
    <section className="dashboard-page">
      <div className="page-heading">
        <div>
          <h2>Staff Management</h2>
          <p>Create, edit, disable, or delete staff accounts.</p>
        </div>
        <button type="button" onClick={onAddStaff}>Add Staff</button>
      </div>

      <dialog open={staffModalOpen} aria-labelledby="staff-dialog-title">
        <h3 id="staff-dialog-title">{staffMode === 'edit' ? 'Edit Staff' : 'Add Staff'}</h3>
        {staffMode === 'edit' ? (
          <form className="dashboard-form" onSubmit={onUpdate}>
            <input name="staffName" placeholder="Staff Name" value={staffForm.staffName} onChange={updateField} required />
            <input name="staffPosition" placeholder="Staff Position" value={staffForm.staffPosition} onChange={updateField} required />
            <input type="email" name="staffEmail" placeholder="Staff Email" value={staffForm.staffEmail} onChange={updateField} required />
            <input type="password" name="staffPassword" placeholder="New password (optional)" value={staffForm.staffPassword} onChange={updateField} minLength={8} />
            <input name="staffPhoneNumber" placeholder="Phone Number (digits only)" value={staffForm.staffPhoneNumber} onChange={(event) => setStaffForm((previous) => ({ ...previous, staffPhoneNumber: event.target.value.replace(/\D/g, '') }))} required />
            <button type="submit">Save Changes</button>
            <button type="button" onClick={() => setStaffModalOpen(false)}>Cancel</button>
          </form>
        ) : staffStep === 1 ? (
          <form className="dashboard-form" onSubmit={onSendOtp}>
            <input name="staffName" placeholder="Staff Name" value={staffForm.staffName} onChange={updateField} required />
            <input name="staffPosition" placeholder="Staff Position" value={staffForm.staffPosition} onChange={updateField} required />
            <input type="email" name="staffEmail" placeholder="Staff Email" value={staffForm.staffEmail} onChange={updateField} required />
            <input type="password" name="staffPassword" placeholder="Password" value={staffForm.staffPassword} onChange={updateField} minLength={8} required />
            <input name="staffPhoneNumber" placeholder="Phone Number (digits only)" value={staffForm.staffPhoneNumber} onChange={(event) => setStaffForm((previous) => ({ ...previous, staffPhoneNumber: event.target.value.replace(/\D/g, '') }))} required />
            <button type="submit">Get OTP</button>
            <button type="button" onClick={() => setStaffModalOpen(false)}>Cancel</button>
          </form>
        ) : (
          <form className="dashboard-form" onSubmit={onCreateStaff}>
            <p>Enter the OTP sent to {staffForm.staffEmail}.</p>
            <p>OTP expires in {timerText}</p>
            <input name="otp" placeholder="6-digit OTP" value={staffForm.otp} onChange={updateField} maxLength={6} required />
            <button type="submit" disabled={staffOtpSeconds === 0}>Verify OTP and Create Staff</button>
            <button type="button" onClick={() => setStaffStep(1)}>Back</button>
            <button type="button" onClick={() => setStaffModalOpen(false)}>Cancel</button>
          </form>
        )}
      </dialog>

      <ul>
        {staff.map((item) => (
          <li key={item._id}>
            {item.staffName} - {item.staffPosition} - {item.email} - {item.accountStatus || 'Active'}
            <button type="button" onClick={() => onEdit(item)}>Edit</button>
            <button type="button" onClick={() => onDelete(item._id)}>Delete</button>
            <button type="button" onClick={() => onStatus(item._id, item.accountStatus === 'Disabled' ? 'Active' : 'Disabled')}>
              {item.accountStatus === 'Disabled' ? 'Enable' : 'Disable'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default ManageStaff;

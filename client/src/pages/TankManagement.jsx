function TankManagement({ tanks, tankForm, setTankForm, editingTankId, setEditingTankId, onSubmit, onDelete }) {
  const updateField = (event) => setTankForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));

  return (
    <section className="dashboard-page">
      <h2>Tank Management</h2>
      <form className="dashboard-form" onSubmit={onSubmit}>
        <input name="name" placeholder="Tank name" value={tankForm.name} onChange={updateField} required />
        <input name="status" placeholder="Status" value={tankForm.status} onChange={updateField} required />
        <input type="date" name="nextMaintenance" value={tankForm.nextMaintenance} onChange={updateField} />
        <input name="notes" placeholder="Maintenance notes" value={tankForm.notes} onChange={updateField} />
        <button type="submit">{editingTankId ? 'Update Tank' : 'Add Tank'}</button>
        {editingTankId && <button type="button" onClick={() => { setEditingTankId(null); setTankForm({ name: '', status: 'Needs Cleaning', nextMaintenance: '', notes: '' }); }}>Cancel Edit</button>}
      </form>
      <ul>
        {tanks.map((tank) => (
          <li key={tank._id}>
            {tank.name} - {tank.status} - next maintenance: {tank.nextMaintenance || 'Not scheduled'}
            <button type="button" onClick={() => { setEditingTankId(tank._id); setTankForm({ ...tank, nextMaintenance: tank.nextMaintenance ? tank.nextMaintenance.slice(0, 10) : '' }); }}>Edit</button>
            <button type="button" onClick={() => onDelete(tank._id)}>Delete</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default TankManagement;

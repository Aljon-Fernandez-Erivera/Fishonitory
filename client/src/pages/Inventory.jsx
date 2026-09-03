function Inventory({ fish, fishForm, setFishForm, editingFishId, setEditingFishId, onSubmit, onDelete }) {
  const updateField = (event) => setFishForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  const handlePhoto = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFishForm((previous) => ({ ...previous, photoUrl: reader.result }));
    reader.readAsDataURL(file);
  };

  return (
    <section className="dashboard-page">
      <h2>Fish Inventory</h2>
      <form className="dashboard-form" onSubmit={onSubmit}>

        <input name="name" 
                placeholder="Fish name" 
                value={fishForm.name} 
                onChange={updateField} 
                required 
        />

        <input name="species" 
                placeholder="Species" 
                value={fishForm.species} 
                onChange={updateField} 
                required 
        />

        <input type="number" 
                name="quantity" 
                min="0" 
                placeholder="Quantity" 
                value={fishForm.quantity} 
                onChange={updateField} 
                required 
        />
        
        <input name="description" 
                placeholder="Description" 
                value={fishForm.description} 
                onChange={updateField} 
        />

        <input type="file" 
                accept="image/*" 
                onChange={handlePhoto} 
        />

        <button type="submit">{editingFishId ? 'Update Fish' : 'Add'}</button>

        {editingFishId && <button type="button" onClick={() => { setEditingFishId(null); setFishForm({ name: '', species: '', quantity: '', description: '', photoUrl: '' }); }}>Cancel Edit</button>}
      </form>
      <ul>
        {fish.map((item) => (
          <li key={item._id}>
            {item.name} - {item.species} - quantity: {item.quantity}

            <button type="button" onClick={() => { setEditingFishId(item._id); setFishForm(item); }}>Edit</button>

            <button type="button" onClick={() => onDelete(item._id)}>Delete</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default Inventory;

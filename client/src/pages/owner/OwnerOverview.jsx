import SalesSummary from "../shared/SalesSummary.jsx";

function OwnerOverview({
  staff,
  attendance,
  fish,
  tanks,
  notes,
  sales,
  salesRange,
  onSalesDateChange,
  onAddNote,
  onRefresh,
}) {
  const presentCount = attendance.filter((record) =>
    ["Present", "Late"].includes(record.status),
  ).length;
  const addNote = (event) => {
    event.preventDefault();
    const text = new FormData(event.currentTarget).get("note").trim();
    if (!text) return;
    onAddNote(text);
    event.currentTarget.reset();
  };
  const fishInventory = fish.filter(
    (item) => (item.category || "Fish") !== "Fish Food",
  );
  const foodInventory = fish.filter((item) => item.category === "Fish Food");
  const totalFish = fishInventory.reduce(
    (total, item) => total + item.quantity,
    0,
  );
  const totalFood = foodInventory.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  return (
    <section className="dashboard-page">
      <div className="page-heading">
        <div>
          <h2>Statistics Overview</h2>
          <p>Here is what is happening in your store today.</p>
        </div>
        <button className="secondary-button" type="button" onClick={onRefresh}>
          Refresh Data
        </button>
      </div>
      <div className="stats-grid">
        <article className="stat-card">
          <span>Total Staff</span>
          <strong>{staff.length}</strong>
          <small>Registered staff accounts</small>
        </article>
        <article className="stat-card">
          <span>Attendance Record</span>
          <strong>{presentCount}</strong>
          <small>Attendance entries</small>
        </article>
        <article className="stat-card">
          <span>Fish Quantity</span>
          <strong>{totalFish}</strong>
          <small>Available live units</small>
        </article>
        <article className="stat-card">
          <span>Food Supplies</span>
          <strong>{totalFood}</strong>
          <small>Feed inventory units</small>
        </article>
        <article className="stat-card">
          <span>Total Tanks</span>
          <strong>{tanks.length}</strong>
          <small>Managed tanks</small>
        </article>
      </div>
      <SalesSummary
        sales={sales}
        startDate={salesRange.startDate}
        endDate={salesRange.endDate}
        onDateChange={onSalesDateChange}
      />
      <div className="report-card">
        <h3>Latest Reports</h3>
        <ul>
          {attendance.slice(0, 5).map((record) => (
            <li key={record._id}>
              {record.userId?.staffName ||
                record.userId?.ownerName ||
                record.userId?.email}
              {" - "}
              {record.status} ({record.dateKey},{" "}
              {new Date(record.checkIn).toLocaleString()})
            </li>
          ))}
        </ul>
      </div>
      <div className="report-card notes-panel">
        <div className="notes-heading">
          <div>
            <p className="eyebrow">SHIFT COMMUNICATION</p>
            <h3>Notes for Staff</h3>
          </div>
          <span>
            {notes.length} note{notes.length === 1 ? "" : "s"}
          </span>
        </div>
        <form className="notes-form" onSubmit={addNote}>
          <label>
            New Note
            <textarea
              name="note"
              placeholder="Write an update for the next shift"
              required
            />
          </label>
          <button type="submit">Publish Note</button>
        </form>
        <ul className="notes-list">
          {notes.map((item) => (
            <li className="note-item" key={item._id || item.id}>
              <strong>{item.text}</strong>
              <small>
                {item.authorId?.staffName ||
                  item.authorId?.ownerName ||
                  "Owner"}{" "}
                ·{" "}
                {item.createdAt
                  ? new Date(item.createdAt).toLocaleString()
                  : "Just now"}
              </small>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default OwnerOverview;

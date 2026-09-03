function OwnerOverview({ staff, attendance, fish, tanks, onRefresh }) {
  const presentCount = attendance.filter((record) => record.status === 'Present').length;
  const totalFish = fish.reduce((total, item) => total + item.quantity, 0);

  return (
    <section className="dashboard-page">
      <div className="page-heading">
        <div><h2>Statistics Overview</h2><p>Here is what is happening in your store today.</p></div>
        <button className="secondary-button" type="button" onClick={onRefresh}>Refresh Data</button>
      </div>
      <div className="stats-grid">
        <article className="stat-card"><span>Total Staff</span><strong>{staff.length}</strong><small>Registered staff accounts</small></article>
        <article className="stat-card"><span>Attendance Record</span><strong>{presentCount}</strong><small>Attendance entries</small></article>
        <article className="stat-card"><span>Fish Quantity</span><strong>{totalFish}</strong><small>Total inventory units</small></article>
        <article className="stat-card"><span>Total Tanks</span><strong>{tanks.length}</strong><small>Managed tanks</small></article>
      </div>
      <div className="report-card">
        <h3>Latest Reports</h3>
        <ul>
        {attendance.slice(0, 5).map((record) => (
          <li key={record._id}>
            {record.userId?.staffName || record.userId?.ownerName || record.userId?.email}
            {' - '}{record.status} ({record.dateKey}, {new Date(record.checkIn).toLocaleString()})
          </li>
        ))}
        </ul>
      </div>
    </section>
  );
}

export default OwnerOverview;

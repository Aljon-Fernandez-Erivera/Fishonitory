import { useMemo, useState } from 'react';

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getLocalDateKey(date) {
  return toDateKey(date.getFullYear(), date.getMonth(), date.getDate());
}

function Attendance({ records, staff, onSetStaffAttendance, onDelete }) {
  const today = new Date();
  const [calendarMonth, setCalendarMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(getLocalDateKey(today));
  const [dayFormOpen, setDayFormOpen] = useState(false);

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: firstDay + daysInMonth }, (_, index) => {
      if (index < firstDay) return null;
      const day = index - firstDay + 1;
      return { day, dateKey: toDateKey(year, month, day) };
    });
  }, [calendarMonth]);

  const selectedRecords = records.filter((record) => record.dateKey === selectedDate);
  const recordForStaff = (staffId) => selectedRecords.find((record) => record.userId?._id === staffId);
  const monthLabel = calendarMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const moveMonth = (amount) => {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  return (
    <section className="dashboard-page">
      <div className="page-heading">
        <div>
          <h2>Attendance Calendar</h2>
          <p>Click a day to manage attendance for each staff member.</p>
        </div>
        <button type="button" onClick={() => { setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(getLocalDateKey(new Date())); setDayFormOpen(true); }}>
          Today
        </button>
      </div>

      <div className="calendar-card">
        <div className="calendar-toolbar">
          <button type="button" onClick={() => moveMonth(-1)} aria-label="Previous month">&lt;</button>
          <h3>{monthLabel}</h3>
          <button type="button" onClick={() => moveMonth(1)} aria-label="Next month">&gt;</button>
        </div>
        <div className="calendar-weekdays">
          {weekDays.map((day) => <strong key={day}>{day}</strong>)}
        </div>
        <div className="calendar-grid">
          {calendarDays.map((calendarDay, index) => {
            if (!calendarDay) return <div className="calendar-empty" key={`empty-${index}`} />;
            const dayRecords = records.filter((record) => record.dateKey === calendarDay.dateKey);
            const isSelected = selectedDate === calendarDay.dateKey;
            return (
              <button
                className={isSelected ? 'calendar-day selected' : 'calendar-day'}
                type="button"
                key={calendarDay.dateKey}
                onClick={() => { setSelectedDate(calendarDay.dateKey); setDayFormOpen(true); }}
              >
                <span>{calendarDay.day}</span>
                {dayRecords.length > 0 && <small>{dayRecords.length} record{dayRecords.length === 1 ? '' : 's'}</small>}
                <div className="calendar-statuses">
                  {dayRecords.some((record) => record.status === 'Present') && <i className="status-present">P</i>}
                  {dayRecords.some((record) => record.status === 'Absent') && <i className="status-absent">A</i>}
                  {dayRecords.some((record) => record.status === 'Leave') && <i className="status-leave">L</i>}
                  {dayRecords.some((record) => record.status === 'DayOff') && <i className="status-dayoff">D</i>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <dialog className="attendance-dialog" open={dayFormOpen} aria-labelledby="selected-day-title">
        <h3 id="selected-day-title">Attendance for {selectedDate}</h3>
        <p>Choose the status for each staff member on this calendar day.</p>
        <form onSubmit={(event) => event.preventDefault()}>
          <ul>
            {staff.map((item) => {
              const record = recordForStaff(item._id);
              return (
                <li key={item._id}>
                  <strong>{item.staffName}</strong> <span>{item.staffPosition}</span>
                  <select value={record?.status || ''} onChange={(event) => onSetStaffAttendance(item._id, selectedDate, event.target.value)}>
                    <option value="">Choose status</option>
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="Leave">Leave</option>
                    <option value="DayOff">Day Off</option>
                  </select>
                  {record && <button type="button" onClick={() => onDelete(record._id)}>Delete record</button>}
                </li>
              );
            })}
          </ul>
          <button type="button" onClick={() => setDayFormOpen(false)}>Close</button>
        </form>
      </dialog>

    </section>
  );
}

export default Attendance;

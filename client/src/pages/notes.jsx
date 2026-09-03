import { useState } from 'react';

function Notes() {
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState([]);

  const addNote = (event) => {
    event.preventDefault();
    if (!note.trim()) return;
    setNotes((previous) => [...previous, { id: Date.now(), text: note.trim() }]);
    setNote('');
  };

  return (
    <section className="dashboard-page">
      <h2>Notes</h2>
      <form className="dashboard-form" onSubmit={addNote}>
        <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Write a note" required />
        <button type="submit">Add Note</button>
      </form>
      <ul>{notes.map((item) => <li key={item.id}>{item.text}</li>)}</ul>
    </section>
  );
}

export default Notes;

import { useState } from "react";

function Notes({ notes, onAddNote }) {
  const [note, setNote] = useState("");

  const addNote = (event) => {
    event.preventDefault();
    if (!note.trim()) return;
    onAddNote(note.trim());
    setNote("");
  };

  return (
    <section className="dashboard-page">
      <h2>Notes</h2>
      <form className="dashboard-form" onSubmit={addNote}>
        <label>
          New Note
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Write a note"
            required
          />
        </label>
        <button type="submit">Add Note</button>
      </form>
      <ul>
        {notes.map((item) => (
          <li key={item._id || item.id}>{item.text}</li>
        ))}
      </ul>
    </section>
  );
}

export default Notes;

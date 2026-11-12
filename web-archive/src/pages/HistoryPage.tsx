import { useApp } from '../context/AppContext'

export function HistoryPage() {
  const { history, user } = useApp()

  return (
    <div className="page">
      <header className="page-header">
        <h1>My History</h1>
        <p className="muted">
          Private to <strong>{user?.email}</strong> — dusre accounts ko yeh data nahi dikhta
        </p>
      </header>

      <ul className="list">
        {history.map((h) => (
          <li key={h.id}>
            <strong>{h.action}</strong>
            <span className="muted">
              {h.detail} · {new Date(h.createdAt).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
      {history.length === 0 && <p className="muted">No history yet.</p>}
    </div>
  )
}

import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { userById } from '../lib/storage'

export function DashboardPage() {
  const { user, tasks, teams, notifications, history, today, unreadCount } = useApp()

  const myToday = tasks.filter((t) => t.assigneeId === user?.id && t.dueDate === today)
  const overdue = tasks.filter(
    (t) => t.assigneeId === user?.id && t.dueDate < today && t.status !== 'done',
  )
  const doneToday = myToday.filter((t) => t.status === 'done').length

  return (
    <div className="page">
      <header className="page-header">
        <h1>Dashboard</h1>
        <p className="muted">Hello {user?.name} — {today}</p>
      </header>

      <div className="stats">
        <div className="stat">
          <span className="stat-num">{myToday.length}</span>
          <span className="stat-label">Today tasks</span>
        </div>
        <div className="stat">
          <span className="stat-num">{overdue.length}</span>
          <span className="stat-label">Overdue</span>
        </div>
        <div className="stat">
          <span className="stat-num">
            {doneToday}/{myToday.length || 0}
          </span>
          <span className="stat-label">Done today</span>
        </div>
        <div className="stat">
          <span className="stat-num">{teams.length}</span>
          <span className="stat-label">Teams</span>
        </div>
        <div className="stat">
          <span className="stat-num">{unreadCount}</span>
          <span className="stat-label">Unread alerts</span>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>Today</h2>
          <Link to="/tasks">View all</Link>
        </div>
        {myToday.length === 0 ? (
          <p className="muted">No tasks for today. Assign from Teams.</p>
        ) : (
          <ul className="list">
            {myToday.map((t) => (
              <li key={t.id}>
                <strong>{t.title}</strong>
                <span className="muted">
                  {t.startTime}–{t.endTime} · {t.status} · {t.priority}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Recent notifications</h2>
          <Link to="/notifications">Open</Link>
        </div>
        {notifications.slice(0, 5).length === 0 ? (
          <p className="muted">No notifications yet.</p>
        ) : (
          <ul className="list">
            {notifications.slice(0, 5).map((n) => (
              <li key={n.id}>
                <strong>{n.title}</strong>
                <span className="muted">{n.body}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Your history (private)</h2>
          <Link to="/history">Open</Link>
        </div>
        {history.slice(0, 5).length === 0 ? (
          <p className="muted">No activity yet.</p>
        ) : (
          <ul className="list">
            {history.slice(0, 5).map((h) => (
              <li key={h.id}>
                <strong>{h.action}</strong>
                <span className="muted">
                  {h.detail} · {new Date(h.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {overdue.length > 0 && (
        <section className="panel warn">
          <h2>Overdue</h2>
          <ul className="list">
            {overdue.map((t) => (
              <li key={t.id}>
                <strong>{t.title}</strong>
                <span className="muted">
                  due {t.dueDate} · {userById(t.assigneeId)?.name}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

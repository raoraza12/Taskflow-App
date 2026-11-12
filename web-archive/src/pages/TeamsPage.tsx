import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { TaskPriority, TaskStatus } from '../types'
import { userById } from '../lib/storage'

export function TeamsPage() {
  const {
    user,
    teams,
    tasks,
    today,
    getTeamMembers,
    getMemberRole,
    canManage,
    createTask,
    updateTask,
    users,
    pendingJoinRequests,
    approveJoinRequest,
    declineJoinRequest,
    removeMember,
  } = useApp()

  const [message, setMessage] = useState('')
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.id ?? '')
  const [day, setDay] = useState(today)

  const [assigneeId, setAssigneeId] = useState('')
  const [title, setTitle] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [priority, setPriority] = useState<TaskPriority>('medium')

  const activeTeamId = selectedTeamId || teams[0]?.id || ''
  const members = useMemo(
    () => (activeTeamId ? getTeamMembers(activeTeamId) : []),
    [activeTeamId, getTeamMembers, teams],
  )
  const role = activeTeamId ? getMemberRole(activeTeamId) : null
  const manage = activeTeamId ? canManage(activeTeamId) : false
  const activeTeam = teams.find((t) => t.id === activeTeamId)

  const dayTasks = tasks.filter((t) => t.teamId === activeTeamId && t.dueDate === day)
  const teamPending = pendingJoinRequests.filter((r) => r.teamId === activeTeamId)

  const onAssign = (e: FormEvent) => {
    e.preventDefault()
    if (!activeTeamId) return
    const res = createTask({
      teamId: activeTeamId,
      assigneeId: assigneeId || members[0]?.userId || user!.id,
      title,
      description: '',
      status: 'todo',
      priority,
      dueDate: day,
      startTime,
      endTime,
    })
    if (!res.ok) {
      setMessage(res.error)
      return
    }
    setTitle('')
    setMessage('Task assigned for this day')
  }

  if (teams.length === 0) {
    return (
      <div className="page">
        <h1>Teams</h1>
        <p className="muted">
          Abhi koi team nahi. <Link to="/auth">Auth / Team portal</Link> se create ya join request
          bhejo.
        </p>
        {pendingJoinRequests.length > 0 && (
          <section className="panel">
            <h2>Pending join requests (you own)</h2>
            <PendingList
              requests={pendingJoinRequests}
              onApprove={approveJoinRequest}
              onDecline={declineJoinRequest}
              setMessage={setMessage}
            />
          </section>
        )}
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Teams Portal</h1>
        <p className="muted">
          Daily tasks + members. Create/Join bahar{' '}
          <Link to="/auth">Auth page</Link> pe hai.
        </p>
      </header>

      {message && <p className="banner">{message}</p>}

      {pendingJoinRequests.length > 0 && (
        <section className="panel">
          <h2>Join requests — Approve / Decline</h2>
          <PendingList
            requests={pendingJoinRequests}
            onApprove={approveJoinRequest}
            onDecline={declineJoinRequest}
            setMessage={setMessage}
          />
        </section>
      )}

      <div className="toolbar">
        <select value={activeTeamId} onChange={(e) => setSelectedTeamId(e.target.value)}>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        <span className="muted">Your role: {role}</span>
      </div>

      {activeTeam && manage && (
        <section className="panel creds-box">
          <h2>Team access details (owner/admin)</h2>
          <p>Name: {activeTeam.name}</p>
          <p>Invite code: {activeTeam.inviteCode}</p>
          <p>Password: {activeTeam.joinPassword}</p>
          <p className="muted tiny">Joiners ko teenon chahiye — phir tum Approve/Decline karoge.</p>
        </section>
      )}

      <section className="panel">
        <h2>Members</h2>
        <ul className="list">
          {members.map((m) => {
            const u = userById(m.userId) ?? users.find((x) => x.id === m.userId)
            return (
              <li key={m.id} className="member-row">
                <div>
                  <strong>{u?.name ?? 'Unknown'}</strong>
                  <span className="muted">
                    {u?.email} · {m.role}
                    {u?.emailVerified ? ' · verified' : ''}
                  </span>
                </div>
                {manage && m.role !== 'owner' && (
                  <button
                    type="button"
                    className="btn danger"
                    onClick={() => {
                      const res = removeMember(activeTeamId, m.userId)
                      setMessage(res.ok ? 'Member removed' : res.error)
                    }}
                  >
                    Remove
                  </button>
                )}
              </li>
            )
          })}
        </ul>
        {teamPending.length > 0 && (
          <p className="muted">
            {teamPending.length} pending request(s) for this team — see section above.
          </p>
        )}
      </section>

      <form className="panel form-grid" onSubmit={onAssign}>
        <h2 className="full">Assign task for {day}</h2>
        <label>
          Member
          <select
            value={assigneeId || members[0]?.userId || ''}
            onChange={(e) => setAssigneeId(e.target.value)}
          >
            {members.map((m) => {
              const u = userById(m.userId)
              return (
                <option key={m.id} value={m.userId}>
                  {u?.name}
                </option>
              )
            })}
          </select>
        </label>
        <label>
          Priority
          <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className="full">
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          Start
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </label>
        <label>
          End
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </label>
        <button type="submit" className="btn primary full">
          Assign
        </button>
      </form>

      <section className="panel">
        <h2>
          Day board — {day} ({dayTasks.length} tasks)
        </h2>
        {members.map((m) => {
          const u = userById(m.userId)
          const memberTasks = dayTasks
            .filter((t) => t.assigneeId === m.userId)
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
          return (
            <div key={m.id} className="member-day">
              <h3>
                {u?.name} <span className="muted">({memberTasks.length})</span>
              </h3>
              {memberTasks.length === 0 ? (
                <p className="muted">No tasks this day</p>
              ) : (
                <ul className="task-list compact">
                  {memberTasks.map((t) => (
                    <li key={t.id} className={`task-row prio-${t.priority}`}>
                      <div className="task-main">
                        <strong>
                          {t.startTime}–{t.endTime} · {t.title}
                        </strong>
                        <span className="muted">{t.status}</span>
                      </div>
                      <div className="task-actions">
                        <select
                          value={t.status}
                          onChange={(e) =>
                            updateTask(t.id, { status: e.target.value as TaskStatus })
                          }
                        >
                          <option value="todo">Todo</option>
                          <option value="in_progress">In progress</option>
                          <option value="done">Done</option>
                        </select>
                        <input
                          type="date"
                          value={t.dueDate}
                          onChange={(e) => updateTask(t.id, { dueDate: e.target.value })}
                        />
                        <input
                          type="time"
                          value={t.startTime}
                          onChange={(e) => updateTask(t.id, { startTime: e.target.value })}
                        />
                        <input
                          type="time"
                          value={t.endTime}
                          onChange={(e) => updateTask(t.id, { endTime: e.target.value })}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </section>
    </div>
  )
}

function PendingList({
  requests,
  onApprove,
  onDecline,
  setMessage,
}: {
  requests: { id: string; teamId: string; userId: string; createdAt: string }[]
  onApprove: (id: string) => { ok: true } | { ok: false; error: string }
  onDecline: (id: string) => { ok: true } | { ok: false; error: string }
  setMessage: (m: string) => void
}) {
  const { users, teams } = useApp()
  return (
    <ul className="list">
      {requests.map((r) => {
        const u = users.find((x) => x.id === r.userId)
        const team = teams.find((t) => t.id === r.teamId)
        return (
          <li key={r.id} className="member-row">
            <div>
              <strong>
                {u?.name} → {team?.name}
              </strong>
              <span className="muted">
                {u?.email} · {new Date(r.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="row-actions">
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  const res = onApprove(r.id)
                  setMessage(res.ok ? 'Approved' : res.error)
                }}
              >
                Approve
              </button>
              <button
                type="button"
                className="btn danger"
                onClick={() => {
                  const res = onDecline(r.id)
                  setMessage(res.ok ? 'Declined' : res.error)
                }}
              >
                Decline
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

import { useMemo, useState, type FormEvent } from 'react'
import { useApp } from '../context/AppContext'
import type { TaskPriority, TaskStatus } from '../types'
import { userById } from '../lib/storage'

export function TasksPage() {
  const { user, tasks, teams, today, createTask, updateTask, deleteTask, getTeamMembers } =
    useApp()

  const [filter, setFilter] = useState<'mine' | 'all'>('mine')
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all')
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  const [teamId, setTeamId] = useState(teams[0]?.id ?? '')
  const [assigneeId, setAssigneeId] = useState(user?.id ?? '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [dueDate, setDueDate] = useState(today)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')

  const members = useMemo(
    () => (teamId ? getTeamMembers(teamId) : []),
    [teamId, getTeamMembers, teams],
  )

  const visible = tasks.filter((t) => {
    if (filter === 'mine' && t.assigneeId !== user?.id) return false
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    return true
  })

  const onCreate = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const res = createTask({
      teamId,
      assigneeId: assigneeId || user!.id,
      title,
      description,
      status,
      priority,
      dueDate,
      startTime,
      endTime,
    })
    if (!res.ok) {
      setError(res.error)
      return
    }
    setTitle('')
    setDescription('')
    setShowForm(false)
  }

  if (teams.length === 0) {
    return (
      <div className="page">
        <h1>My Tasks</h1>
        <p className="muted">Pehle Teams page se team banao ya join karo.</p>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page-header row">
        <div>
          <h1>My Tasks</h1>
          <p className="muted">Daily edit allowed — date + time slots</p>
        </div>
        <button type="button" className="btn primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Close' : 'Add task'}
        </button>
      </header>

      <div className="toolbar">
        <select value={filter} onChange={(e) => setFilter(e.target.value as 'mine' | 'all')}>
          <option value="mine">Assigned to me</option>
          <option value="all">All team tasks I can see</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | TaskStatus)}
        >
          <option value="all">All status</option>
          <option value="todo">Todo</option>
          <option value="in_progress">In progress</option>
          <option value="done">Done</option>
        </select>
      </div>

      {showForm && (
        <form className="panel form-grid" onSubmit={onCreate}>
          <label>
            Team
            <select
              value={teamId}
              onChange={(e) => {
                setTeamId(e.target.value)
                setAssigneeId(user?.id ?? '')
              }}
              required
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Assignee
            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} required>
              {members.map((m) => {
                const u = userById(m.userId)
                return (
                  <option key={m.id} value={m.userId}>
                    {u?.name ?? m.userId} ({m.role})
                  </option>
                )
              })}
            </select>
          </label>
          <label className="full">
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label className="full">
            Description
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </label>
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
              <option value="todo">Todo</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
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
          <label>
            Due date
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
          <label>
            Start time
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </label>
          <label>
            End time
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </label>
          {error && <p className="error full">{error}</p>}
          <button type="submit" className="btn primary full">
            Save task
          </button>
        </form>
      )}

      <ul className="task-list">
        {visible.map((t) => {
          const team = teams.find((x) => x.id === t.teamId)
          const assignee = userById(t.assigneeId)
          return (
            <li key={t.id} className={`task-row prio-${t.priority}`}>
              <div className="task-main">
                <strong>{t.title}</strong>
                <span className="muted">
                  {team?.name} · {assignee?.name} · {t.dueDate} · {t.startTime}–{t.endTime}
                </span>
                {t.description && <p className="desc">{t.description}</p>}
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
                  title="Change day anytime"
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
                <button type="button" className="btn danger" onClick={() => deleteTask(t.id)}>
                  Delete
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      {visible.length === 0 && <p className="muted">No tasks match filters.</p>}
    </div>
  )
}

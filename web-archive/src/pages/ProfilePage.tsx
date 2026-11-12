import { useState, type FormEvent } from 'react'
import { useApp } from '../context/AppContext'
import { store } from '../lib/storage'

export function ProfilePage() {
  const {
    user,
    teams,
    history,
    myJoinRequests,
    setInitialAppPassword,
    changeAppPassword,
  } = useApp()

  const [newPass, setNewPass] = useState('')
  const [currentPass, setCurrentPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [msg, setMsg] = useState('')

  if (!user) return null

  const owned = store.getTeams().filter((t) => t.ownerId === user.id)

  const onSetPassword = (e: FormEvent) => {
    e.preventDefault()
    setMsg('')
    if (newPass !== confirmPass) {
      setMsg('Passwords do not match')
      return
    }
    const res = setInitialAppPassword(newPass)
    setMsg(res.ok ? 'App password saved on your portal' : res.error)
    if (res.ok) {
      setNewPass('')
      setConfirmPass('')
    }
  }

  const onChangePassword = (e: FormEvent) => {
    e.preventDefault()
    setMsg('')
    if (newPass !== confirmPass) {
      setMsg('Passwords do not match')
      return
    }
    const res = changeAppPassword(currentPass, newPass)
    setMsg(res.ok ? 'App password changed' : res.error)
    if (res.ok) {
      setCurrentPass('')
      setNewPass('')
      setConfirmPass('')
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>My Portal</h1>
        <p className="muted">Sirf tumhari details — dusre accounts pe nahi dikhti</p>
      </header>

      <section className="panel profile-card">
        <div className="profile-row">
          {user.picture ? (
            <img src={user.picture} alt="" className="avatar" />
          ) : (
            <div className="avatar placeholder">{user.name.slice(0, 1).toUpperCase()}</div>
          )}
          <div>
            <h2>{user.name}</h2>
            <p className="muted">{user.email}</p>
            <p className="ok-text">Google verified email</p>
          </div>
        </div>
        <ul className="detail-list">
          <li>
            <span>User ID</span>
            <strong>{user.id}</strong>
          </li>
          <li>
            <span>Google ID</span>
            <strong>{user.googleId}</strong>
          </li>
          <li>
            <span>Joined</span>
            <strong>{new Date(user.createdAt).toLocaleString()}</strong>
          </li>
          <li>
            <span>Teams</span>
            <strong>{teams.length}</strong>
          </li>
          <li>
            <span>Teams owned</span>
            <strong>{owned.length}</strong>
          </li>
        </ul>
      </section>

      <section className="panel">
        <h2>App password</h2>
        <p className="muted">
          Yeh Google password nahi — app portal ka password. Change yahin se hoga.
        </p>
        {!user.appPassword ? (
          <form className="form-grid" onSubmit={onSetPassword}>
            <label>
              New password
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                required
                minLength={4}
              />
            </label>
            <label>
              Confirm
              <input
                type="password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                required
                minLength={4}
              />
            </label>
            <button type="submit" className="btn primary full">
              Set password
            </button>
          </form>
        ) : (
          <form className="form-grid" onSubmit={onChangePassword}>
            <label className="full">
              Current password
              <input
                type="password"
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                required
              />
            </label>
            <label>
              New password
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                required
                minLength={4}
              />
            </label>
            <label>
              Confirm
              <input
                type="password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                required
                minLength={4}
              />
            </label>
            <button type="submit" className="btn primary full">
              Change password
            </button>
          </form>
        )}
        {msg && <p className="banner">{msg}</p>}
      </section>

      <section className="panel">
        <h2>My teams (saved)</h2>
        {teams.length === 0 ? (
          <p className="muted">No teams yet.</p>
        ) : (
          <ul className="list">
            {teams.map((t) => (
              <li key={t.id}>
                <strong>{t.name}</strong>
                <span className="muted">
                  Code: {t.inviteCode}
                  {t.ownerId === user.id ? ` · Pass: ${t.joinPassword} (owner only)` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>My join requests</h2>
        {myJoinRequests.length === 0 ? (
          <p className="muted">No join requests.</p>
        ) : (
          <ul className="list">
            {myJoinRequests.map((r) => {
              const team = store.getTeams().find((t) => t.id === r.teamId)
              return (
                <li key={r.id}>
                  <strong>{team?.name ?? 'Team'}</strong>
                  <span className="muted">
                    {r.status} · {new Date(r.createdAt).toLocaleString()}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>Recent private history</h2>
        <ul className="list">
          {history.slice(0, 8).map((h) => (
            <li key={h.id}>
              <strong>{h.action}</strong>
              <span className="muted">
                {h.detail} · {new Date(h.createdAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

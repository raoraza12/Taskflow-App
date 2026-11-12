import { NavLink, Outlet } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export function Layout() {
  const { user, logout, unreadCount } = useApp()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">TaskFlow</div>
        <div className="user-block">
          {user?.picture ? (
            <img src={user.picture} alt="" className="avatar sm" />
          ) : (
            <div className="avatar sm placeholder">{user?.name?.slice(0, 1).toUpperCase()}</div>
          )}
          <div>
            <p className="user-chip">{user?.name}</p>
            <p className="muted tiny">{user?.email}</p>
          </div>
        </div>
        <nav className="nav">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/tasks">My Tasks</NavLink>
          <NavLink to="/teams">Teams</NavLink>
          <NavLink to="/notifications">
            Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}
          </NavLink>
          <NavLink to="/history">My History</NavLink>
          <NavLink to="/profile">My Portal</NavLink>
          <NavLink to="/auth">Team Access</NavLink>
        </nav>
        <button type="button" className="btn ghost logout" onClick={logout}>
          Logout
        </button>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}

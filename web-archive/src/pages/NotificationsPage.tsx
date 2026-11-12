import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { store, userById } from '../lib/storage'

export function NotificationsPage() {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    requestBrowserNotifications,
    approveJoinRequest,
    declineJoinRequest,
  } = useApp()
  const [permMsg, setPermMsg] = useState('')
  const [actionMsg, setActionMsg] = useState('')

  const enableBrowser = async () => {
    const perm = await requestBrowserNotifications()
    if (perm === 'unsupported') setPermMsg('Browser notifications not supported')
    else if (perm === 'granted') setPermMsg('Browser notifications enabled')
    else setPermMsg('Permission denied — in-app alerts still work')
  }

  return (
    <div className="page">
      <header className="page-header row">
        <div>
          <h1>Notifications</h1>
          <p className="muted">Join requests, approvals, tasks — sirf tumhare account ki</p>
        </div>
        <div className="row-actions">
          <button type="button" className="btn" onClick={enableBrowser}>
            Enable browser alerts
          </button>
          <button type="button" className="btn" onClick={markAllNotificationsRead}>
            Mark all read
          </button>
        </div>
      </header>

      {permMsg && <p className="banner">{permMsg}</p>}
      {actionMsg && <p className="banner">{actionMsg}</p>}

      <ul className="list notif-list">
        {notifications.map((n) => {
          const joinReq = n.relatedJoinRequestId
            ? store.getJoinRequests().find((r) => r.id === n.relatedJoinRequestId)
            : undefined
          const requester = joinReq ? userById(joinReq.userId) : undefined

          return (
            <li key={n.id} className={n.read ? 'read' : 'unread'}>
              <div>
                <strong>{n.title}</strong>
                <p>{n.body}</p>
                {n.kind === 'join_request' && requester && (
                  <p className="muted">
                    From: {requester.name} ({requester.email})
                  </p>
                )}
                <span className="muted">{new Date(n.createdAt).toLocaleString()}</span>
              </div>
              <div className="row-actions">
                {n.kind === 'join_request' &&
                  joinReq?.status === 'pending' &&
                  n.relatedJoinRequestId && (
                    <>
                      <button
                        type="button"
                        className="btn primary"
                        onClick={() => {
                          const res = approveJoinRequest(n.relatedJoinRequestId!)
                          setActionMsg(res.ok ? 'Approved' : res.error)
                          markNotificationRead(n.id)
                        }}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="btn danger"
                        onClick={() => {
                          const res = declineJoinRequest(n.relatedJoinRequestId!)
                          setActionMsg(res.ok ? 'Declined' : res.error)
                          markNotificationRead(n.id)
                        }}
                      >
                        Decline
                      </button>
                    </>
                  )}
                {!n.read && (
                  <button type="button" className="btn" onClick={() => markNotificationRead(n.id)}>
                    Mark read
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      {notifications.length === 0 && <p className="muted">No notifications yet.</p>}
    </div>
  )
}

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_DEMO,
  loadGoogleScript,
  parseGoogleCredential,
} from '../lib/googleAuth'

export function AuthPage() {
  const { user, loginWithGoogle, createTeam, requestJoinTeam } = useApp()

  const googleBtnRef = useRef<HTMLDivElement>(null)
  const [authError, setAuthError] = useState('')
  const [teamMsg, setTeamMsg] = useState('')
  const [createdCreds, setCreatedCreds] = useState<{
    name: string
    code: string
    password: string
  } | null>(null)

  const [teamName, setTeamName] = useState('')
  const [teamPassword, setTeamPassword] = useState('')

  const [joinName, setJoinName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [joinPass, setJoinPass] = useState('')

  const [demoEmail, setDemoEmail] = useState('')
  const [demoName, setDemoName] = useState('')

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || user) return
    let cancelled = false

    const mount = async () => {
      try {
        await loadGoogleScript()
        if (cancelled || !window.google || !googleBtnRef.current) return
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response: { credential: string }) => {
            try {
              const profile = parseGoogleCredential(response.credential)
              const res = loginWithGoogle(profile)
              if (!res.ok) setAuthError(res.error)
            } catch (err) {
              setAuthError(err instanceof Error ? err.message : 'Google sign-in failed')
            }
          },
        })
        googleBtnRef.current.innerHTML = ''
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'continue_with',
          shape: 'rectangular',
        })
      } catch {
        setAuthError('Could not load Google Sign-In')
      }
    }

    void mount()
    return () => {
      cancelled = true
    }
  }, [user, loginWithGoogle])

  const onDemoGoogle = (e: FormEvent) => {
    e.preventDefault()
    setAuthError('')
    const email = demoEmail.trim().toLowerCase()
    if (!email.endsWith('@gmail.com')) {
      setAuthError('Demo mode: use a @gmail.com address (simulates Google-verified mail)')
      return
    }
    const res = loginWithGoogle({
      googleId: `demo_${email}`,
      email,
      name: demoName.trim() || email.split('@')[0],
      emailVerified: true,
      picture: undefined,
    })
    if (!res.ok) setAuthError(res.error)
  }

  const onCreateTeam = (e: FormEvent) => {
    e.preventDefault()
    setTeamMsg('')
    setCreatedCreds(null)
    const res = createTeam({ name: teamName, joinPassword: teamPassword })
    if ('error' in res) {
      setTeamMsg(res.error)
      return
    }
    setCreatedCreds({
      name: res.name,
      code: res.inviteCode,
      password: res.joinPassword,
    })
    setTeamName('')
    setTeamPassword('')
    setTeamMsg('Team created. Share name + code + password carefully.')
  }

  const onJoinTeam = (e: FormEvent) => {
    e.preventDefault()
    setTeamMsg('')
    const res = requestJoinTeam({
      teamName: joinName,
      inviteCode: joinCode,
      joinPassword: joinPass,
    })
    if (!res.ok) {
      setTeamMsg(res.error)
      return
    }
    setJoinName('')
    setJoinCode('')
    setJoinPass('')
    setTeamMsg('Join request sent. Owner must Approve or Decline.')
  }

  return (
    <div className="auth-page gateway">
      <div className="auth-grid">
        <section className="auth-card">
          <h1>TaskFlow</h1>
          <p className="muted">
            Professional team app — only <strong>Google-verified</strong> emails can sign in.
          </p>

          {user ? (
            <div className="signed-box">
              <p>
                Signed in as <strong>{user.name}</strong>
              </p>
              <p className="muted">{user.email} · Google verified</p>
              <Link className="btn primary" to="/">
                Enter dashboard
              </Link>
            </div>
          ) : (
            <>
              {GOOGLE_CLIENT_ID ? (
                <div className="google-wrap">
                  <div ref={googleBtnRef} />
                </div>
              ) : (
                <p className="banner">
                  Set <code>VITE_GOOGLE_CLIENT_ID</code> in <code>.env</code> for real Google Auth.
                  Demo Google sign-in below is for local testing.
                </p>
              )}

              {(GOOGLE_DEMO || !GOOGLE_CLIENT_ID) && (
                <form className="form-stack demo-form" onSubmit={onDemoGoogle}>
                  <h2>Demo Google (verified Gmail)</h2>
                  <label>
                    Name
                    <input value={demoName} onChange={(e) => setDemoName(e.target.value)} />
                  </label>
                  <label>
                    Gmail
                    <input
                      type="email"
                      placeholder="you@gmail.com"
                      value={demoEmail}
                      onChange={(e) => setDemoEmail(e.target.value)}
                      required
                    />
                  </label>
                  <button type="submit" className="btn primary">
                    Continue with verified Gmail (demo)
                  </button>
                  <p className="muted tiny">
                    Demo only — production mein real Google button use hoga.
                  </p>
                </form>
              )}
            </>
          )}

          {authError && <p className="error">{authError}</p>}
        </section>

        <section className="auth-card">
          <h2>Team portal</h2>
          <p className="muted">
            Signup/Sign-in ke paas — pehle Google se login, phir create ya join.
          </p>

          {!user ? (
            <p className="banner">Team create/join ke liye pehle Google verified sign-in karo.</p>
          ) : (
            <>
              <form className="form-stack" onSubmit={onCreateTeam}>
                <h3>Create team</h3>
                <label>
                  Team name
                  <input value={teamName} onChange={(e) => setTeamName(e.target.value)} required />
                </label>
                <label>
                  Team password (pass)
                  <input
                    type="password"
                    value={teamPassword}
                    onChange={(e) => setTeamPassword(e.target.value)}
                    required
                    minLength={4}
                  />
                </label>
                <button type="submit" className="btn primary">
                  Create team
                </button>
              </form>

              <form className="form-stack" onSubmit={onJoinTeam}>
                <h3>Join team</h3>
                <label>
                  Team name
                  <input value={joinName} onChange={(e) => setJoinName(e.target.value)} required />
                </label>
                <label>
                  Invite code
                  <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} required />
                </label>
                <label>
                  Team password
                  <input
                    type="password"
                    value={joinPass}
                    onChange={(e) => setJoinPass(e.target.value)}
                    required
                  />
                </label>
                <button type="submit" className="btn">
                  Request to join
                </button>
              </form>
            </>
          )}

          {teamMsg && <p className="banner">{teamMsg}</p>}
          {createdCreds && (
            <div className="creds-box">
              <p>
                <strong>Save these</strong> — joiners need all three:
              </p>
              <p>Name: {createdCreds.name}</p>
              <p>Code: {createdCreds.code}</p>
              <p>Password: {createdCreds.password}</p>
              <p className="muted tiny">Owner ko join requests Approve/Decline karni hongi.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

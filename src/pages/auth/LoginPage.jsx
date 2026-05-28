import { useEffect, useState } from 'react'
import { loginUser, registerUser, saveAuth } from '../../lib/api'

const initialSignupForm = {
  full_name: '',
  phone_number: '',
  email: '',
  password: '',
  confirm_password: '',
}

export default function LoginPage({ onAuthenticated }) {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [signupForm, setSignupForm] = useState(initialSignupForm)

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 80)
    return () => clearTimeout(timer)
  }, [])

  const handleLogin = async (event) => {
    event.preventDefault()
    if (!loginEmail || !loginPassword) {
      setSuccess('')
      setError('Email and password are required.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const result = await loginUser({
        email: loginEmail,
        password: loginPassword,
      })
      onAuthenticated(result.user)
    } catch (authError) {
      setError(authError.message || 'Unable to login.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (event) => {
    event.preventDefault()
    if (!signupForm.full_name || !signupForm.phone_number || !signupForm.email || !signupForm.password || !signupForm.confirm_password) {
      setSuccess('')
      setError('All signup fields are required.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const result = await registerUser(signupForm)
      if (result?.token && result?.user) {
        saveAuth(result.token, result.user)
        onAuthenticated(result.user)
        return
      }
      setSuccess(result.message || 'Signup successful. You can now login.')
      setActiveTab('login')
      setLoginEmail(signupForm.email)
      setLoginPassword('')
      setSignupForm(initialSignupForm)
    } catch (signupError) {
      setError(signupError.message || 'Unable to signup.')
    } finally {
      setLoading(false)
    }
  }

  const setSignupField = (key, value) => {
    setSignupForm((current) => ({ ...current, [key]: value }))
  }

  return (
    <>
      <style>{`
        .auth-root { min-height: 100vh; display: grid; grid-template-columns: 1.15fr 0.85fr; background: linear-gradient(135deg, #eef6ff 0%, #dcecff 48%, #f7fbff 100%); font-family: 'DM Sans', sans-serif; }
        .auth-hero { position: relative; overflow: hidden; background: linear-gradient(145deg, #032d60 0%, #0b5cab 45%, #1b96ff 100%); color: #fff; padding: 64px 72px; display: flex; align-items: center; }
        .auth-hero::before { content:''; position:absolute; inset:0; background: radial-gradient(circle at 20% 20%, rgba(255,255,255,0.18), transparent 30%), radial-gradient(circle at 80% 75%, rgba(255,255,255,0.14), transparent 28%); }
        .auth-copy { position: relative; z-index: 1; max-width: 520px; opacity: ${mounted ? 1 : 0}; transform: translateY(${mounted ? '0' : '18px'}); transition: all 0.45s ease; }
        .auth-badge { display:inline-flex; align-items:center; gap:10px; padding:10px 16px; border-radius:999px; background: rgba(255,255,255,0.14); border:1px solid rgba(255,255,255,0.18); font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:22px; }
        .auth-title { font-family: 'Sora', sans-serif; font-size: clamp(34px, 4vw, 56px); line-height: 1.06; letter-spacing: -0.03em; margin: 0 0 18px; }
        .auth-title span { color: #8ecdf8; }
        .auth-desc { margin: 0 0 30px; font-size: 15px; line-height: 1.8; color: rgba(255,255,255,0.82); max-width: 420px; }
        .auth-points { display:grid; gap:12px; }
        .auth-point { display:flex; align-items:center; gap:12px; font-size:14px; color: rgba(255,255,255,0.9); }
        .auth-dot { width: 10px; height: 10px; border-radius: 999px; background: #8ecdf8; box-shadow: 0 0 0 6px rgba(142,205,248,0.16); }
        .auth-panel { display:flex; align-items:center; justify-content:center; padding: 32px; }
        .auth-card { width: 100%; max-width: 460px; background: rgba(255,255,255,0.94); border:1px solid rgba(11,92,171,0.14); box-shadow: 0 30px 70px rgba(3,45,96,0.14); border-radius: 28px; padding: 28px; backdrop-filter: blur(14px); }
        .auth-tabs { display:flex; gap:8px; margin-bottom:24px; padding:6px; background:#e7f1ff; border-radius:14px; }
        .auth-tab { flex:1; border:none; border-radius:10px; padding:12px; font-size:13px; font-weight:800; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all .18s ease; }
        .auth-tab.active { background:#0b5cab; color:#fff; box-shadow: 0 8px 18px rgba(11,92,171,0.24); }
        .auth-tab.inactive { background:transparent; color:#0b5cab; }
        .auth-heading { margin:0 0 4px; font-size:28px; font-family:'Sora',sans-serif; color:#032d60; }
        .auth-sub { margin:0 0 22px; font-size:14px; color:#4f6b8a; }
        .auth-form { display:grid; gap:16px; }
        .auth-field { display:grid; gap:7px; }
        .auth-label { font-size:11px; font-weight:800; color:#0b5cab; text-transform:uppercase; letter-spacing:0.08em; }
        .auth-input { width:100%; border:1px solid #bfd8f2; background:#fff; border-radius:14px; padding:13px 14px; font-size:14px; outline:none; font-family:'DM Sans',sans-serif; transition:border-color .18s ease, box-shadow .18s ease; }
        .auth-input:focus { border-color:#0b5cab; box-shadow:0 0 0 4px rgba(27,150,255,0.12); }
        .auth-error, .auth-success { border-radius:14px; padding:12px 14px; font-size:13px; font-weight:700; margin-bottom: 14px; }
        .auth-error { background:#fee2e2; color:#991b1b; }
        .auth-success { background:#dcfce7; color:#166534; }
        .auth-note { border-radius:16px; padding:14px 16px; background:#eef6ff; color:#33506f; border:1px solid #d6e6fb; font-size:13px; line-height:1.7; }
        .auth-note strong { color:#032d60; }
        .auth-submit { border:none; border-radius:14px; background:linear-gradient(135deg, #0b5cab 0%, #032d60 100%); color:#fff; padding:14px 18px; font-size:14px; font-weight:800; cursor:pointer; box-shadow: 0 14px 30px rgba(3,45,96,0.24); }
        .auth-submit:disabled { opacity: 0.72; cursor: not-allowed; }
        @media (max-width: 960px) {
          .auth-root { grid-template-columns: 1fr; }
          .auth-hero { display:none; }
          .auth-panel { padding: 20px; }
        }
        @media (max-width: 560px) {
          .auth-card { padding: 22px 18px; border-radius: 22px; }
        }
      `}</style>

      <div className="auth-root">
        <section className="auth-hero">
          <div className="auth-copy">
            <div className="auth-badge">Zyger ERP</div>
            <h1 className="auth-title">Explore your <span>factory workflow</span> with a live demo experience.</h1>
            <p className="auth-desc">
              Use signup to create a demo account, explore the ERP screens, and understand the full manufacturing workflow.
            </p>
            <div className="auth-points">
              <div className="auth-point"><span className="auth-dot" />Clean Zyger ERP branding for every login user</div>
              <div className="auth-point"><span className="auth-dot" />Signup and login enabled from the same screen</div>
              <div className="auth-point"><span className="auth-dot" />Company details will reflect from your own Company Info data</div>
            </div>
          </div>
        </section>

        <section className="auth-panel">
          <div className="auth-card">
            <div className="auth-tabs">
              <button type="button" className={`auth-tab ${activeTab === 'login' ? 'active' : 'inactive'}`} onClick={() => { setActiveTab('login'); setError(''); setSuccess('') }}>
                Login
              </button>
              <button type="button" className={`auth-tab ${activeTab === 'signup' ? 'active' : 'inactive'}`} onClick={() => { setActiveTab('signup'); setError(''); setSuccess('') }}>
                Signup
              </button>
            </div>

            <h2 className="auth-heading">{activeTab === 'login' ? 'Welcome back' : 'Create demo account'}</h2>
            <p className="auth-sub">
              {activeTab === 'login'
                ? 'Login with your demo account to continue exploring Zyger ERP.'
                : 'Signup to create your own Zyger ERP account.'}
            </p>

            {error && <div className="auth-error">{error}</div>}
            {success && <div className="auth-success">{success}</div>}

            <div className="auth-note">
              <div><strong>Brand:</strong> Zyger ERP</div>
              <div><strong>Demo Flow:</strong> Create your account and explore the app</div>
              <div><strong>Data Shown:</strong> Your own demo company info only</div>
            </div>

            {activeTab === 'login' ? (
              <form className="auth-form" onSubmit={handleLogin} style={{ marginTop: '18px' }}>
                <label className="auth-field">
                  <span className="auth-label">Email</span>
                  <input className="auth-input" type="email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} placeholder="Enter your email" />
                </label>
                <label className="auth-field">
                  <span className="auth-label">Password</span>
                  <input className="auth-input" type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} placeholder="Enter your password" />
                </label>
                <button className="auth-submit" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleSignup} style={{ marginTop: '18px' }}>
                <label className="auth-field">
                  <span className="auth-label">Full Name</span>
                  <input className="auth-input" type="text" value={signupForm.full_name} onChange={(event) => setSignupField('full_name', event.target.value)} placeholder="Enter full name" />
                </label>
                <label className="auth-field">
                  <span className="auth-label">Phone Number</span>
                  <input className="auth-input" type="text" value={signupForm.phone_number} onChange={(event) => setSignupField('phone_number', event.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="9876543210" />
                </label>
                <label className="auth-field">
                  <span className="auth-label">Email</span>
                  <input className="auth-input" type="email" value={signupForm.email} onChange={(event) => setSignupField('email', event.target.value)} placeholder="Enter your email" />
                </label>
                <label className="auth-field">
                  <span className="auth-label">Password</span>
                  <input className="auth-input" type="password" value={signupForm.password} onChange={(event) => setSignupField('password', event.target.value)} placeholder="Minimum 6 characters" />
                </label>
                <label className="auth-field">
                  <span className="auth-label">Confirm Password</span>
                  <input className="auth-input" type="password" value={signupForm.confirm_password} onChange={(event) => setSignupField('confirm_password', event.target.value)} placeholder="Re-enter password" />
                </label>
                <button className="auth-submit" type="submit" disabled={loading}>{loading ? 'Creating account...' : 'Create Account'}</button>
              </form>
            )}
          </div>
        </section>
      </div>
    </>
  )
}

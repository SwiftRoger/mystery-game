import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await api.post('/api/auth/login', { email, password })
      login(res.data.player, res.data.token)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container} className='page-enter'>

      {/* Background grid */}
      <div style={styles.grid} />

      {/* Logo */}
      <div style={styles.logoWrap}>
        <h1 style={styles.logo}>NEBULA NOIR</h1>
        <p style={styles.tagline}>// the truth is buried in the dark //</p>
      </div>

      {/* Card */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>ACCESS TERMINAL</h2>
        <p style={styles.cardSub}>Enter your credentials to continue</p>

        {error && <p style={styles.error}>{error}</p>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>EMAIL</label>
            <input
              style={styles.input}
              type='email'
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder='detective@nebula.space'
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>PASSWORD</label>
            <input
              style={styles.input}
              type='password'
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder='••••••••'
              required
            />
          </div>

          <button
            style={{ ...styles.btn, opacity: loading ? 0.6 : 1 }}
            type='submit'
            disabled={loading}
          >
            {loading ? 'CONNECTING...' : 'ENTER'}
          </button>
        </form>

        <p style={styles.link}>
          No account?{' '}
          <Link to='/register' style={styles.anchor}>
            Register here
          </Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#000',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    position: 'relative',
    overflow: 'hidden',
  },
  grid: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(245,245,240,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(245,245,240,0.03) 1px, transparent 1px)
    `,
    backgroundSize: '60px 60px',
    pointerEvents: 'none',
  },
  logoWrap: {
    textAlign: 'center',
    marginBottom: '2.5rem',
    animation: 'flicker 6s infinite',
  },
  logo: {
    fontFamily: 'var(--font-title)',
    fontSize: 'clamp(1.8rem, 5vw, 3rem)',
    color: '#F5F5F0',
    letterSpacing: '0.15em',
    marginBottom: '0.5rem',
  },
  tagline: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    color: '#888884',
    letterSpacing: '0.2em',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: '#0a0a0a',
    border: '1px solid #222',
    padding: '2.5rem',
    position: 'relative',
  },
  cardTitle: {
    fontFamily: 'var(--font-ui)',
    fontSize: '1.1rem',
    fontWeight: 600,
    letterSpacing: '0.25em',
    color: '#F5F5F0',
    marginBottom: '0.4rem',
  },
  cardSub: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    color: '#888884',
    marginBottom: '2rem',
  },
  error: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8rem',
    color: '#ff4444',
    marginBottom: '1rem',
    padding: '0.75rem',
    border: '1px solid #ff444433',
    background: '#ff44440a',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  label: {
    fontFamily: 'var(--font-ui)',
    fontSize: '0.7rem',
    fontWeight: 600,
    letterSpacing: '0.2em',
    color: '#888884',
  },
  input: {
    background: '#000',
    border: '1px solid #222',
    color: '#F5F5F0',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.9rem',
    padding: '0.75rem 1rem',
    outline: 'none',
    transition: 'border-color 0.2s',
    width: '100%',
  },
  btn: {
    marginTop: '0.5rem',
    background: '#F5F5F0',
    color: '#000',
    border: 'none',
    padding: '0.9rem',
    fontFamily: 'var(--font-ui)',
    fontWeight: 600,
    fontSize: '0.9rem',
    letterSpacing: '0.25em',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  link: {
    marginTop: '1.5rem',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8rem',
    color: '#888884',
    textAlign: 'center',
  },
  anchor: {
    color: '#F5F5F0',
    textDecoration: 'underline',
  },
}
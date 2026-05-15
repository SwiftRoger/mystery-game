import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'

export default function Dashboard() {
  const { player, logout } = useAuth()
  const navigate = useNavigate()
  const [stories, setStories] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [selectedStory, setSelectedStory] = useState(null)
  const [characterName, setCharacterName] = useState('')
  const [showNewGame, setShowNewGame] = useState(false)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [sessionRes, storiesRes] = await Promise.all([
        api.get('/api/game/session'),
        api.get('/api/admin/stories')
      ])
      setActiveSession(sessionRes.data)
      setStories(storiesRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleNewGame = async () => {
    if (!selectedStory || !characterName.trim()) {
      return setError('Pick a case and enter your detective name')
    }

    setStarting(true)
    setError('')

    try {
      await api.post('/api/game/new', {
        character_name: characterName,
        story_id: selectedStory
      })
      navigate('/game')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start game')
    } finally {
      setStarting(false)
    }
  }

  if (loading) return (
    <div style={styles.loading}>
      <p style={styles.loadingText}>// LOADING STATION DATA...</p>
    </div>
  )

  return (
    <div style={styles.container} className='page-enter'>
      <div style={styles.grid} />

      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.logo}>NEBULA NOIR</h1>
        <div style={styles.headerRight}>
          <span style={styles.username}>// {player?.username}</span>
          <button style={styles.logoutBtn} onClick={logout}>LOGOUT</button>
        </div>
      </header>

      {/* Main */}
      <main style={styles.main}>

        {/* Welcome */}
        <div style={styles.welcome}>
          <p style={styles.welcomeText}>
            WELCOME BACK, DETECTIVE <span style={styles.highlight}>{player?.username?.toUpperCase()}</span>
          </p>
          <p style={styles.welcomeSub}>What will it be tonight?</p>
        </div>

        {/* Action Cards */}
        <div style={styles.cards}>

          {/* Continue */}
          <div
            style={{
              ...styles.card,
              opacity: activeSession ? 1 : 0.4,
              cursor: activeSession ? 'pointer' : 'not-allowed',
              animationDelay: '0.1s'
            }}
            className='page-enter'
            onClick={() => activeSession && navigate('/game')}
          >
            <div style={styles.cardIcon}>▶</div>
            <h2 style={styles.cardTitle}>CONTINUE</h2>
            <p style={styles.cardDesc}>
              {activeSession
                ? `${activeSession.character?.name} — Chapter ${activeSession.character?.current_chapter}`
                : 'No active investigation'}
            </p>
            {activeSession && (
              <p style={styles.cardMeta}>
                // {activeSession.chapter?.title}
              </p>
            )}
          </div>

          {/* New Game */}
          <div
            style={{ ...styles.card, cursor: 'pointer', animationDelay: '0.2s' }}
            className='page-enter'
            onClick={() => setShowNewGame(true)}
          >
            <div style={styles.cardIcon}>+</div>
            <h2 style={styles.cardTitle}>NEW CASE</h2>
            <p style={styles.cardDesc}>Start a fresh investigation</p>
            <p style={styles.cardMeta}>// {stories.length} cases available</p>
          </div>

          {/* Graveyard */}
          <div
            style={{ ...styles.card, cursor: 'pointer', animationDelay: '0.3s' }}
            className='page-enter'
            onClick={() => navigate('/graveyard')}
          >
            <div style={styles.cardIcon}>☠</div>
            <h2 style={styles.cardTitle}>GRAVEYARD</h2>
            <p style={styles.cardDesc}>Your retired detectives</p>
            <p style={styles.cardMeta}>// the ones who didn't make it</p>
          </div>

          {/* Admin */}
          <div
            style={{ ...styles.card, cursor: 'pointer', animationDelay: '0.4s' }}
            className='page-enter'
            onClick={() => navigate('/admin')}
          >
            <div style={styles.cardIcon}>⚙</div>
            <h2 style={styles.cardTitle}>ADMIN</h2>
            <p style={styles.cardDesc}>Manage stories and chapters</p>
            <p style={styles.cardMeta}>// story control panel</p>
          </div>

        </div>
      </main>

      {/* New Game Modal */}
      {showNewGame && (
        <div style={styles.overlay}>
          <div style={styles.modal} className='page-enter'>
            <h2 style={styles.modalTitle}>NEW INVESTIGATION</h2>
            <p style={styles.modalSub}>Choose your case and name your detective</p>

            {error && <p style={styles.error}>{error}</p>}

            {/* Story picker */}
            <div style={styles.field}>
              <label style={styles.label}>SELECT CASE</label>
              {stories.length === 0 ? (
                <p style={styles.noStories}>// No cases available. Add one in Admin panel.</p>
              ) : (
                <div style={styles.storyList}>
                  {stories.map(story => (
                    <div
                      key={story.id}
                      style={{
                        ...styles.storyItem,
                        borderColor: selectedStory === story.id ? '#F5F5F0' : '#222'
                      }}
                      onClick={() => setSelectedStory(story.id)}
                    >
                      <p style={styles.storyTitle}>{story.title}</p>
                      <p style={styles.storyDesc}>{story.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Character name */}
            <div style={styles.field}>
              <label style={styles.label}>DETECTIVE NAME</label>
              <input
                style={styles.input}
                type='text'
                value={characterName}
                onChange={e => setCharacterName(e.target.value)}
                placeholder='e.g. Detective Voss'
              />
            </div>

            <div style={styles.modalBtns}>
              <button
                style={styles.cancelBtn}
                onClick={() => {
                  setShowNewGame(false)
                  setError('')
                }}
              >
                CANCEL
              </button>
              <button
                style={{ ...styles.startBtn, opacity: starting ? 0.6 : 1 }}
                onClick={handleNewGame}
                disabled={starting}
              >
                {starting ? 'STARTING...' : 'BEGIN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#000',
    position: 'relative',
    overflow: 'hidden',
  },
  grid: {
    position: 'fixed',
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(245,245,240,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(245,245,240,0.03) 1px, transparent 1px)
    `,
    backgroundSize: '60px 60px',
    pointerEvents: 'none',
  },
  loading: {
    minHeight: '100vh',
    background: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: 'var(--font-mono)',
    color: '#888884',
    fontSize: '0.9rem',
    animation: 'flicker 2s infinite',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem 2rem',
    borderBottom: '1px solid #111',
    position: 'relative',
  },
  logo: {
    fontFamily: 'var(--font-title)',
    fontSize: '1.2rem',
    color: '#F5F5F0',
    letterSpacing: '0.15em',
    animation: 'flicker 8s infinite',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
  },
  username: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8rem',
    color: '#888884',
  },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid #333',
    color: '#888884',
    fontFamily: 'var(--font-ui)',
    fontWeight: 600,
    fontSize: '0.7rem',
    letterSpacing: '0.2em',
    padding: '0.4rem 1rem',
    cursor: 'pointer',
  },
  main: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '4rem 2rem',
  },
  welcome: {
    marginBottom: '3rem',
  },
  welcomeText: {
    fontFamily: 'var(--font-ui)',
    fontSize: '0.85rem',
    letterSpacing: '0.2em',
    color: '#888884',
    marginBottom: '0.5rem',
  },
  highlight: {
    color: '#F5F5F0',
  },
  welcomeSub: {
    fontFamily: 'var(--font-title)',
    fontSize: 'clamp(1.5rem, 3vw, 2.2rem)',
    color: '#F5F5F0',
    letterSpacing: '0.05em',
  },
  cards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
  },
  card: {
    background: '#0a0a0a',
    border: '1px solid #1a1a1a',
    padding: '2rem 1.5rem',
    transition: 'border-color 0.2s, background 0.2s',
  },
  cardIcon: {
    fontSize: '1.5rem',
    color: '#F5F5F0',
    marginBottom: '1rem',
  },
  cardTitle: {
    fontFamily: 'var(--font-ui)',
    fontSize: '1rem',
    fontWeight: 600,
    letterSpacing: '0.2em',
    color: '#F5F5F0',
    marginBottom: '0.5rem',
  },
  cardDesc: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8rem',
    color: '#888884',
    marginBottom: '0.5rem',
  },
  cardMeta: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.7rem',
    color: '#444',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    zIndex: 100,
  },
  modal: {
    background: '#0a0a0a',
    border: '1px solid #222',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '500px',
  },
  modalTitle: {
    fontFamily: 'var(--font-ui)',
    fontSize: '1.1rem',
    fontWeight: 600,
    letterSpacing: '0.25em',
    color: '#F5F5F0',
    marginBottom: '0.4rem',
  },
  modalSub: {
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
  field: {
    marginBottom: '1.25rem',
  },
  label: {
    display: 'block',
    fontFamily: 'var(--font-ui)',
    fontSize: '0.7rem',
    fontWeight: 600,
    letterSpacing: '0.2em',
    color: '#888884',
    marginBottom: '0.5rem',
  },
  noStories: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8rem',
    color: '#444',
    padding: '1rem',
    border: '1px solid #111',
  },
  storyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    maxHeight: '200px',
    overflowY: 'auto',
  },
  storyItem: {
    padding: '0.75rem 1rem',
    border: '1px solid #222',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  storyTitle: {
    fontFamily: 'var(--font-ui)',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#F5F5F0',
    marginBottom: '0.2rem',
  },
  storyDesc: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
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
    width: '100%',
  },
  modalBtns: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1.5rem',
  },
  cancelBtn: {
    flex: 1,
    background: 'transparent',
    border: '1px solid #333',
    color: '#888884',
    fontFamily: 'var(--font-ui)',
    fontWeight: 600,
    fontSize: '0.85rem',
    letterSpacing: '0.2em',
    padding: '0.8rem',
    cursor: 'pointer',
  },
  startBtn: {
    flex: 1,
    background: '#F5F5F0',
    border: 'none',
    color: '#000',
    fontFamily: 'var(--font-ui)',
    fontWeight: 600,
    fontSize: '0.85rem',
    letterSpacing: '0.2em',
    padding: '0.8rem',
    cursor: 'pointer',
  },
}
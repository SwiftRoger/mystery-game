import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'

export default function Graveyard() {
  const navigate = useNavigate()
  const [retired, setRetired] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGraveyard()
  }, [])

  const fetchGraveyard = async () => {
    try {
      const res = await api.get('/api/game/graveyard')
      setRetired(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) return (
    <div style={styles.loading}>
      <p style={styles.loadingText}>// LOADING GRAVEYARD...</p>
    </div>
  )

  return (
    <div style={styles.container} className='page-enter'>
      <div style={styles.grid} />

      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/dashboard')}>
          ← BACK
        </button>
        <h1 style={styles.logo}>NEBULA NOIR</h1>
        <div style={{ minWidth: '80px' }} />
      </header>

      {/* Main */}
      <main style={styles.main}>
        <div style={styles.titleWrap}>
          <p style={styles.titleLabel}>// THE FALLEN</p>
          <h2 style={styles.title}>GRAVEYARD</h2>
          <p style={styles.titleSub}>
            Detectives who didn't make it. Remembered forever.
          </p>
        </div>

        {retired.length === 0 ? (
          <div style={styles.empty}>
            <p style={styles.emptyIcon}>☠</p>
            <p style={styles.emptyText}>No detectives retired yet.</p>
            <p style={styles.emptySub}>// they're all still out there... for now</p>
          </div>
        ) : (
          <div style={styles.list}>
            {retired.map((character, i) => (
              <div
                key={character.id}
                style={{ ...styles.card, animationDelay: `${i * 0.1}s` }}
                className='page-enter'
              >
                <div style={styles.cardLeft}>
                  <p style={styles.cardIcon}>☠</p>
                </div>
                <div style={styles.cardBody}>
                  <div style={styles.cardTop}>
                    <h3 style={styles.characterName}>{character.name}</h3>
                    <span style={styles.chapterBadge}>
                      CHAPTER {character.current_chapter}
                    </span>
                  </div>
                  <p style={styles.reason}>
                    {character.retired_reason || 'Cause of death unknown'}
                  </p>
                  {character.story_title && (
                    <p style={styles.storyTitle}>
                      // Case: {character.story_title}
                    </p>
                  )}
                  <p style={styles.date}>
                    Retired {formatDate(character.retired_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#000',
    position: 'relative',
  },
  grid: {
    position: 'fixed',
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(245,245,240,0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(245,245,240,0.02) 1px, transparent 1px)
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
  },
  backBtn: {
    background: 'transparent',
    border: 'none',
    color: '#888884',
    fontFamily: 'var(--font-ui)',
    fontWeight: 600,
    fontSize: '0.75rem',
    letterSpacing: '0.15em',
    cursor: 'pointer',
    minWidth: '80px',
  },
  logo: {
    fontFamily: 'var(--font-title)',
    fontSize: '1.2rem',
    color: '#F5F5F0',
    letterSpacing: '0.15em',
    animation: 'flicker 8s infinite',
  },
  main: {
    maxWidth: '700px',
    margin: '0 auto',
    padding: '4rem 2rem',
  },
  titleWrap: {
    marginBottom: '3rem',
  },
  titleLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.7rem',
    color: '#444',
    letterSpacing: '0.2em',
    marginBottom: '0.5rem',
  },
  title: {
    fontFamily: 'var(--font-title)',
    fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
    color: '#F5F5F0',
    letterSpacing: '0.1em',
    marginBottom: '0.75rem',
  },
  titleSub: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8rem',
    color: '#888884',
  },
  empty: {
    textAlign: 'center',
    padding: '5rem 2rem',
    border: '1px solid #111',
  },
  emptyIcon: {
    fontSize: '2rem',
    marginBottom: '1rem',
    opacity: 0.3,
  },
  emptyText: {
    fontFamily: 'var(--font-ui)',
    fontSize: '1rem',
    color: '#888884',
    letterSpacing: '0.1em',
    marginBottom: '0.5rem',
  },
  emptySub: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    color: '#333',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  card: {
    display: 'flex',
    gap: '1.5rem',
    padding: '1.5rem',
    background: '#0a0a0a',
    border: '1px solid #111',
    transition: 'border-color 0.2s',
  },
  cardLeft: {
    paddingTop: '0.2rem',
  },
  cardIcon: {
    fontSize: '1.2rem',
    opacity: 0.4,
  },
  cardBody: {
    flex: 1,
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  characterName: {
    fontFamily: 'var(--font-ui)',
    fontSize: '1rem',
    fontWeight: 600,
    letterSpacing: '0.1em',
    color: '#F5F5F0',
  },
  chapterBadge: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.65rem',
    color: '#444',
    letterSpacing: '0.15em',
    border: '1px solid #1a1a1a',
    padding: '0.2rem 0.5rem',
  },
  reason: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8rem',
    color: '#888884',
    marginBottom: '0.4rem',
    lineHeight: 1.5,
  },
  storyTitle: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.72rem',
    color: '#444',
    marginBottom: '0.4rem',
  },
  date: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.7rem',
    color: '#333',
  },
}
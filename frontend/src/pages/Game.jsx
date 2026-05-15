import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'

// ─── Strip outcome tags and parse choices from raw AI text ───────────────────
function parseAIReply(text) {
  if (!text) return { clean: '', choices: [] }

  // Remove outcome tag
  let clean = text.replace(/\[OUTCOME:(WIN|FAIL|CONTINUE)\]/gi, '')

  // Try [CHOICES]...[/CHOICES] block
  const blockMatch = clean.match(/\[CHOICES\]([\s\S]*?)\[\/CHOICES\]/i)
  if (blockMatch) {
    const choices = blockMatch[1]
      .split('\n')
      .map(l => l.replace(/^\d+\.\s*/, '').trim())
      .filter(l => l.length > 0)
    clean = clean.replace(/\[CHOICES\][\s\S]*?\[\/CHOICES\]/gi, '').trim()
    return { clean, choices }
  }

  // Fallback: detect inline "1. ... 2. ... 3. ..." pattern
  const inlineMatch = clean.match(/(1\.\s+.+?)\s+(2\.\s+.+?)\s+(3\.\s+.+?)(\s*$)/s)
  if (inlineMatch) {
    const cutIndex = clean.search(/1\.\s+/)
    const choices = [inlineMatch[1], inlineMatch[2], inlineMatch[3]]
      .map(c => c.replace(/^\d+\.\s*/, '').trim())
    clean = clean.slice(0, cutIndex).trim()
    return { clean, choices }
  }

  return { clean: clean.trim(), choices: [] }
}

export default function Game() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [choices, setChoices] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [thinking, setThinking] = useState(false)
  const [outcome, setOutcome] = useState(null)
  const [nextChapter, setNextChapter] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => { fetchSession() }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking, choices])

  const fetchSession = async () => {
    try {
      const res = await api.get('/api/game/session')
      if (!res.data) return navigate('/dashboard')
      setSession(res.data)
      // Clean any leftover tags from stored messages
      const cleaned = (res.data.conversation || []).map(m => ({
        ...m,
        content: parseAIReply(m.content).clean
      }))
      setMessages(cleaned)
    } catch {
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (choiceText) => {
    // choiceText is passed when clicking a choice button
    // otherwise fall back to the textarea input
    const userMessage = typeof choiceText === 'string'
      ? choiceText.trim()
      : input.trim()

    if (!userMessage || thinking) return

    setInput('')
    setChoices([])
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setThinking(true)

    try {
      const res = await api.post('/api/game/action', {
        session_id: session.session.id,
        message: userMessage
      })

      // Parse the reply — handles both clean and messy AI output
      const { clean, choices: parsedChoices } = parseAIReply(res.data.reply || '')

      // Prefer backend-parsed choices, fall back to frontend-parsed
      const finalChoices = (res.data.choices && res.data.choices.length > 0)
        ? res.data.choices
        : parsedChoices

      setMessages(prev => [...prev, { role: 'assistant', content: clean }])

      if (res.data.outcome === 'chapter_complete') {
        setNextChapter(res.data.next_chapter)
        setOutcome('chapter_complete')
        setChoices([])
      } else if (res.data.outcome === 'game_won') {
        setOutcome('game_won')
        setChoices([])
      } else if (res.data.outcome === 'game_over') {
        setOutcome('game_over')
        setChoices([])
      } else {
        setChoices(finalChoices)
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '// transmission lost. try again.'
      }])
    } finally {
      setThinking(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleNextChapter = () => {
    setOutcome(null)
    setNextChapter(null)
    setChoices([])
    fetchSession()
  }

  if (loading) return (
    <div style={styles.loading}>
      <p style={styles.loadingText}>// LOADING CASE FILES...</p>
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
        <div style={styles.headerCenter}>
          <p style={styles.chapterLabel}>
            CHAPTER {session?.character?.current_chapter}
          </p>
          <p style={styles.chapterTitle}>
            {session?.chapter?.title}
          </p>
        </div>
        <div style={styles.headerRight}>
          <p style={styles.characterName}>
            // {session?.character?.name}
          </p>
        </div>
      </header>

      {/* Messages */}
      <div style={styles.messages}>
        {messages.map((msg, i) => {
          const isLast = i === messages.length - 1
          const isAI = msg.role === 'assistant'
          return (
            <div key={i}>
              <div style={{
                ...styles.message,
                ...(msg.role === 'user' ? styles.userMessage : styles.aiMessage)
              }}>
                <span style={msg.role === 'user' ? styles.userPrefix : styles.aiPrefix}>
                  {msg.role === 'user' ? '> YOU' : '// NOIR'}
                </span>
                <p style={styles.messageText}>{msg.content}</p>
              </div>

              {/* Choices — only after last AI message, not while thinking */}
              {isAI && isLast && !thinking && choices.length > 0 && !outcome && (
                <div style={styles.choicesWrap}>
                  <p style={styles.choicesLabel}>// SUGGESTED ACTIONS</p>
                  <div style={styles.choicesList}>
                    {choices.map((choice, ci) => (
                      <button
                        key={ci}
                        style={styles.choiceBtn}
                        onClick={() => sendMessage(choice)}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = '#111'
                          e.currentTarget.style.borderColor = '#444'
                          e.currentTarget.style.color = '#F5F5F0'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.borderColor = '#222'
                          e.currentTarget.style.color = '#888884'
                        }}
                      >
                        <span style={styles.choiceIndex}>{ci + 1}.</span>
                        {choice}
                      </button>
                    ))}
                  </div>
                  <p style={styles.choicesHint}>or type your own action below</p>
                </div>
              )}
            </div>
          )
        })}

        {/* Thinking indicator */}
        {thinking && (
          <div style={styles.message}>
            <span style={styles.aiPrefix}>// NOIR</span>
            <p style={styles.thinking}>
              <span style={styles.dot}>.</span>
              <span style={{ ...styles.dot, animationDelay: '0.2s' }}>.</span>
              <span style={{ ...styles.dot, animationDelay: '0.4s' }}>.</span>
            </p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!outcome && (
        <div style={styles.inputWrap}>
          <span style={styles.inputPrefix}>&gt;</span>
          <textarea
            style={styles.input}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='What do you do, Detective?'
            rows={2}
            disabled={thinking}
          />
          <button
            style={{ ...styles.sendBtn, opacity: thinking ? 0.4 : 1 }}
            onClick={() => sendMessage()}
            disabled={thinking}
          >
            SEND
          </button>
        </div>
      )}

      {/* Outcome overlays */}
      {outcome === 'chapter_complete' && (
        <div style={styles.overlay}>
          <div style={styles.outcomeCard} className='page-enter'>
            <p style={styles.outcomeLabel}>// CASE PROGRESS</p>
            <h2 style={styles.outcomeTitle}>CHAPTER COMPLETE</h2>
            <p style={styles.outcomeDesc}>Good work, Detective. The next chapter awaits.</p>
            {nextChapter && (
              <div style={styles.nextChapterPreview}>
                <p style={styles.nextLabel}>NEXT —</p>
                <p style={styles.nextTitle}>{nextChapter.title}</p>
              </div>
            )}
            <button style={styles.outcomeBtn} onClick={handleNextChapter}>
              CONTINUE INVESTIGATION
            </button>
          </div>
        </div>
      )}

      {outcome === 'game_won' && (
        <div style={styles.overlay}>
          <div style={styles.outcomeCard} className='page-enter'>
            <p style={styles.outcomeLabel}>// CASE CLOSED</p>
            <h2 style={{ ...styles.outcomeTitle, fontSize: '2rem' }}>YOU SOLVED IT</h2>
            <p style={styles.outcomeDesc}>
              The truth has been uncovered. Your detective has earned their rest.
            </p>
            <button style={styles.outcomeBtn} onClick={() => navigate('/dashboard')}>
              RETURN TO STATION
            </button>
          </div>
        </div>
      )}

      {outcome === 'game_over' && (
        <div style={styles.overlay}>
          <div style={styles.outcomeCard} className='page-enter'>
            <p style={{ ...styles.outcomeLabel, color: '#ff4444' }}>// DETECTIVE RETIRED</p>
            <h2 style={styles.outcomeTitle}>CASE FAILED</h2>
            <p style={styles.outcomeDesc}>
              {session?.character?.name} has been added to the graveyard. The killer walks free.
            </p>
            <div style={styles.outcomeBtns}>
              <button style={styles.ghostBtn} onClick={() => navigate('/graveyard')}>
                VIEW GRAVEYARD
              </button>
              <button style={styles.outcomeBtn} onClick={() => navigate('/dashboard')}>
                NEW DETECTIVE
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
    display: 'flex',
    flexDirection: 'column',
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
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    borderBottom: '1px solid #111',
    position: 'sticky',
    top: 0,
    background: '#000',
    zIndex: 10,
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
  },
  headerCenter: { textAlign: 'center' },
  chapterLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.65rem',
    color: '#444',
    letterSpacing: '0.2em',
    marginBottom: '0.2rem',
  },
  chapterTitle: {
    fontFamily: 'var(--font-ui)',
    fontSize: '0.9rem',
    fontWeight: 600,
    letterSpacing: '0.15em',
    color: '#F5F5F0',
  },
  headerRight: { minWidth: '120px', textAlign: 'right' },
  characterName: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    color: '#888884',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    maxWidth: '800px',
    width: '100%',
    margin: '0 auto',
  },
  message: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  userMessage: { alignItems: 'flex-end' },
  aiMessage: { alignItems: 'flex-start' },
  userPrefix: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.65rem',
    color: '#444',
    letterSpacing: '0.2em',
  },
  aiPrefix: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.65rem',
    color: '#888884',
    letterSpacing: '0.2em',
  },
  messageText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.9rem',
    color: '#F5F5F0',
    lineHeight: 1.7,
    maxWidth: '680px',
  },
  thinking: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
    height: '20px',
  },
  dot: {
    fontFamily: 'var(--font-mono)',
    fontSize: '1.2rem',
    color: '#888884',
    animation: 'flicker 1s infinite',
    display: 'inline-block',
  },
  choicesWrap: {
    marginTop: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  choicesLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.6rem',
    color: '#333',
    letterSpacing: '0.2em',
  },
  choicesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  choiceBtn: {
    background: 'transparent',
    border: '1px solid #222',
    color: '#888884',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8rem',
    padding: '0.6rem 1rem',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
    maxWidth: '500px',
  },
  choiceIndex: {
    color: '#444',
    minWidth: '16px',
  },
  choicesHint: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.6rem',
    color: '#2a2a2a',
    letterSpacing: '0.1em',
    marginTop: '0.25rem',
  },
  inputWrap: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    padding: '1rem 2rem',
    borderTop: '1px solid #111',
    background: '#000',
    maxWidth: '800px',
    width: '100%',
    alignSelf: 'center',
  },
  inputPrefix: {
    fontFamily: 'var(--font-mono)',
    fontSize: '1rem',
    color: '#F5F5F0',
    paddingTop: '0.5rem',
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid #222',
    color: '#F5F5F0',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.9rem',
    padding: '0.5rem 0',
    outline: 'none',
    resize: 'none',
    lineHeight: 1.6,
  },
  sendBtn: {
    background: 'transparent',
    border: '1px solid #333',
    color: '#F5F5F0',
    fontFamily: 'var(--font-ui)',
    fontWeight: 600,
    fontSize: '0.75rem',
    letterSpacing: '0.2em',
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.92)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    zIndex: 100,
  },
  outcomeCard: {
    background: '#0a0a0a',
    border: '1px solid #222',
    padding: '3rem',
    maxWidth: '480px',
    width: '100%',
    textAlign: 'center',
  },
  outcomeLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    color: '#888884',
    letterSpacing: '0.2em',
    marginBottom: '1rem',
  },
  outcomeTitle: {
    fontFamily: 'var(--font-title)',
    fontSize: '1.8rem',
    color: '#F5F5F0',
    letterSpacing: '0.1em',
    marginBottom: '1rem',
  },
  outcomeDesc: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.85rem',
    color: '#888884',
    lineHeight: 1.7,
    marginBottom: '2rem',
  },
  nextChapterPreview: {
    border: '1px solid #1a1a1a',
    padding: '1rem',
    marginBottom: '2rem',
  },
  nextLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.65rem',
    color: '#444',
    letterSpacing: '0.2em',
    marginBottom: '0.3rem',
  },
  nextTitle: {
    fontFamily: 'var(--font-ui)',
    fontSize: '1rem',
    fontWeight: 600,
    color: '#F5F5F0',
    letterSpacing: '0.15em',
  },
  outcomeBtn: {
    background: '#F5F5F0',
    border: 'none',
    color: '#000',
    fontFamily: 'var(--font-ui)',
    fontWeight: 600,
    fontSize: '0.85rem',
    letterSpacing: '0.2em',
    padding: '0.9rem 2rem',
    cursor: 'pointer',
    width: '100%',
  },
  outcomeBtns: {
    display: 'flex',
    gap: '1rem',
  },
  ghostBtn: {
    flex: 1,
    background: 'transparent',
    border: '1px solid #333',
    color: '#888884',
    fontFamily: 'var(--font-ui)',
    fontWeight: 600,
    fontSize: '0.85rem',
    letterSpacing: '0.2em',
    padding: '0.9rem',
    cursor: 'pointer',
  },
}

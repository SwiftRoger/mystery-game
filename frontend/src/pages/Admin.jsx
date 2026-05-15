import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'

  const ADMIN_PASSWORD = 'Isabelroger12:)'

export default function Admin() {
  const navigate = useNavigate()
  const [unlocked, setUnlocked] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  const [stories, setStories] = useState([])
  const [selectedStory, setSelectedStory] = useState(null)
  const [chapters, setChapters] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('stories') // stories | newStory | newChapter | editChapter

  // Forms
  const [storyForm, setStoryForm] = useState({ title: '', description: '' })
  const [chapterForm, setChapterForm] = useState({
    title: '',
    chapter_number: '',
    content: '',
    win_condition: '',
    fail_condition: ''
  })
  const [editingChapter, setEditingChapter] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchStories()
  }, [])

  useEffect(() => {
    if (selectedStory) fetchChapters(selectedStory.id)
  }, [selectedStory])

  const fetchStories = async () => {
    try {
      const res = await api.get('/api/admin/stories')
      setStories(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchChapters = async (storyId) => {
    try {
      const res = await api.get(`/api/chapters/${storyId}`)
      setChapters(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleCreateStory = async () => {
    if (!storyForm.title.trim()) return setError('Story title is required')
    setSaving(true)
    setError('')
    try {
      const res = await api.post('/api/admin/stories', storyForm)
      setStories(prev => [res.data, ...prev])
      setStoryForm({ title: '', description: '' })
      setSuccess('Story created!')
      setView('stories')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create story')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateChapter = async () => {
    const { title, chapter_number, content, win_condition, fail_condition } = chapterForm
    if (!title || !chapter_number || !content || !win_condition || !fail_condition) {
      return setError('All fields are required')
    }
    setSaving(true)
    setError('')
    try {
      await api.post('/api/admin/chapters', {
        story_id: selectedStory.id,
        ...chapterForm,
        chapter_number: parseInt(chapterForm.chapter_number)
      })
      await fetchChapters(selectedStory.id)
      setChapterForm({
        title: '', chapter_number: '', content: '',
        win_condition: '', fail_condition: ''
      })
      setSuccess('Chapter saved!')
      setView('stories')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save chapter')
    } finally {
      setSaving(false)
    }
  }

  const handleEditChapter = async () => {
    const { title, content, win_condition, fail_condition } = chapterForm
    if (!title || !content || !win_condition || !fail_condition) {
      return setError('All fields are required')
    }
    setSaving(true)
    setError('')
    try {
      await api.put(`/api/admin/chapters/${editingChapter.id}`, {
        title, content, win_condition, fail_condition
      })
      await fetchChapters(selectedStory.id)
      setSuccess('Chapter updated!')
      setView('stories')
      setEditingChapter(null)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update chapter')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteStory = async (id) => {
    if (!confirm('Delete this story and all its chapters?')) return
    try {
      await api.delete(`/api/admin/stories/${id}`)
      setStories(prev => prev.filter(s => s.id !== id))
      if (selectedStory?.id === id) setSelectedStory(null)
    } catch (err) {
      setError('Failed to delete story')
    }
  }

  const handleDeleteChapter = async (id) => {
    if (!confirm('Delete this chapter?')) return
    try {
      await api.delete(`/api/admin/chapters/${id}`)
      setChapters(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      setError('Failed to delete chapter')
    }
  }

  const openEditChapter = (chapter) => {
    setEditingChapter(chapter)
    setChapterForm({
      title: chapter.title,
      chapter_number: chapter.chapter_number,
      content: chapter.content,
      win_condition: chapter.win_condition,
      fail_condition: chapter.fail_condition
    })
    setError('')
    setView('editChapter')
  }

  if (!unlocked) return (
    <div style={styles.lockScreen}>
      <div style={styles.lockCard} className='page-enter'>
        <p style={styles.lockLabel}>// RESTRICTED ACCESS</p>
        <h2 style={styles.lockTitle}>ADMIN PANEL</h2>
        <p style={styles.lockSub}>Enter the access code to continue</p>
        <input
          style={{ ...styles.input, marginBottom: '0.75rem' }}
          type='password'
          value={passwordInput}
          onChange={e => { setPasswordInput(e.target.value); setPasswordError(false) }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              if (passwordInput === ADMIN_PASSWORD) setUnlocked(true)
              else setPasswordError(true)
            }
          }}
          placeholder='Enter password'
          autoFocus
        />
        {passwordError && (
          <p style={styles.lockError}>// ACCESS DENIED</p>
        )}
        <button
          style={styles.primaryBtn}
          onClick={() => {
            if (passwordInput === ADMIN_PASSWORD) setUnlocked(true)
            else setPasswordError(true)
          }}
        >
          UNLOCK
        </button>
      </div>
    </div>
  )

  if (loading) return (
    <div style={styles.loading}>
      <p style={styles.loadingText}>// LOADING ADMIN PANEL...</p>
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
        <h1 style={styles.logo}>ADMIN PANEL</h1>
        <div style={{ minWidth: '80px' }} />
      </header>

      <main style={styles.main}>

        {/* Success message */}
        {success && <p style={styles.success}>{success}</p>}

        {/* ── STORIES LIST ── */}
        {view === 'stories' && (
          <div className='page-enter'>
            <div style={styles.sectionHeader}>
              <div>
                <p style={styles.sectionLabel}>// STORY CONTROL</p>
                <h2 style={styles.sectionTitle}>MANAGE STORIES</h2>
              </div>
              <button
                style={styles.primaryBtn}
                onClick={() => { setView('newStory'); setError('') }}
              >
                + NEW STORY
              </button>
            </div>

            {stories.length === 0 ? (
              <div style={styles.empty}>
                <p style={styles.emptyText}>No stories yet. Create one to get started.</p>
              </div>
            ) : (
              <div style={styles.storyList}>
                {stories.map(story => (
                  <div key={story.id} style={styles.storyCard}>
                    <div style={styles.storyCardTop}>
                      <div>
                        <h3 style={styles.storyName}>{story.title}</h3>
                        <p style={styles.storyDesc}>{story.description}</p>
                      </div>
                      <button
                        style={styles.deleteBtn}
                        onClick={() => handleDeleteStory(story.id)}
                      >
                        DELETE
                      </button>
                    </div>

                    <div style={styles.storyCardBottom}>
                      <button
                        style={styles.viewChaptersBtn}
                        onClick={() => {
                          setSelectedStory(story)
                          setView('chapters')
                        }}
                      >
                        VIEW CHAPTERS →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CHAPTERS LIST ── */}
        {view === 'chapters' && selectedStory && (
          <div className='page-enter'>
            <div style={styles.sectionHeader}>
              <div>
                <button
                  style={styles.smallBackBtn}
                  onClick={() => setView('stories')}
                >
                  ← STORIES
                </button>
                <h2 style={styles.sectionTitle}>{selectedStory.title}</h2>
                <p style={styles.sectionLabel}>// CHAPTERS</p>
              </div>
              <button
                style={styles.primaryBtn}
                onClick={() => {
                  setChapterForm({
                    title: '', chapter_number: chapters.length + 1,
                    content: '', win_condition: '', fail_condition: ''
                  })
                  setError('')
                  setView('newChapter')
                }}
              >
                + ADD CHAPTER
              </button>
            </div>

            {chapters.length === 0 ? (
              <div style={styles.empty}>
                <p style={styles.emptyText}>No chapters yet. Add the first one.</p>
              </div>
            ) : (
              <div style={styles.chapterList}>
                {chapters.map(chapter => (
                  <div key={chapter.id} style={styles.chapterCard}>
                    <div style={styles.chapterCardLeft}>
                      <span style={styles.chapterNum}>
                        {String(chapter.chapter_number).padStart(2, '0')}
                      </span>
                    </div>
                    <div style={styles.chapterCardBody}>
                      <h3 style={styles.chapterTitle}>{chapter.title}</h3>
                      <p style={styles.chapterPreview}>
                        {chapter.content?.slice(0, 100)}...
                      </p>
                    </div>
                    <div style={styles.chapterCardActions}>
                      <button
                        style={styles.editBtn}
                        onClick={() => openEditChapter(chapter)}
                      >
                        EDIT
                      </button>
                      <button
                        style={styles.deleteBtn}
                        onClick={() => handleDeleteChapter(chapter.id)}
                      >
                        DEL
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── NEW STORY FORM ── */}
        {view === 'newStory' && (
          <div className='page-enter'>
            <div style={styles.sectionHeader}>
              <div>
                <button
                  style={styles.smallBackBtn}
                  onClick={() => setView('stories')}
                >
                  ← BACK
                </button>
                <h2 style={styles.sectionTitle}>NEW STORY</h2>
              </div>
            </div>

            {error && <p style={styles.error}>{error}</p>}

            <div style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>STORY TITLE</label>
                <input
                  style={styles.input}
                  value={storyForm.title}
                  onChange={e => setStoryForm(p => ({ ...p, title: e.target.value }))}
                  placeholder='e.g. The Coldest Orbit'
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>DESCRIPTION</label>
                <input
                  style={styles.input}
                  value={storyForm.description}
                  onChange={e => setStoryForm(p => ({ ...p, description: e.target.value }))}
                  placeholder='Short summary shown to players'
                />
              </div>
              <button
                style={{ ...styles.primaryBtn, opacity: saving ? 0.6 : 1 }}
                onClick={handleCreateStory}
                disabled={saving}
              >
                {saving ? 'SAVING...' : 'CREATE STORY'}
              </button>
            </div>
          </div>
        )}

        {/* ── NEW / EDIT CHAPTER FORM ── */}
        {(view === 'newChapter' || view === 'editChapter') && (
          <div className='page-enter'>
            <div style={styles.sectionHeader}>
              <div>
                <button
                  style={styles.smallBackBtn}
                  onClick={() => setView('chapters')}
                >
                  ← BACK
                </button>
                <h2 style={styles.sectionTitle}>
                  {view === 'newChapter' ? 'NEW CHAPTER' : 'EDIT CHAPTER'}
                </h2>
                <p style={styles.sectionLabel}>// {selectedStory?.title}</p>
              </div>
            </div>

            {error && <p style={styles.error}>{error}</p>}

            <div style={styles.form}>
              <div style={styles.row}>
                <div style={{ ...styles.field, flex: 3 }}>
                  <label style={styles.label}>CHAPTER TITLE</label>
                  <input
                    style={styles.input}
                    value={chapterForm.title}
                    onChange={e => setChapterForm(p => ({ ...p, title: e.target.value }))}
                    placeholder='e.g. The Body in Sector 9'
                  />
                </div>
                <div style={{ ...styles.field, flex: 1 }}>
                  <label style={styles.label}>CHAPTER #</label>
                  <input
                    style={styles.input}
                    type='number'
                    value={chapterForm.chapter_number}
                    onChange={e => setChapterForm(p => ({ ...p, chapter_number: e.target.value }))}
                    placeholder='1'
                    disabled={view === 'editChapter'}
                  />
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>STORY CONTENT</label>
                <p style={styles.fieldHint}>
                  // This is the full chapter lore. Groq reads this to understand the story.
                  Paste your ChatGPT-crafted story here. Be detailed — suspects, clues, setting, timeline.
                </p>
                <textarea
                  style={{ ...styles.input, ...styles.textarea }}
                  value={chapterForm.content}
                  onChange={e => setChapterForm(p => ({ ...p, content: e.target.value }))}
                  placeholder='Paste the full chapter story here...'
                  rows={10}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>WIN CONDITION</label>
                <p style={styles.fieldHint}>
                  // What must the player say or do to pass this chapter?
                  Be specific. e.g. "Player accuses Dr. Solano and mentions the cryo fluid"
                </p>
                <textarea
                  style={{ ...styles.input, ...styles.textarea }}
                  value={chapterForm.win_condition}
                  onChange={e => setChapterForm(p => ({ ...p, win_condition: e.target.value }))}
                  placeholder='e.g. Player correctly identifies the murder weapon and names the suspect'
                  rows={3}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>FAIL CONDITION</label>
                <p style={styles.fieldHint}>
                  // What causes a bad ending? e.g. "Player accuses the wrong suspect"
                </p>
                <textarea
                  style={{ ...styles.input, ...styles.textarea }}
                  value={chapterForm.fail_condition}
                  onChange={e => setChapterForm(p => ({ ...p, fail_condition: e.target.value }))}
                  placeholder='e.g. Player accuses an innocent suspect or destroys key evidence'
                  rows={3}
                />
              </div>

              <button
                style={{ ...styles.primaryBtn, opacity: saving ? 0.6 : 1 }}
                onClick={view === 'newChapter' ? handleCreateChapter : handleEditChapter}
                disabled={saving}
              >
                {saving ? 'SAVING...' : view === 'newChapter' ? 'SAVE CHAPTER' : 'UPDATE CHAPTER'}
              </button>
            </div>
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
  },
  main: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '3rem 2rem',
  },
  success: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8rem',
    color: '#44ff88',
    marginBottom: '1.5rem',
    padding: '0.75rem',
    border: '1px solid #44ff8833',
    background: '#44ff880a',
  },
  error: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8rem',
    color: '#ff4444',
    marginBottom: '1.5rem',
    padding: '0.75rem',
    border: '1px solid #ff444433',
    background: '#ff44440a',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: '2rem',
  },
  sectionLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.7rem',
    color: '#444',
    letterSpacing: '0.2em',
    marginBottom: '0.4rem',
  },
  sectionTitle: {
    fontFamily: 'var(--font-title)',
    fontSize: '1.8rem',
    color: '#F5F5F0',
    letterSpacing: '0.05em',
  },
  smallBackBtn: {
    background: 'transparent',
    border: 'none',
    color: '#888884',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    cursor: 'pointer',
    padding: 0,
    marginBottom: '0.5rem',
    display: 'block',
  },
  primaryBtn: {
    background: '#F5F5F0',
    border: 'none',
    color: '#000',
    fontFamily: 'var(--font-ui)',
    fontWeight: 600,
    fontSize: '0.8rem',
    letterSpacing: '0.2em',
    padding: '0.75rem 1.5rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  empty: {
    padding: '3rem',
    border: '1px solid #111',
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.85rem',
    color: '#444',
  },
  storyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  storyCard: {
    background: '#0a0a0a',
    border: '1px solid #111',
    padding: '1.5rem',
  },
  storyCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem',
  },
  storyName: {
    fontFamily: 'var(--font-ui)',
    fontSize: '1rem',
    fontWeight: 600,
    letterSpacing: '0.1em',
    color: '#F5F5F0',
    marginBottom: '0.3rem',
  },
  storyDesc: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8rem',
    color: '#888884',
  },
  storyCardBottom: {
    borderTop: '1px solid #111',
    paddingTop: '1rem',
  },
  viewChaptersBtn: {
    background: 'transparent',
    border: '1px solid #222',
    color: '#F5F5F0',
    fontFamily: 'var(--font-ui)',
    fontWeight: 600,
    fontSize: '0.75rem',
    letterSpacing: '0.15em',
    padding: '0.5rem 1rem',
    cursor: 'pointer',
  },
  deleteBtn: {
    background: 'transparent',
    border: '1px solid #1a1a1a',
    color: '#ff4444',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.7rem',
    letterSpacing: '0.1em',
    padding: '0.3rem 0.6rem',
    cursor: 'pointer',
  },
  chapterList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  chapterCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    background: '#0a0a0a',
    border: '1px solid #111',
    padding: '1.25rem 1.5rem',
  },
  chapterCardLeft: {
    minWidth: '40px',
  },
  chapterNum: {
    fontFamily: 'var(--font-title)',
    fontSize: '1.2rem',
    color: '#222',
  },
  chapterCardBody: {
    flex: 1,
  },
  chapterTitle: {
    fontFamily: 'var(--font-ui)',
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#F5F5F0',
    letterSpacing: '0.1em',
    marginBottom: '0.3rem',
  },
  chapterPreview: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    color: '#444',
    lineHeight: 1.5,
  },
  chapterCardActions: {
    display: 'flex',
    gap: '0.5rem',
  },
  editBtn: {
    background: 'transparent',
    border: '1px solid #222',
    color: '#888884',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.7rem',
    letterSpacing: '0.1em',
    padding: '0.3rem 0.6rem',
    cursor: 'pointer',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  row: {
    display: 'flex',
    gap: '1rem',
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
  fieldHint: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.72rem',
    color: '#444',
    lineHeight: 1.5,
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
  textarea: {
    resize: 'vertical',
    lineHeight: 1.7,
  },
  lockScreen: {
    minHeight: '100vh',
    background: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
  },
  lockCard: {
    background: '#0a0a0a',
    border: '1px solid #222',
    padding: '3rem',
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  lockLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.7rem',
    color: '#444',
    letterSpacing: '0.2em',
  },
  lockTitle: {
    fontFamily: 'var(--font-title)',
    fontSize: '1.8rem',
    color: '#F5F5F0',
    letterSpacing: '0.1em',
  },
  lockSub: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8rem',
    color: '#888884',
    marginBottom: '0.5rem',
  },
  lockError: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8rem',
    color: '#ff4444',
    letterSpacing: '0.1em',
  },
}
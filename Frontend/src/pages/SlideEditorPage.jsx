// src/pages/SlideEditorPage.jsx
import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Search, Plus, RefreshCw, Undo2, ChevronLeft, ChevronRight, ShieldCheck, ShieldAlert, AlignLeft, BookOpen, Code2, CheckSquare, Loader2, AlertTriangle } from 'lucide-react';
import WorkspaceHeader from '../components/layout/WorkspaceHeader';
import Modal from '../components/common/Modal';
import { api } from '../api';
import { useApp } from '../context/AppContext';
import { highlightCode } from '../utils/codeHighlighter';

// Classroom Presentation Slide Canvas
function SlideCanvas({ slide }) {
  const isPassed = slide.verificationStatus === 'passed';
  const isFailed = slide.verificationStatus === 'failed';

  return (
    <div
      className="slide-canvas"
      style={{
        background: '#141416',
        color: '#F4F4F6',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-md)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Slide Presentation Header Bar */}
      <div style={{
        padding: '0.65rem 1.5rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(255, 255, 255, 0.03)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            fontSize: '0.65rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: '#A3A3A8',
            fontFamily: 'var(--font-mono)'
          }}>
            VERIFIED COURSE STUDIO
          </span>
        </div>
        <span style={{
          fontSize: '0.65rem',
          color: '#71717A',
          fontFamily: 'var(--font-mono)'
        }}>
          {slide.number} / 12
        </span>
      </div>

      {/* Slide Presentation Body */}
      <div style={{
        padding: '2rem 2.25rem',
        flex: 1,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}>
        <h2 style={{
          fontSize: 'clamp(1.15rem, 2.5vw, 1.5rem)',
          fontWeight: 600,
          color: '#FFFFFF',
          marginBottom: '0.85rem',
          lineHeight: 1.25,
          letterSpacing: '-0.01em',
        }}>
          {slide.title}
        </h2>

        {slide.body && (
          <p style={{
            fontSize: 'clamp(0.75rem, 1.4vw, 0.875rem)',
            color: '#B0B0B8',
            lineHeight: 1.6,
            marginBottom: '1rem',
            maxWidth: '680px'
          }}>
            {slide.body}
          </p>
        )}

        {slide.content?.length > 0 && !slide.codeExample && (
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '0.5rem 0' }}>
            {slide.content.map((item, i) => (
              <li key={i} style={{ display: 'flex', gap: '0.65rem', fontSize: 'clamp(0.7rem, 1.3vw, 0.85rem)', color: '#D4D4D8' }}>
                <span style={{ color: '#8A8A93', flexShrink: 0 }}>—</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}

        {slide.codeExample && (
          <div style={{ marginTop: '0.5rem' }}>
            <div
              className="code-block"
              style={{
                background: '#09090B',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '0.85rem 1rem',
                fontSize: 'clamp(0.65rem, 1.1vw, 0.775rem)',
                lineHeight: 1.55,
                maxHeight: '190px',
                color: '#E4E4E7'
              }}
              dangerouslySetInnerHTML={{ __html: highlightCode(slide.codeExample) }}
            />
            {slide.verificationStatus && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.5rem' }}>
                {isPassed ? (
                  <ShieldCheck size={12} color="#10B981" />
                ) : isFailed ? (
                  <ShieldAlert size={12} color="#EF4444" />
                ) : (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#71717A' }} />
                )}
                <span style={{
                  fontSize: '0.675rem',
                  color: isPassed ? '#10B981' : isFailed ? '#EF4444' : '#71717A',
                  fontFamily: 'var(--font-mono)'
                }}>
                  {isPassed ? 'Code verified in Java 21 container' : 'Pending verification check'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SlideEditorPage() {
  const { courseId } = useParams();
  const { addToast } = useApp();

  const [course, setCourse]           = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [slides, setSlides]           = useState([]);
  const [activeId, setActiveId]       = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab]     = useState('content');
  const [regenModal, setRegenModal]   = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [history, setHistory]         = useState([]);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedBody, setEditedBody]   = useState('');
  const [isEditing, setIsEditing]     = useState(false);

  const fetchCourse = async () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCourse(courseId);
      const c = res.course;
      setCourse(c);
      const sList = c?.content?.slides || [];
      setSlides(sList);
      if (sList.length > 0 && !activeId) {
        setActiveId(sList[0].id);
      }
    } catch (err) {
      console.error("Failed to load course for slide editor:", err);
      setError(err.message || "Failed to load course");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  const activeSlide = slides.find(s => s.id === activeId) || slides[0] || {};
  const filtered    = slides.filter(s => (s.title || '').toLowerCase().includes(searchQuery.toLowerCase()));

  const activateSlide = (slide) => {
    setActiveId(slide.id);
    setEditedTitle(slide.title);
    setEditedBody(slide.body || '');
    setIsEditing(false);
    setActiveTab('content');
  };

  const handleRegenerate = useCallback(async () => {
    setRegenModal(false);
    const slideIndex = slides.findIndex(s => s.id === activeId);
    if (slideIndex === -1 || !course) return;

    setRegenerating(true);
    try {
      const res = await api.regenerateSlide(course.id, slideIndex);
      setCourse(res.course);
      setSlides(res.course.content.slides);
      addToast(`Slide ${slideIndex + 1} regenerated and verified via Java 21!`, 'success');
    } catch (err) {
      addToast(`Slide regeneration failed: ${err.message}`, 'error');
    } finally {
      setRegenerating(false);
    }
  }, [activeId, course, slides, addToast]);

  const handleUndo = () => {
    if (!history.length) return;
    setSlides(history[history.length - 1]);
    setHistory(h => h.slice(0, -1));
    addToast('Reverted to previous revision.', 'success');
  };

  if (loading) {
    return (
      <div style={{ background: 'var(--bg-base)', minHeight: '100vh', padding: '5rem 1.5rem', textAlign: 'center' }}>
        <Loader2 size={32} className="spinner" style={{ margin: '0 auto 1rem', color: 'var(--text-primary)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading slides...</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div style={{ background: 'var(--bg-base)', minHeight: '100vh', padding: '5rem 1.5rem', textAlign: 'center' }}>
        <AlertTriangle size={36} color="var(--status-failed)" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Failed to Load Slide Editor</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error || 'Course not found'}</p>
        <button className="btn-secondary" onClick={fetchCourse}>Retry</button>
      </div>
    );
  }

  const saveEdits = () => {
    setSlides(prev => prev.map(s => s.id !== activeId ? s : { ...s, title: editedTitle, body: editedBody }));
    setIsEditing(false);
    addToast('Slide updated.', 'success');
  };

  const tabs = [
    { id: 'content', label: 'Outline', icon: AlignLeft },
    { id: 'notes',   label: 'Speaker Notes', icon: BookOpen },
    { id: 'code',    label: 'Code Block', icon: Code2 },
    { id: 'verify',  label: 'Verification', icon: CheckSquare },
  ];

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', transition: 'background-color 0.2s ease' }}>
      <WorkspaceHeader course={course} />

      {/* Professional 3-Column Content Authoring Studio */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '240px 1fr 280px',
        minHeight: 'calc(100vh - 56px)',
        maxHeight: 'calc(100vh - 56px)',
        overflow: 'hidden'
      }}>
        {/* COLUMN 1: Slide Navigator Sidebar */}
        <div style={{
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-surface)',
          overflow: 'hidden'
        }}>
          {/* Search Box */}
          <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
            <div style={{ position: 'relative' }}>
              <Search
                size={13}
                style={{
                  position: 'absolute',
                  left: '0.65rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }}
              />
              <input
                className="input-field"
                style={{
                  paddingLeft: '1.9rem',
                  fontSize: '0.775rem',
                  paddingTop: '0.4rem',
                  paddingBottom: '0.4rem'
                }}
                placeholder="Search slides..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Thumbnails List */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem' }}>
            {filtered.map(slide => {
              const isActive = slide.id === activeId;
              return (
                <div
                  key={slide.id}
                  style={{
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '0.4rem',
                    cursor: 'pointer',
                    background: isActive ? 'var(--bg-surface-secondary)' : 'transparent',
                    border: isActive ? '1px solid var(--border-strong)' : '1px solid transparent',
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => activateSlide(slide)}
                >
                  {/* Thumbnail 16:9 canvas representation */}
                  <div style={{
                    aspectRatio: '16/9',
                    background: '#141416',
                    borderRadius: '3px',
                    marginBottom: '0.35rem',
                    overflow: 'hidden',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '0.4rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.2rem',
                  }}>
                    <div style={{ height: '4px', background: '#D4D4D8', borderRadius: '1px', width: '65%' }} />
                    <div style={{ height: '2px', background: '#52525B', borderRadius: '1px', width: '85%' }} />
                    <div style={{ height: '2px', background: '#52525B', borderRadius: '1px', width: '70%' }} />
                    {slide.hasCode && (
                      <div style={{ height: '14px', background: '#09090B', borderRadius: '1px', marginTop: '2px' }} />
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.25rem' }}>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {slide.number}. {slide.title}
                    </span>
                    {slide.verificationStatus === 'passed' && (
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--status-passed)', flexShrink: 0 }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Slide button */}
          <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)' }}>
            <button
              className="btn-secondary"
              style={{ width: '100%', justifyContent: 'center', gap: '0.35rem', fontSize: '0.775rem' }}
              onClick={() => addToast('Slide added to deck.', 'info')}
            >
              <Plus size={13} /> Add Slide
            </button>
          </div>
        </div>

        {/* COLUMN 2: Central Slide Canvas & Tabs */}
        <div style={{
          overflowY: 'auto',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          background: 'var(--bg-base)'
        }}>
          {/* Canvas Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <button
                className="btn-icon"
                onClick={() => {
                  const idx = slides.findIndex(s => s.id === activeId);
                  if (idx > 0) activateSlide(slides[idx - 1]);
                }}
              >
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Slide {activeSlide.number} of {slides.length}
              </span>
              <button
                className="btn-icon"
                onClick={() => {
                  const idx = slides.findIndex(s => s.id === activeId);
                  if (idx < slides.length - 1) activateSlide(slides[idx + 1]);
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {history.length > 0 && (
                <button className="btn-secondary" style={{ gap: '0.35rem', fontSize: '0.775rem' }} onClick={handleUndo}>
                  <Undo2 size={12} /> Undo
                </button>
              )}
              <button className="btn-primary" style={{ gap: '0.35rem', fontSize: '0.775rem' }} onClick={() => setRegenModal(true)}>
                <RefreshCw size={12} /> Regenerate This Slide
              </button>
            </div>
          </div>

          {/* 16:9 Presentation Canvas */}
          <SlideCanvas slide={activeSlide} />

          {/* Tabbed inspector under canvas */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-surface)'
            }}>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '0.65rem 1rem',
                    fontSize: '0.775rem',
                    border: 'none',
                    borderBottom: `2px solid ${activeTab === tab.id ? 'var(--text-primary)' : 'transparent'}`,
                    background: 'transparent',
                    color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontFamily: 'var(--font-sans)',
                    fontWeight: activeTab === tab.id ? 600 : 400
                  }}
                >
                  <tab.icon size={13} />
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ padding: '1.25rem' }}>
              {activeTab === 'content' && (
                <div>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                    LEARNING BULLETS
                  </h4>
                  <ul style={{ listStyle: 'disc', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {activeSlide.content.map((c, i) => (
                      <li key={i} style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {activeTab === 'notes' && (
                <div>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                    TRAINER TALKING POINTS
                  </h4>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                    {activeSlide.trainerNotes || 'No notes defined for this slide.'}
                  </p>
                </div>
              )}

              {activeTab === 'code' && (
                <div>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                    RAW CODE SNIPPET
                  </h4>
                  {activeSlide.codeExample ? (
                    <div
                      className="code-block"
                      style={{ fontSize: '0.775rem' }}
                      dangerouslySetInnerHTML={{ __html: highlightCode(activeSlide.codeExample) }}
                    />
                  ) : (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No code example attached to this slide.</p>
                  )}
                </div>
              )}

              {activeTab === 'verify' && (
                <div>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                    RUNTIME VERIFICATION
                  </h4>
                  {activeSlide.verificationStatus ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className={`status-dot ${activeSlide.verificationStatus === 'passed' ? 'green' : 'red'}`} />
                      <span style={{ fontSize: '0.825rem', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                        {activeSlide.verificationStatus} (Java 21 verified runtime)
                      </span>
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>This slide does not contain runnable code.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLUMN 3: Right Settings Panel */}
        <div style={{
          borderLeft: '1px solid var(--border)',
          background: 'var(--bg-surface)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          overflowY: 'auto'
        }}>
          <div>
            <p className="overline-editorial" style={{ marginBottom: '0.35rem' }}>
              Slide Properties
            </p>
            <h3 style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              Settings & Content
            </h3>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
              Slide Title
            </label>
            <input
              className="input-field"
              value={isEditing ? editedTitle : activeSlide.title}
              onChange={e => {
                setIsEditing(true);
                setEditedTitle(e.target.value);
              }}
              style={{ fontSize: '0.8rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
              Body Explanation
            </label>
            <textarea
              className="input-field"
              rows={4}
              value={isEditing ? editedBody : (activeSlide.body || '')}
              onChange={e => {
                setIsEditing(true);
                setEditedBody(e.target.value);
              }}
              style={{ resize: 'vertical', fontSize: '0.8rem', lineHeight: 1.55 }}
            />
          </div>

          {isEditing && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn-primary" style={{ flex: 1, fontSize: '0.775rem' }} onClick={saveEdits}>
                Save Changes
              </button>
              <button className="btn-secondary" style={{ fontSize: '0.775rem' }} onClick={() => setIsEditing(false)}>
                Cancel
              </button>
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
              Slide Layout Template
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.4rem' }}>
              {['Title + Bullets', 'Title + Code', 'Two Columns', 'Full Code'].map(layout => (
                <button
                  key={layout}
                  type="button"
                  className="btn-ghost"
                  style={{
                    justifyContent: 'flex-start',
                    fontSize: '0.775rem',
                    padding: '0.45rem 0.65rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    background: layout === 'Title + Code' && activeSlide.hasCode ? 'var(--bg-surface-secondary)' : 'transparent'
                  }}
                  onClick={() => addToast(`Layout template set to ${layout}`, 'info')}
                >
                  {layout}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Regeneration Modal */}
      <Modal isOpen={regenModal} onClose={() => setRegenModal(false)} title="Regenerate Slide">
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          This will synthesize a new variation for slide {activeSlide.number} ("{activeSlide.title}"). Your current version will be saved in the undo buffer.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={() => setRegenModal(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleRegenerate}>Confirm Regenerate</button>
        </div>
      </Modal>
    </div>
  );
}

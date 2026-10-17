// src/pages/CourseOverviewPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Presentation, BookText, Code2, FlaskConical, HelpCircle, FileText,
  ChevronRight, ShieldCheck, Clock, Layers, X, ArrowRight,
  AlertTriangle, Loader2, RotateCcw
} from 'lucide-react';
import WorkspaceHeader from '../components/layout/WorkspaceHeader';
import { api } from '../api';

// Build material-card definitions from live course data
function buildCards(course) {
  const snippets     = course.content?.snippets    || [];
  const exercises    = course.content?.exercises   || [];
  const quiz         = course.content?.quiz        || [];
  const slides       = course.content?.slides      || [];
  const passedSnips  = snippets.filter(s => s.status === 'passed').length;
  const totalSnips   = snippets.length;

  return [
    {
      id:          'slides',
      icon:        Presentation,
      title:       'Presentation Slides',
      stat:        `${slides.length || course.slidesCount || 0} slides`,
      description: 'Structured slide deck with diagrams and code blocks.',
      status:      'Ready',
      route:       'slides',
      actionLabel: 'Edit Slides',
    },
    {
      id:          'notes',
      icon:        BookText,
      title:       'Trainer Notes',
      stat:        `${slides.length || course.slidesCount || 0} slides with notes`,
      description: 'Speaker notes and talking points for every slide.',
      status:      'Ready',
      route:       'slides',
      actionLabel: 'Preview Notes',
    },
    {
      id:          'code',
      icon:        Code2,
      title:       'Code Examples',
      stat:        `${totalSnips} snippet${totalSnips !== 1 ? 's' : ''}`,
      description: 'Runnable code examples verified against Java 21 runtime.',
      status:      totalSnips > 0 ? `${passedSnips}/${totalSnips} Passed` : 'No Snippets',
      route:       'verification',
      actionLabel: 'Inspect Code',
    },
    {
      id:          'exercises',
      icon:        FlaskConical,
      title:       'Practical Exercises',
      stat:        `${exercises.length || course.exercisesCount || 0} exercises`,
      description: 'Hands-on coding exercises with automated tests.',
      status:      exercises.length > 0 ? `${exercises.length} labs ready` : 'Pending',
      route:       'exercises',
      actionLabel: 'View Exercises',
    },
    {
      id:          'quiz',
      icon:        HelpCircle,
      title:       'Interactive Quiz',
      stat:        `${quiz.length || course.quizCount || 0} questions`,
      description: 'Multiple-choice questions with answer rationales.',
      status:      quiz.length > 0 ? 'Ready' : 'Pending',
      route:       'quiz',
      actionLabel: 'Take Quiz',
    },
    {
      id:          'cheatsheet',
      icon:        FileText,
      title:       'Cheat Sheet',
      stat:        '1-page reference',
      description: 'Condensed reference card of key syntax and complexity.',
      status:      'Ready',
      route:       null,
      actionLabel: 'View Sheet',
    },
  ];
}

export default function CourseOverviewPage() {
  const { courseId } = useParams();
  const navigate     = useNavigate();

  const [course,    setCourse]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [cheatSheet, setCheatSheet] = useState(false);

  const fetchCourse = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCourse(courseId);
      setCourse(res.course);
    } catch (err) {
      console.error('CourseOverviewPage: fetch failed', err);
      setError(err.message || 'Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCourse(); }, [courseId]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div style={{ background: 'var(--bg-base)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 size={32} className="spinner" style={{ color: 'var(--text-primary)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading course overview…</p>
      </div>
    );
  }

  /* ── Error ── */
  if (error || !course) {
    return (
      <div style={{ background: 'var(--bg-base)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', padding: '2rem' }}>
        <AlertTriangle size={36} color="var(--status-failed)" />
        <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>Failed to Load Course</h2>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '400px' }}>{error || 'Course not found.'}</p>
        <button className="btn-secondary" onClick={fetchCourse} style={{ gap: '0.4rem' }}>
          <RotateCcw size={14} /> Retry
        </button>
      </div>
    );
  }

  /* ── Derived data ── */
  const snippets    = course.content?.snippets  || [];
  const exercises   = course.content?.exercises || [];
  const quiz        = course.content?.quiz      || [];
  const slides      = course.content?.slides    || [];
  const passedSnips = snippets.filter(s => s.status === 'passed').length;
  const totalSnips  = snippets.length;
  const cards       = buildCards(course);

  const verificationLabel = totalSnips > 0
    ? `Verification: ${passedSnips}/${totalSnips} passed`
    : 'Verification: Not run';
  const verificationColor = totalSnips > 0 && passedSnips === totalSnips
    ? 'var(--status-passed)'
    : totalSnips > 0 && passedSnips > 0
      ? 'var(--status-review)'
      : 'var(--text-muted)';

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', transition: 'background-color 0.2s ease' }}>
      <WorkspaceHeader course={course} />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2.5rem 1.5rem 5rem' }}>

        {/* Breadcrumb */}
        <div style={{
          display: 'flex', gap: '0.4rem', alignItems: 'center',
          marginBottom: '1.75rem', fontSize: '0.8rem',
          color: 'var(--text-muted)', fontFamily: 'var(--font-mono)'
        }}>
          <Link to="/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Library</Link>
          <ChevronRight size={12} />
          <span style={{ color: 'var(--text-primary)' }}>{course.title}</span>
        </div>

        {/* Course Overview Banner */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '2.25rem', marginBottom: '2.5rem',
        }}>
          <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 450px' }}>
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
                <span className="badge badge-green">Completed</span>
                {course.level     && <span className="badge badge-gray">{course.level}</span>}
                {course.language  && <span className="badge badge-gray">{course.language}</span>}
                {course.framework && course.framework !== 'None' && (
                  <span className="badge badge-gray">{course.framework}</span>
                )}
              </div>

              <h1 className="heading-editorial" style={{
                fontSize: 'clamp(1.75rem, 3.5vw, 2.35rem)',
                lineHeight: 1.2, marginBottom: '0.75rem',
              }}>
                {course.title}
              </h1>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.65, maxWidth: '560px' }}>
                {course.description}
              </p>
            </div>

            {/* Metrics Tiles */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(2, 100px)',
              gap: '0.75rem', alignContent: 'start'
            }}>
              {[
                { label: 'Slides',  value: slides.length    || course.slidesCount    || 0 },
                { label: 'Code',    value: totalSnips        || course.codeExamplesCount || 0 },
                { label: 'Labs',    value: exercises.length  || course.exercisesCount  || 0 },
                { label: 'Quiz Qs', value: quiz.length       || course.quizCount       || 0 },
              ].map(s => (
                <div
                  key={s.label}
                  style={{
                    textAlign: 'center', padding: '0.85rem 0.5rem',
                    background: 'var(--bg-surface-secondary)',
                    borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                  }}
                >
                  <p style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {s.value}
                  </p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Meta footer row */}
          <div style={{
            display: 'flex', gap: '1.5rem', marginTop: '1.75rem',
            paddingTop: '1.25rem', borderTop: '1px solid var(--border)',
            flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-muted)', alignItems: 'center'
          }}>
            {course.duration && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Clock size={13} /> {course.duration}
              </span>
            )}
            {course.level && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Layers size={13} /> {course.level}
              </span>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: verificationColor }}>
              <ShieldCheck size={13} /> {verificationLabel}
            </span>
            <span style={{
              fontSize: '0.7rem', color: 'var(--status-passed)',
              fontFamily: 'var(--font-mono)', border: '1px solid var(--status-passed)',
              padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)'
            }}>
              Live Data
            </span>
          </div>
        </div>

        {/* Section Header */}
        <div style={{ marginBottom: '1.25rem' }}>
          <p className="overline-editorial" style={{ marginBottom: '0.35rem' }}>Deliverables</p>
          <h2 style={{ fontWeight: 600, fontSize: '1.15rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Course Materials
          </h2>
        </div>

        {/* Material Cards Grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.25rem', marginBottom: '2.5rem'
        }}>
          {cards.map(card => (
            <div
              key={card.id}
              style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', padding: '1.5rem',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                transition: 'border-color 0.15s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface-secondary)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-primary)'
                  }}>
                    <card.icon size={15} />
                  </div>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {card.stat}
                  </span>
                </div>

                <h3 style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  {card.title}
                </h3>

                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '1.25rem' }}>
                  {card.description}
                </p>
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)'
              }}>
                <span style={{
                  fontSize: '0.75rem',
                  color: card.status.includes('Passed') || card.status === 'Ready'
                    ? 'var(--status-passed)'
                    : 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)'
                }}>
                  ● {card.status}
                </span>

                <button
                  className="btn-secondary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.775rem', gap: '0.35rem' }}
                  onClick={() => {
                    if (!card.route) { setCheatSheet(true); return; }
                    navigate(`/studio/${courseId}/${card.route}`);
                  }}
                >
                  {card.actionLabel} <ChevronRight size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Quick studio navigation */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: '1.75rem' }}>
          {[
            { label: 'Slide Deck Editor',         route: 'slides' },
            { label: 'Code Verification Runner',   route: 'verification' },
            { label: 'Practical Labs',             route: 'exercises' },
            { label: 'Interactive Assessment',     route: 'quiz' },
          ].map(n => (
            <button
              key={n.label}
              className="btn-secondary"
              onClick={() => navigate(`/studio/${courseId}/${n.route}`)}
              style={{ fontSize: '0.8rem' }}
            >
              {n.label} <ArrowRight size={12} />
            </button>
          ))}
        </div>
      </div>

      {/* Cheat sheet modal – dynamically built from course content */}
      {cheatSheet && (
        <div className="modal-overlay" onClick={() => setCheatSheet(false)}>
          <div className="modal-box" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <p className="overline-editorial" style={{ marginBottom: '0.2rem' }}>Reference Card</p>
                <h3 style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                  {course.title} — Quick Reference
                </h3>
              </div>
              <button className="btn-icon" onClick={() => setCheatSheet(false)}><X size={15} /></button>
            </div>

            {/* Key snippets from course content as reference items */}
            {snippets.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.25rem', maxHeight: '340px', overflowY: 'auto' }}>
                {snippets.slice(0, 8).map((snip, i) => (
                  <div
                    key={snip.id || i}
                    style={{
                      background: 'var(--bg-surface-secondary)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)', padding: '0.75rem 0.85rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem'
                    }}
                  >
                    <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', margin: 0 }}>
                      {snip.title}
                    </p>
                    <span style={{
                      fontSize: '0.7rem', fontFamily: 'var(--font-mono)',
                      color: snip.status === 'passed' ? 'var(--status-passed)' : 'var(--text-muted)',
                      flexShrink: 0
                    }}>
                      {snip.status === 'passed' ? '✓ Verified' : snip.status || 'pending'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                No code snippets found in this course yet.
              </p>
            )}

            <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setCheatSheet(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

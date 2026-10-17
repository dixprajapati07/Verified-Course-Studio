// src/pages/CreateCoursePage.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowRight, Paperclip, Check, AlertCircle, Shield, Layers, Clock, BookOpen, Calculator } from 'lucide-react';
import { useApp } from '../context/AppContext';
import SmartBackButton from '../components/common/SmartBackButton';
import { recordNavPath } from '../utils/navigation';

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const PRESET_DURATIONS = ['30 minutes', '60 minutes', '90 minutes', '120 minutes', 'Custom'];
const COMMON_LECTURE_COUNTS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 24, 30];

export default function CreateCoursePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { guestSession, draftCourse, updateDraftCourse, addToast, openAuthModal, isDark, toggleTheme } = useApp();

  const fileInputRef = useRef(null);
  const topicRef = useRef(null);

  // Initialize from location state if passed, or draftCourse in sessionStorage, or defaults
  const initialTopic = location.state?.prompt || location.state?.topic || draftCourse?.topic || '';
  const initialLevel = location.state?.level || draftCourse?.level || 'Beginner';
  const initialDuration = location.state?.duration || draftCourse?.duration || '60 minutes';
  const initialLectures = Number(location.state?.numberOfLectures || draftCourse?.numberOfLectures) || 4;
  const initialObjectives = draftCourse?.learningObjectives || '';
  const initialFileAttached = location.state?.fileAttached || draftCourse?.fileAttached || false;

  const [topic, setTopic] = useState(initialTopic);
  const [level, setLevel] = useState(initialLevel);
  const [durationPreset, setDurationPreset] = useState(() => {
    if (PRESET_DURATIONS.includes(initialDuration)) return initialDuration;
    return '60 minutes';
  });
  const [customMinutes, setCustomMinutes] = useState(() => {
    const parsed = parseInt(String(initialDuration).replace(/\D/g, ''), 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 60;
  });
  const [numberOfLectures, setNumberOfLectures] = useState(initialLectures);
  const [learningObjectives, setLearningObjectives] = useState(initialObjectives);
  const [fileAttached, setFileAttached] = useState(initialFileAttached);
  const [attachedFileName, setAttachedFileName] = useState(draftCourse?.fileName || '');
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track navigation path
  useEffect(() => {
    recordNavPath(location.pathname);
  }, [location.pathname]);

  // Derive active total minutes
  const totalMinutes = durationPreset === 'Custom'
    ? Math.min(600, Math.max(15, Number(customMinutes) || 60))
    : parseInt(durationPreset.replace(/\D/g, ''), 10) || 60;

  // Auto calculate time per lecture
  const timePerLecture = Math.round(totalMinutes / Math.max(1, numberOfLectures));

  // Auto-save form inputs to session draft so back navigation & refresh preserve all data
  useEffect(() => {
    updateDraftCourse({
      topic,
      level,
      duration: durationPreset === 'Custom' ? `${totalMinutes} minutes` : durationPreset,
      durationMinutes: totalMinutes,
      numberOfLectures,
      learningObjectives,
      fileAttached,
      fileName: attachedFileName
    });
  }, [topic, level, durationPreset, totalMinutes, numberOfLectures, learningObjectives, fileAttached, attachedFileName, updateDraftCourse]);

  // Auto grow textarea
  useEffect(() => {
    if (topicRef.current) {
      topicRef.current.style.height = 'auto';
      topicRef.current.style.height = `${Math.max(120, topicRef.current.scrollHeight)}px`;
    }
  }, [topic]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!topic.trim()) {
      setValidationError('Please enter a course topic, description, or subject area.');
      topicRef.current?.focus();
      return;
    }

    if (numberOfLectures < 1 || numberOfLectures > 30) {
      setValidationError('Number of lectures must be between 1 and 30.');
      return;
    }

    setValidationError('');
    setIsSubmitting(true);

    const submissionData = {
      topic: topic.trim(),
      level,
      duration: `${totalMinutes} minutes`,
      durationMinutes: totalMinutes,
      numberOfLectures: Number(numberOfLectures),
      learningObjectives: learningObjectives.trim(),
      fileAttached,
      fileName: attachedFileName,
      courseId: `course-${Date.now().toString(36)}`,
      timestamp: Date.now()
    };

    updateDraftCourse(submissionData);

    setTimeout(() => {
      // Navigate to generation workspace
      navigate('/generate', { state: submissionData });
    }, 300);
  };

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', transition: 'background-color 0.2s ease' }}>
      {/* Creation Workspace Minimal Header */}
      <header className="navbar">
        <div style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '0 1.5rem',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Left: Smart Back and Branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <SmartBackButton fallbackPath="/" label="Home" />
            <div style={{ width: 1, height: 16, background: 'var(--border)' }} />

            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
              <div style={{
                width: 22,
                height: 22,
                borderRadius: '4px',
                background: 'var(--text-primary)',
                color: 'var(--bg-base)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)'
              }}>
                V
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }} className="hide-mobile">
                Verified Course Studio
              </span>
            </Link>
          </div>

          {/* Right: Guest Session indicator + Theme Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {guestSession ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.25rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-surface-secondary)',
                border: '1px solid var(--border)',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)'
              }}>
                <span className="status-dot green" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>Guest Session</span>
                <button
                  type="button"
                  onClick={openAuthModal}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: 'var(--accent-subtle)',
                    fontSize: '0.7rem',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    marginLeft: '0.25rem'
                  }}
                >
                  Sign in to save
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={openAuthModal}
                className="btn-ghost"
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
              >
                Sign In
              </button>
            )}

            <button
              className="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {isDark ? '☀' : '☾'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Form Content */}
      <main style={{ maxWidth: '820px', margin: '0 auto', padding: '3.5rem 1.5rem 6rem' }}>
        {/* Workspace Title & Editorial Subtext */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ marginBottom: '0.75rem' }}>
            <span className="overline-editorial" style={{
              display: 'inline-block',
              padding: '0.2rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
            }}>
              COURSE CREATION WORKSPACE
            </span>
          </div>

          <h1 className="heading-editorial" style={{
            fontSize: 'clamp(2rem, 4vw, 2.75rem)',
            lineHeight: 1.15,
            marginBottom: '0.75rem',
            color: 'var(--text-primary)'
          }}>
            Define your curriculum.
          </h1>

          <p style={{
            fontSize: '0.95rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            maxWidth: '640px'
          }}>
            Specify the teaching topic, student level, total duration, and number of lectures. Verified Course Studio generates a complete teaching plan with lecture outlines, teaching notes, practical activities, and assessments.
          </p>
        </div>

        {/* Guest Session Note */}
        {guestSession && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.75rem 1rem',
            background: 'var(--bg-surface-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '2rem',
            fontSize: '0.775rem',
            color: 'var(--text-secondary)'
          }}>
            <Shield size={14} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
            <span>
              <strong>Local Guest Session active:</strong> Your curriculum drafts are cached in this browser session. To preserve course versions permanently,{' '}
              <button
                type="button"
                onClick={openAuthModal}
                style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-primary)', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}
              >
                sign in anytime
              </button>.
            </span>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '2rem',
            boxShadow: 'var(--shadow-sm)',
            marginBottom: '1.75rem'
          }}>
            {/* Field 1: Course Topic (Large Multiline Input) */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                <label style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.01em'
                }}>
                  Course Topic & Key Subject Area <span style={{ color: 'var(--status-failed)' }}>*</span>
                </label>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Required
                </span>
              </div>

              <textarea
                ref={topicRef}
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value);
                  if (validationError) setValidationError('');
                }}
                placeholder="Create a beginner course on the Java Collections Framework. Cover ArrayList, LinkedList, HashMap, and HashSet with verified code examples, common pitfalls, and hands-on exercises."
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '1rem',
                  background: 'var(--bg-surface)',
                  border: validationError ? '1px solid var(--status-failed)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem',
                  lineHeight: 1.6,
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.15s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = validationError ? 'var(--status-failed)' : 'var(--accent-subtle)'}
                onBlur={(e) => e.target.style.borderColor = validationError ? 'var(--status-failed)' : 'var(--border)'}
              />

              {validationError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.45rem', color: 'var(--status-failed)', fontSize: '0.775rem' }}>
                  <AlertCircle size={13} />
                  <span>{validationError}</span>
                </div>
              )}
            </div>

            {/* Field 2: Curriculum Structure Grid (Student Level, Total Duration, Number of Lectures) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '1.25rem',
              marginBottom: '2rem',
              padding: '1.5rem',
              background: 'var(--bg-surface-secondary)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)'
            }}>
              {/* Student Level */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  <Layers size={13} /> Student Level
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="select-field"
                  style={{ width: '100%' }}
                >
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.35rem' }}>
                  Pacing and difficulty tier
                </span>
              </div>

              {/* Total Course Duration */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  <Clock size={13} /> Total Course Duration
                </label>
                <select
                  value={durationPreset}
                  onChange={(e) => setDurationPreset(e.target.value)}
                  className="select-field"
                  style={{ width: '100%' }}
                >
                  {PRESET_DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>

                {durationPreset === 'Custom' ? (
                  <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <input
                      type="number"
                      min={15}
                      max={600}
                      value={customMinutes}
                      onChange={(e) => setCustomMinutes(Math.max(15, Math.min(600, parseInt(e.target.value, 10) || 60)))}
                      style={{
                        width: '90px',
                        padding: '0.35rem 0.5rem',
                        fontSize: '0.8rem',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)'
                      }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>minutes</span>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.35rem' }}>
                    Total duration across all classes
                  </span>
                )}
              </div>

              {/* Number of Lectures / Classes */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  <BookOpen size={13} /> Number of Lectures / Classes
                </label>
                <select
                  value={numberOfLectures}
                  onChange={(e) => setNumberOfLectures(Number(e.target.value))}
                  className="select-field"
                  style={{ width: '100%' }}
                >
                  {COMMON_LECTURE_COUNTS.map(count => (
                    <option key={count} value={count}>
                      {count} {count === 1 ? 'Lecture' : 'Lectures'}
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.35rem' }}>
                  Divide course into teaching sessions
                </span>
              </div>
            </div>

            {/* Calculated Session Duration Callout */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.85rem 1.25rem',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '2rem',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Calculator size={16} color="var(--accent-subtle)" />
                <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  <strong>Session Distribution:</strong> {totalMinutes} minutes total ÷ {numberOfLectures} {numberOfLectures === 1 ? 'class' : 'classes'}
                </span>
              </div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.25rem 0.65rem',
                borderRadius: 'var(--radius-full)',
                background: 'var(--bg-surface-secondary)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-primary)'
              }}>
                <span>Approx. <strong>{timePerLecture} mins</strong> per lecture</span>
              </div>
            </div>

            {/* Field 3: Optional Learning Objectives */}
            <div style={{ marginBottom: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                <label style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.01em'
                }}>
                  Specific Learning Objectives & Outcomes
                </label>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Optional
                </span>
              </div>

              <textarea
                value={learningObjectives}
                onChange={(e) => setLearningObjectives(e.target.value)}
                placeholder="List targeted competencies or classroom goals (e.g. 1. Understand memory overhead of LinkedList vs ArrayList; 2. Implement a custom Comparable interface; 3. Pass automated unit test suites)."
                style={{
                  width: '100%',
                  minHeight: '85px',
                  padding: '0.85rem',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  lineHeight: 1.55,
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.15s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent-subtle)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            {/* Field 4: Optional Reference File Attachment */}
            <div>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setFileAttached(true);
                    setAttachedFileName(file.name);
                    addToast(`Attached: ${file.name}`, 'info');
                  }
                }}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary"
                  style={{
                    fontSize: '0.8rem',
                    padding: '0.45rem 0.85rem',
                    borderColor: fileAttached ? 'var(--status-passed)' : 'var(--border)',
                    color: fileAttached ? 'var(--status-passed)' : 'var(--text-secondary)'
                  }}
                >
                  {fileAttached ? <Check size={14} /> : <Paperclip size={14} />}
                  <span>{fileAttached ? `Attached: ${attachedFileName}` : 'Attach Syllabus / Reference Notes'}</span>
                </button>

                {fileAttached && (
                  <button
                    type="button"
                    onClick={() => {
                      setFileAttached(false);
                      setAttachedFileName('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '0.725rem',
                      color: 'var(--text-muted)',
                      textDecoration: 'underline',
                      cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>
                )}

                <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                  Accepts Markdown, PDF, or text notes.
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Actions Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            {/* Smart Back Action */}
            <SmartBackButton fallbackPath="/" label="Back to Home" iconSize={14} />

            {/* Generate Course Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
              style={{
                padding: '0.75rem 1.75rem',
                fontSize: '0.9rem',
                gap: '0.5rem',
                minWidth: '180px',
                justifyContent: 'center'
              }}
            >
              {isSubmitting ? (
                <>
                  <div className="spinner" />
                  <span>Configuring Pipeline...</span>
                </>
              ) : (
                <>
                  <span>Generate Course</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

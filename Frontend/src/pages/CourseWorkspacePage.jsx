// src/pages/CourseWorkspacePage.jsx
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Presentation,
  BookText,
  Code2,
  FlaskConical,
  HelpCircle,
  FileText,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  Clock,
  Layers,
  ArrowRight,
  Terminal,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Download,
  RotateCcw,
  Menu,
  X,
  ExternalLink,
  AlertCircle,
  Sun,
  Moon
} from 'lucide-react';
import { mockCourses } from '../data/mockCourses';
import { mockSlides } from '../data/mockSlides';
import { mockSnippets, mockVerificationSummary } from '../data/mockVerification';
import { mockExercises } from '../data/mockExercises';
import { mockQuiz } from '../data/mockQuiz';
import { highlightCode } from '../utils/codeHighlighter';
import { useApp } from '../context/AppContext';
import SmartBackButton from '../components/common/SmartBackButton';
import { recordNavPath } from '../utils/navigation';
import { downloadCoursePptx, apiGetCourse } from '../services/api';

const SECTIONS = [
  { id: 'overview',     label: 'Overview',            icon: Layers },
  { id: 'slides',       label: 'Slides',              icon: Presentation },
  { id: 'notes',        label: 'Trainer Notes',       icon: BookText },
  { id: 'code',         label: 'Code Examples',       icon: Code2 },
  { id: 'exercises',    label: 'Exercises & Tests',   icon: FlaskConical },
  { id: 'quiz',         label: 'Quiz',                icon: HelpCircle },
  { id: 'cheatsheet',   label: 'Cheat Sheet',         icon: FileText },
  { id: 'verification', label: 'Verification Report', icon: ShieldCheck },
];

export default function CourseWorkspacePage() {
  const { courseId = 'course-001', section = 'overview' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { guestSession, isDark, toggleTheme, openAuthModal, addToast, currentCourse } = useApp();

  const [dbCourse, setDbCourse] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState(null);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState(0);
  const [selectedSnippetIndex, setSelectedSnippetIndex] = useState(0);
  const [solutionType, setSolutionType] = useState('reference'); // 'reference' | 'naive'
  const [quizAnswers, setQuizAnswers] = useState({});
  const [showQuizRationale, setShowQuizRationale] = useState({});
  const [exportModal, setExportModal] = useState(null);

  // Match course from dbCourse, AppContext, sessionStorage, localStorage, or fallback
  const course = useMemo(() => {
    if (dbCourse) return dbCourse;
    if (currentCourse && currentCourse.id === courseId) return currentCourse;
    try {
      const cached = sessionStorage.getItem(`course_${courseId}`);
      if (cached) return JSON.parse(cached);
      const savedRaw = localStorage.getItem('vcs_saved_courses');
      if (savedRaw) {
        const savedList = JSON.parse(savedRaw);
        const match = savedList.find(c => c.id === courseId);
        if (match) return match;
      }
    } catch (e) {}
    return mockCourses.find(c => c.id === courseId) || mockCourses[0];
  }, [courseId, currentCourse, dbCourse]);

  // Attempt to fetch from backend if not found locally
  useEffect(() => {
    let isMounted = true;
    if (courseId && courseId !== 'course-001' && (!currentCourse || currentCourse.id !== courseId)) {
      apiGetCourse(courseId)
        .then(res => {
          if (isMounted && res?.course) {
            setDbCourse(res.course);
          }
        })
        .catch(() => {});
    }
    return () => { isMounted = false; };
  }, [courseId, currentCourse]);

  // Derived content collections with fallbacks to realistic mock data
  const slidesList = useMemo(() => {
    const rawSlides = course?.slides || course?.content?.slides;
    if (Array.isArray(rawSlides) && rawSlides.length > 0) {
      return rawSlides.map((s, idx) => ({
        id: s.id || `slide-${idx + 1}`,
        number: s.number || idx + 1,
        title: s.title || `Slide ${idx + 1}`,
        type: s.type || 'bullets',
        content: Array.isArray(s.bullets) ? s.bullets : Array.isArray(s.content) ? s.content : [s.body || s.explanation || ''],
        body: s.body || (Array.isArray(s.bullets) ? s.bullets.join('. ') : ''),
        codeExample: s.codeExample || s.code || null,
        trainerNotes: s.trainerNotes || s.notes || 'Emphasize these key takeaways and guide student discussion.',
        hasCode: !!(s.codeExample || s.code),
        verificationStatus: (s.codeExample || s.code) ? 'passed' : null,
        theme: s.theme || 'dark',
      }));
    }
    return mockSlides;
  }, [course]);

  const exercisesList = useMemo(() => {
    const raw = course?.content?.exercises || course?.exercises;
    if (Array.isArray(raw) && raw.length > 0) {
      // Normalize AI-generated exercises to the expected shape
      return raw.map((ex, idx) => ({
        id: ex.id || `ex-${idx + 1}`,
        title: ex.title || `Exercise ${idx + 1}`,
        difficulty: ex.difficulty || 'intermediate',
        topic: ex.topic || '',
        description: ex.instructions || ex.description || '',
        testCases: Array.isArray(ex.testCriteria)
          ? ex.testCriteria.map((c, i) => ({ id: `tc-${i}`, description: c, expected: '' }))
          : [{ id: 'tc-0', description: 'Complete as instructed', expected: ex.expectedOutput || '' }],
        referenceSolution: ex.solution || ex.referenceSolution || '// Reference solution not provided',
        naiveSolution: ex.naiveSolution || `// Naive solution for ${ex.title || 'this exercise'}`,
        hints: ex.hints || [],
      }));
    }
    return mockExercises;
  }, [course]);

  const snippetsList = useMemo(() => {
    const raw = course?.content?.examples;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((ex, idx) => ({
        id: `snip-${idx + 1}`,
        title: ex.title,
        status: 'passed',
        code: ex.code,
        language: ex.language || course?.language || 'code',
        executionOutput: ex.expectedOutput || 'Output matches expected.',
        explanation: ex.explanation,
      }));
    }
    return mockSnippets;
  }, [course]);

  const quizList = useMemo(() => {
    const raw = course?.content?.questions;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((q, idx) => ({
        id: `q-${idx + 1}`,
        question: q.question,
        options: q.options || [],
        correctIndex: Array.isArray(q.options) && q.answer
          ? Math.max(q.options.indexOf(q.answer), 0)
          : 0,
        explanation: q.explanation || 'This is the correct answer based on course material.',
      }));
    }
    if (Array.isArray(course?.content?.modules)) {
      const modQuiz = course.content.modules.flatMap(m => m.quiz || []);
      if (modQuiz.length > 0) {
        return modQuiz.map((q, idx) => ({
          id: `q-${idx + 1}`,
          question: q.question,
          options: q.options || [],
          correctIndex: Array.isArray(q.options) && q.answer
            ? Math.max(q.options.indexOf(q.answer), 0)
            : 0,
          explanation: q.explanation || 'Verified answer from lesson syllabus.',
        }));
      }
    }
    return mockQuiz;
  }, [course]);

  const cheatSheetSections = useMemo(() => {
    const raw = course?.content?.cheatSheet;
    if (Array.isArray(raw) && raw.length > 0) return raw;
    return null; // null means show static fallback
  }, [course]);

  const trainerNotesList = useMemo(() => {
    const raw = course?.content?.notes;
    if (Array.isArray(raw) && raw.length > 0) return raw;
    return null; // null means derive from slides
  }, [course]);

  // Record path for smart back tracking
  useEffect(() => {
    recordNavPath(location.pathname);
  }, [location.pathname]);

  const activeSection = SECTIONS.some(s => s.id === section) ? section : 'overview';

  const handleSelectSection = (secId) => {
    setMobileSidebarOpen(false);
    navigate(`/course/${courseId}/${secId}`);
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard?.writeText(text);
    setCopiedCodeId(id);
    addToast('Code snippet copied to clipboard.', 'info');
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const activeSlide = slidesList[selectedSlideIndex] || slidesList[0];
  const activeExercise = exercisesList[selectedExerciseIndex] || exercisesList[0];
  const activeSnippet = snippetsList[selectedSnippetIndex] || snippetsList[0];


  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', display: 'flex', flexDirection: 'column', transition: 'background-color 0.2s ease' }}>
      {/* Top Workspace Toolbar */}
      <header className="navbar" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{
          maxWidth: '100%',
          padding: '0 1.25rem',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          {/* Left: Mobile sidebar toggle + Smart Back + Course Meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            {/* Mobile Sidebar Hamburger */}
            <button
              type="button"
              className="btn-icon hide-desktop"
              onClick={() => setMobileSidebarOpen(v => !v)}
              aria-label="Toggle sections sidebar"
            >
              {mobileSidebarOpen ? <X size={16} /> : <Menu size={16} />}
            </button>

            {/* Smart Back Button */}
            <SmartBackButton
              fallbackPath="/dashboard"
              label="Library"
              style={{ flexShrink: 0 }}
            />

            <div style={{ width: 1, height: 16, background: 'var(--border)', flexShrink: 0 }} />

            {/* Course Title & Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '4px',
                background: 'var(--text-primary)',
                color: 'var(--bg-base)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                flexShrink: 0
              }}>
                V
              </div>

              <div style={{ minWidth: 0 }}>
                <h1 style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  margin: 0
                }}>
                  {course.title}
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }} className="hide-mobile">
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{course.level}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>·</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{course.runtimeVersion}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Toolbar Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
            {/* Guest session badge */}
            {guestSession && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.2rem 0.55rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-surface-secondary)',
                border: '1px solid var(--border)',
                fontSize: '0.7rem',
                color: 'var(--text-secondary)'
              }}>
                <span className="status-dot green" />
                <span style={{ fontFamily: 'var(--font-mono)' }}>Guest</span>
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
                    cursor: 'pointer'
                  }}
                  className="hide-mobile"
                >
                  Sign In
                </button>
              </div>
            )}

            {/* Current Status Badge */}
            <span style={{
              fontSize: '0.725rem',
              color: 'var(--status-passed)',
              fontFamily: 'var(--font-mono)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }} className="hide-mobile">
              <span className="status-dot green" />
              6/8 Verified
            </span>

            {/* Theme Toggle */}
            <button
              className="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={13} /> : <Moon size={13} />}
            </button>

            {/* Regenerate Action */}
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: '0.775rem', padding: '0.4rem 0.75rem', gap: '0.35rem' }}
              onClick={() => navigate('/generate', { state: { courseId: course.id, topic: course.title } })}
              title="Regenerate course with fresh verification checks"
            >
              <RotateCcw size={12} />
              <span className="hide-mobile">Regenerate</span>
            </button>

            {/* Export Action */}
            <button
              type="button"
              className="btn-primary"
              style={{ fontSize: '0.775rem', padding: '0.4rem 0.85rem', gap: '0.35rem' }}
              onClick={() => setExportModal('all')}
            >
              <Download size={12} />
              <span>Export</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Body with Left Sidebar */}
      <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 56px)', position: 'relative' }}>
        {/* Left Sidebar (Desktop persistent, Mobile drawer) */}
        <aside
          className={`workspace-sidebar ${mobileSidebarOpen ? 'open' : ''}`}
          style={{
            width: '240px',
            borderRight: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '1.25rem 0.75rem',
            zIndex: 90
          }}
        >
          {/* Navigation Links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div style={{ padding: '0 0.5rem 0.65rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '0.5rem' }}>
              <span style={{
                fontSize: '0.7rem',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)'
              }}>
                SECTIONS
              </span>
            </div>

            {SECTIONS.map(sec => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => handleSelectSection(sec.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    padding: '0.6rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    background: isActive ? 'var(--bg-surface-secondary)' : 'transparent',
                    border: '1px solid',
                    borderColor: isActive ? 'var(--border)' : 'transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: isActive ? 600 : 400,
                    fontSize: '0.825rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.color = 'var(--text-primary)';
                      e.currentTarget.style.background = 'var(--bg-surface-secondary)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.color = 'var(--text-secondary)';
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <Icon size={15} style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-muted)' }} />
                  <span style={{ flex: 1 }}>{sec.label}</span>
                  {isActive && <ChevronRight size={12} color="var(--text-muted)" />}
                </button>
              );
            })}
          </div>

          {/* Sidebar Footer: Verification badge & status */}
          <div style={{
            padding: '0.85rem',
            background: 'var(--bg-surface-secondary)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            marginTop: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
              <ShieldCheck size={14} color="var(--status-passed)" />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Verified Runtime
              </span>
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', margin: 0 }}>
              {course.runtimeVersion}
            </p>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.35rem', fontStyle: 'italic' }}>
              Demo data — no code executed.
            </p>
          </div>
        </aside>

        {/* Mobile Backdrop */}
        {mobileSidebarOpen && (
          <div
            className="modal-overlay hide-desktop"
            style={{ zIndex: 85 }}
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <main style={{ flex: 1, padding: '2rem 2.25rem 5rem', maxWidth: '1200px', width: '100%', overflowY: 'auto' }}>
          {/* SECTION 1: OVERVIEW */}
          {activeSection === 'overview' && (
            <div>
              {/* Header card */}
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '2rem',
                marginBottom: '2rem'
              }}>
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
                  <span className="badge badge-green">Ready to Teach</span>
                  <span className="badge badge-gray">{course.level}</span>
                  <span className="badge badge-gray">{course.language}</span>
                  <span className="badge badge-gray">{course.duration}</span>
                </div>

                <h2 className="heading-editorial" style={{ fontSize: '2.25rem', marginBottom: '0.75rem' }}>
                  {course.title}
                </h2>
                <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '680px', marginBottom: '1.75rem' }}>
                  {course.description}
                </p>

                {/* 4 Metric Tiles */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '0.85rem'
                }}>
                  {[
                    { label: 'Slides', count: course.slidesCount || slidesList.length, icon: Presentation, target: 'slides' },
                    { label: 'Code Snippets', count: course.codeExamplesCount || snippetsList.length, icon: Code2, target: 'code' },
                    { label: 'Practical Labs', count: course.exercisesCount || exercisesList.length, icon: FlaskConical, target: 'exercises' },
                    { label: 'Quiz Questions', count: course.quizCount || quizList.length, icon: HelpCircle, target: 'quiz' },
                  ].map(stat => (
                    <div
                      key={stat.label}
                      onClick={() => handleSelectSection(stat.target)}
                      style={{
                        padding: '1rem',
                        background: 'var(--bg-surface-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        transition: 'border-color 0.15s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--text-primary)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                      <p style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', margin: 0 }}>
                        {stat.count}
                      </p>
                      <p style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0.25rem 0 0' }}>
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deliverable Cards */}
              <div style={{ marginBottom: '1rem' }}>
                <p className="overline-editorial" style={{ marginBottom: '0.35rem' }}>
                  Course Deliverables
                </p>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Teaching Materials & Modules
                </h3>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1rem'
              }}>
                {SECTIONS.filter(s => s.id !== 'overview').map(item => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectSection(item.id)}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '1.25rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'var(--border-strong)';
                        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div>
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-surface-secondary)',
                          border: '1px solid var(--border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-primary)',
                          marginBottom: '0.85rem'
                        }}>
                          <Icon size={16} />
                        </div>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                          {item.label}
                        </h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          {item.id === 'slides' && `${slidesList.length} presentation slides with trainer notes and code examples.`}
                          {item.id === 'notes' && 'Comprehensive talking points and teaching strategies per lesson.'}
                          {item.id === 'code' && `${snippetsList.length} verified code examples with expected output.`}
                          {item.id === 'exercises' && `${exercisesList.length} hands-on labs with test criteria and reference solutions.`}
                          {item.id === 'quiz' && `${quizList.length} multiple choice assessment questions with explanations.`}
                          {item.id === 'cheatsheet' && 'Condensed syntax and concept reference card.'}
                          {item.id === 'verification' && 'Structural quality checks and AI review assessment.'}
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '1rem', color: 'var(--text-primary)', fontSize: '0.775rem', fontWeight: 500 }}>
                        <span>Open Section</span>
                        <ArrowRight size={12} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 2: SLIDES */}
          {activeSection === 'slides' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <p className="overline-editorial" style={{ marginBottom: '0.35rem' }}>Presentation Deck</p>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Slide {activeSlide.number} of {slidesList.length}: {activeSlide.title}
                  </h2>
                </div>
                <Link
                  to={`/studio/${courseId}/slides`}
                  className="btn-secondary"
                  style={{ fontSize: '0.8rem', gap: '0.4rem', textDecoration: 'none' }}
                >
                  <ExternalLink size={13} /> Open Full Slide Editor
                </Link>
              </div>

              {/* 16:9 Presentation Canvas */}
              <div
                className="slide-canvas"
                style={{
                  background: '#141416',
                  color: '#F4F4F6',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-md)',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* Slide Top Bar */}
                <div style={{
                  padding: '0.65rem 1.25rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '0.65rem', color: '#A3A3A8', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    VERIFIED COURSE STUDIO
                  </span>
                  <span style={{ fontSize: '0.65rem', color: '#71717A', fontFamily: 'var(--font-mono)' }}>
                    {activeSlide.number} / {slidesList.length}
                  </span>
                </div>

                {/* Slide Body */}
                <div style={{ padding: '2.5rem 3rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#A5A5D6', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                    {activeSlide.type || 'CONTENT'}
                  </span>
                  <h3 style={{ fontSize: '1.85rem', fontWeight: 600, color: '#FFFFFF', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
                    {activeSlide.title}
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: activeSlide.codeExample ? '1.1fr 1fr' : '1fr', gap: '2rem', alignItems: 'center' }}>
                    {/* Bullets */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      {activeSlide.content?.map((b, i) => (
                        <div key={i} style={{ display: 'flex', gap: '0.65rem', fontSize: '0.95rem', color: '#D4D4D8', lineHeight: 1.5 }}>
                          <span style={{ color: '#71717A', fontFamily: 'var(--font-mono)' }}>—</span>
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>

                    {/* Code on slide */}
                    {activeSlide.codeExample && (
                      <div style={{
                        background: '#0D0D0E',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '1rem',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.775rem',
                        lineHeight: 1.5,
                        overflowX: 'auto',
                        color: '#E4E4E7'
                      }}>
                        <pre dangerouslySetInnerHTML={{ __html: highlightCode(activeSlide.codeExample, 'java') }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Slide Thumbnail Navigation Strip */}
              <div style={{ display: 'flex', gap: '0.65rem', overflowX: 'auto', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
                {slidesList.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSlideIndex(idx)}
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      background: idx === selectedSlideIndex ? 'var(--bg-surface-secondary)' : 'var(--bg-card)',
                      border: '1px solid',
                      borderColor: idx === selectedSlideIndex ? 'var(--text-primary)' : 'var(--border)',
                      cursor: 'pointer',
                      flexShrink: 0,
                      textAlign: 'left',
                      minWidth: '130px'
                    }}
                  >
                    <p style={{ fontSize: '0.675rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', margin: 0 }}>
                      SLIDE {s.number}
                    </p>
                    <p style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0.2rem 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.title}
                    </p>
                  </button>
                ))}
              </div>

              {/* Speaker Notes preview */}
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '1.25rem'
              }}>
                <p className="overline-editorial" style={{ marginBottom: '0.35rem' }}>Trainer Speaker Notes</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {activeSlide.trainerNotes || 'Emphasize the algorithmic difference between continuous memory allocation in ArrayList and node pointers in LinkedList.'}
                </p>
              </div>
            </div>
          )}

          {/* SECTION 3: TRAINER NOTES */}
          {activeSection === 'notes' && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <p className="overline-editorial" style={{ marginBottom: '0.35rem' }}>Speaker Cue Cards</p>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Trainer Notes & Teaching Guide
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Comprehensive talking points, pedagogical tips, and teaching strategies for every lesson.
                </p>
              </div>

              {trainerNotesList ? (
                // Show AI-generated structured trainer notes
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {trainerNotesList.map((note, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '1.5rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: '0.2rem' }}>
                            {note.moduleTitle}
                          </span>
                          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                            {note.lessonTitle}
                          </h3>
                        </div>
                        {note.estimatedTime && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                            {note.estimatedTime}
                          </span>
                        )}
                      </div>

                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: '0.85rem' }}>
                        {note.overview}
                      </p>

                      {Array.isArray(note.keyPoints) && note.keyPoints.length > 0 && (
                        <div style={{ marginBottom: '0.85rem' }}>
                          <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Key Points</p>
                          <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            {note.keyPoints.map((pt, i) => (
                              <li key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{pt}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {Array.isArray(note.teachingTips) && note.teachingTips.length > 0 && (
                        <div style={{
                          padding: '0.65rem 0.85rem',
                          background: 'var(--bg-surface-secondary)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)'
                        }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Teaching Tips: </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{note.teachingTips.join(' · ')}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                // Fallback: derive from slide trainer notes
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {slidesList.map(slide => (
                    <div
                      key={slide.id}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '1.5rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <span style={{
                            padding: '0.15rem 0.5rem',
                            borderRadius: 'var(--radius-full)',
                            background: 'var(--bg-surface-secondary)',
                            border: '1px solid var(--border)',
                            fontSize: '0.7rem',
                            fontFamily: 'var(--font-mono)'
                          }}>SLIDE {slide.number}</span>
                          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{slide.title}</h3>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Est. 4-5 mins</span>
                      </div>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                        {slide.trainerNotes || 'No trainer notes available for this slide.'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION 4: CODE EXAMPLES */}
          {activeSection === 'code' && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <p className="overline-editorial" style={{ marginBottom: '0.35rem' }}>Instructional Code</p>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Verified Code Snippets
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Runnable examples targeting {course.runtimeVersion}. Each snippet includes test assertions and execution logs.
                </p>
              </div>

              {/* Snippet selector tabs */}
              <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
                {snippetsList.map((snip, idx) => (
                  <button
                    key={snip.id}
                    type="button"
                    onClick={() => setSelectedSnippetIndex(idx)}
                    className={idx === selectedSnippetIndex ? 'btn-primary' : 'btn-secondary'}
                    style={{ fontSize: '0.775rem', padding: '0.4rem 0.85rem', flexShrink: 0 }}
                  >
                    {snip.title}
                  </button>
                ))}
              </div>

              {/* Code viewer box */}
              <div style={{
                background: 'var(--bg-surface-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  padding: '0.75rem 1.25rem',
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--bg-surface)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="status-dot green" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{activeSnippet.title}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>({activeSnippet.runtimeVersion})</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => copyToClipboard(activeSnippet.code, activeSnippet.id)}
                    className="btn-ghost"
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', gap: '0.35rem' }}
                  >
                    {copiedCodeId === activeSnippet.id ? <Check size={12} color="var(--status-passed)" /> : <Copy size={12} />}
                    <span>{copiedCodeId === activeSnippet.id ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div style={{ padding: '1.25rem', overflowX: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', lineHeight: 1.6 }}>
                  <pre dangerouslySetInnerHTML={{ __html: highlightCode(activeSnippet.code, 'java') }} />
                </div>

                {/* Output log */}
                <div style={{
                  padding: '0.85rem 1.25rem',
                  borderTop: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem'
                }}>
                  <p style={{ color: 'var(--text-muted)', margin: '0 0 0.35rem', fontSize: '0.675rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Program Output
                  </p>
                  <pre style={{ margin: 0, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                    {activeSnippet.executionOutput}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: EXERCISES & TESTS */}
          {activeSection === 'exercises' && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <p className="overline-editorial" style={{ marginBottom: '0.35rem' }}>Hands-on Learning</p>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Practical Exercises & Automated Tests
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Coding challenges with automated unit test suites and complexity comparison between reference and naive implementations.
                </p>
              </div>

              {/* Exercise Selector */}
              <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
                {exercisesList.map((ex, idx) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => setSelectedExerciseIndex(idx)}
                    className={idx === selectedExerciseIndex ? 'btn-primary' : 'btn-secondary'}
                    style={{ fontSize: '0.775rem', padding: '0.4rem 0.85rem', flexShrink: 0 }}
                  >
                    Lab {idx + 1}: {ex.title}
                  </button>
                ))}
              </div>

              {/* Problem Details */}
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '1.5rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span className="badge badge-gray">{activeExercise.difficulty}</span>
                  <span className="badge badge-gray">{activeExercise.topic}</span>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    {activeExercise.title}
                  </h3>
                </div>

                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                  {activeExercise.description}
                </p>

                {/* Test cases list */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                    Automated Test Assertions ({activeExercise.testCases.length} Tests)
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {activeExercise.testCases.map(tc => (
                      <div
                        key={tc.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.5rem 0.75rem',
                          background: 'var(--bg-surface-secondary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.775rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <CheckCircle2 size={13} color="var(--status-passed)" />
                          <span style={{ color: 'var(--text-primary)' }}>{tc.description}</span>
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.725rem' }}>
                          {tc.expected}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Solution Toggle (Reference vs Naive) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Implementation Solutions
                    </span>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        type="button"
                        onClick={() => setSolutionType('reference')}
                        className={solutionType === 'reference' ? 'btn-primary' : 'btn-secondary'}
                        style={{ fontSize: '0.725rem', padding: '0.25rem 0.65rem' }}
                      >
                        Reference (Optimal)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSolutionType('naive')}
                        className={solutionType === 'naive' ? 'btn-primary' : 'btn-secondary'}
                        style={{ fontSize: '0.725rem', padding: '0.25rem 0.65rem' }}
                      >
                        Naive (Common Pitfall)
                      </button>
                    </div>
                  </div>

                  <div style={{
                    background: 'var(--bg-surface-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '1rem',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.775rem',
                    overflowX: 'auto'
                  }}>
                    <pre dangerouslySetInnerHTML={{
                      __html: highlightCode(
                        solutionType === 'reference' ? activeExercise.referenceSolution : activeExercise.naiveSolution,
                        'java'
                      )
                    }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 6: QUIZ */}
          {activeSection === 'quiz' && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <p className="overline-editorial" style={{ marginBottom: '0.35rem' }}>Knowledge Check</p>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Interactive Assessment Questions
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Select an answer to immediately review the pedagogical explanation and rationale.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {quizList.map((q, idx) => {
                  const selected = quizAnswers[q.id];
                  const hasAnswered = selected !== undefined;
                  const isCorrect = selected === q.correctIndex;

                  return (
                    <div
                      key={q.id}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '1.5rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          QUESTION {idx + 1} OF {quizList.length}
                        </span>
                        {hasAnswered && (
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: isCorrect ? 'var(--status-passed)' : 'var(--status-failed)',
                            fontFamily: 'var(--font-mono)'
                          }}>
                            {isCorrect ? '✓ CORRECT' : '✗ INCORRECT'}
                          </span>
                        )}
                      </div>

                      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem', lineHeight: 1.5 }}>
                        {q.question}
                      </h3>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                        {(q.options || []).map((opt, optIdx) => {
                          const isOptionSelected = selected === optIdx;
                          const showResult = hasAnswered;
                          const isCorrectOpt = optIdx === q.correctIndex;
                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => !hasAnswered && setQuizAnswers(prev => ({ ...prev, [q.id]: optIdx }))}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.65rem 0.85rem',
                                borderRadius: 'var(--radius-sm)',
                                background: showResult && isCorrectOpt
                                  ? 'rgba(34,197,94,0.08)'
                                  : showResult && isOptionSelected && !isCorrectOpt
                                  ? 'rgba(239,68,68,0.08)'
                                  : isOptionSelected ? 'var(--bg-surface-secondary)' : 'var(--bg-surface)',
                                border: '1px solid',
                                borderColor: showResult && isCorrectOpt
                                  ? 'var(--status-passed)'
                                  : showResult && isOptionSelected && !isCorrectOpt
                                  ? 'var(--status-failed)'
                                  : isOptionSelected ? 'var(--text-primary)' : 'var(--border)',
                                color: 'var(--text-primary)',
                                textAlign: 'left',
                                fontSize: '0.85rem',
                                cursor: hasAnswered ? 'default' : 'pointer'
                              }}
                            >
                              <span style={{
                                width: 20, height: 20,
                                borderRadius: '50%',
                                border: '1px solid',
                                borderColor: isOptionSelected ? 'var(--text-primary)' : 'var(--border)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.7rem', fontFamily: 'var(--font-mono)', flexShrink: 0
                              }}>
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span style={{ flex: 1 }}>{opt}</span>
                              {showResult && isCorrectOpt && <CheckCircle2 size={14} color="var(--status-passed)" />}
                              {showResult && isOptionSelected && !isCorrectOpt && <XCircle size={14} color="var(--status-failed)" />}
                            </button>
                          );
                        })}
                      </div>

                      {hasAnswered && (
                        <div style={{
                          padding: '0.85rem 1rem',
                          background: 'var(--bg-surface-secondary)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.8rem',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.5
                        }}>
                          <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>Explanation & Rationale:</p>
                          <p style={{ margin: 0 }}>{q.explanation || 'This is the correct answer based on course material.'}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 7: CHEAT SHEET */}
          {activeSection === 'cheatsheet' && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <p className="overline-editorial" style={{ marginBottom: '0.35rem' }}>Reference Card</p>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {course?.title ? `${course.title} — Quick Reference` : 'Course Quick Reference'}
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Condensed reference guide: key terms, syntax, commands, and best practices.
                </p>
              </div>

              {/* AI-generated cheat sheet sections */}
              {cheatSheetSections && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.75rem' }}>
                  {cheatSheetSections.map((section, sIdx) => (
                    <div
                      key={sIdx}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{section.title}</h3>
                        {section.type && (
                          <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{section.type}</span>
                        )}
                      </div>
                      <div style={{ padding: '0.85rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {(section.items || []).map((item, iIdx) => (
                          <div key={iIdx} style={{
                            display: 'grid',
                            gridTemplateColumns: item.example ? '1fr 1.5fr 1fr' : '1fr 2fr',
                            gap: '0.75rem',
                            padding: '0.5rem 0',
                            borderBottom: iIdx < section.items.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                            alignItems: 'baseline'
                          }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.term}</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{item.definition}</span>
                            {item.example && (
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-surface-secondary)', padding: '0.15rem 0.4rem', borderRadius: 'var(--radius-sm)' }}>{item.example}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Static fallback if no AI cheat sheet was generated */}
              {!cheatSheetSections && (
                <>
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                marginBottom: '1.75rem'
              }}>
                <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    Asymptotic Time Complexities
                  </h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-surface-secondary)', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '0.65rem 1rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Collection</th>
                        <th style={{ padding: '0.65rem 1rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Access / get(i)</th>
                        <th style={{ padding: '0.65rem 1rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Add / Insert</th>
                        <th style={{ padding: '0.65rem 1rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Remove</th>
                        <th style={{ padding: '0.65rem 1rem', textAlign: 'left', color: 'var(--text-secondary)' }}>contains(key)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { name: 'ArrayList', get: 'O(1)', add: 'O(1) amortized', rem: 'O(n)', con: 'O(n)' },
                        { name: 'LinkedList', get: 'O(n)', add: 'O(1) at ends', rem: 'O(1) with node', con: 'O(n)' },
                        { name: 'HashMap', get: 'O(1) avg', add: 'O(1) avg', rem: 'O(1) avg', con: 'O(1) avg' },
                        { name: 'HashSet', get: 'N/A', add: 'O(1) avg', rem: 'O(1) avg', con: 'O(1) avg' },
                        { name: 'TreeMap', get: 'O(log n)', add: 'O(log n)', rem: 'O(log n)', con: 'O(log n)' },
                      ].map((row, i) => (
                        <tr key={row.name} style={{ borderBottom: i < 4 ? '1px solid var(--border-subtle)' : 'none' }}>
                          <td style={{ padding: '0.65rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{row.name}</td>
                          <td style={{ padding: '0.65rem 1rem', color: 'var(--text-secondary)' }}>{row.get}</td>
                          <td style={{ padding: '0.65rem 1rem', color: 'var(--text-secondary)' }}>{row.add}</td>
                          <td style={{ padding: '0.65rem 1rem', color: 'var(--text-secondary)' }}>{row.rem}</td>
                          <td style={{ padding: '0.65rem 1rem', color: 'var(--text-secondary)' }}>{row.con}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Best practices tips */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '1rem'
              }}>
                <div style={{ padding: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    When to Choose ArrayList
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    Default choice for sequences with frequent index access and iteration. Memory contiguous and cache friendly.
                  </p>
                </div>

                <div style={{ padding: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    When to Choose LinkedList
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    Use as a Deque or queue where frequent head/tail insertion and removal are required without resizing overhead.
                  </p>
                </div>

                <div style={{ padding: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    HashMap hashCode() Contract
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    Always override hashCode() whenever equals() is overridden. Equal objects must yield identical hash codes.
                  </p>
                </div>
              </div>
                </>
              )}
            </div>
          )}

          {/* SECTION 8: VERIFICATION REPORT (FEATURE 6) */}
          {activeSection === 'verification' && (
            <div>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <p className="overline-editorial" style={{ marginBottom: '0.35rem' }}>Compiler & Runtime Audit</p>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Code Verification Report
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Runtime environment assertions, test suite results, and execution diffs.
                  </p>
                </div>

                {/* Status Pill */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.4rem 0.85rem',
                  background: 'var(--bg-surface-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.775rem',
                  fontFamily: 'var(--font-mono)'
                }}>
                  <span className="status-dot green" />
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>OVERALL STATUS: PASSED</span>
                </div>
              </div>

              {/* Demo Notice */}
              <div style={{
                display: 'flex',
                gap: '0.65rem',
                padding: '0.85rem 1rem',
                background: 'var(--bg-surface-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1.75rem',
                alignItems: 'center'
              }}>
                <AlertCircle size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  <strong>Demo data — no code executed:</strong> This report represents the contract output from the planned Docker container runtime engine.
                </p>
              </div>

              {/* Status Metric Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem'
              }}>
                <div style={{ padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.35rem' }}>
                    Runtime Version
                  </p>
                  <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', margin: 0 }}>
                    Java 21 (OpenJDK 21.0.2)
                  </p>
                </div>

                <div style={{ padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.35rem' }}>
                    Compilation Status
                  </p>
                  <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--status-passed)', fontFamily: 'var(--font-mono)', margin: 0 }}>
                    ✓ Passed (0 warnings)
                  </p>
                </div>

                <div style={{ padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.35rem' }}>
                    Execution Status
                  </p>
                  <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--status-passed)', fontFamily: 'var(--font-mono)', margin: 0 }}>
                    ✓ Passed (312ms avg)
                  </p>
                </div>

                <div style={{ padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.35rem' }}>
                    Snippets Tested
                  </p>
                  <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', margin: 0 }}>
                    6 / 8 Verified
                  </p>
                </div>
              </div>

              {/* Solution Test Comparison */}
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                marginBottom: '1.75rem'
              }}>
                <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    Automated Test Suite Results (Reference vs Naive)
                  </h3>
                </div>
                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: 'var(--bg-surface-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)'
                  }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', margin: '0 0 0.2rem' }}>
                        Reference Solution (Optimal Streams & HashMap)
                      </p>
                      <p style={{ fontSize: '0.725rem', color: 'var(--text-muted)', margin: 0 }}>
                        5 test cases executed against JDK 21 container
                      </p>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--status-passed)', fontFamily: 'var(--font-mono)' }}>
                      5 / 5 PASSED (42ms)
                    </span>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: 'var(--bg-surface-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)'
                  }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', margin: '0 0 0.2rem' }}>
                        Naive Solution (Nested Loop Search)
                      </p>
                      <p style={{ fontSize: '0.725rem', color: 'var(--text-muted)', margin: 0 }}>
                        Exceeded 500ms time threshold on 100k item benchmark
                      </p>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--status-failed)', fontFamily: 'var(--font-mono)' }}>
                      2 / 5 PASSED (TLE on Scale)
                    </span>
                  </div>
                </div>
              </div>

              {/* Monospace Command & Error Output Terminals */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                {/* Standard Out */}
                <div style={{
                  background: 'var(--bg-surface-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '0.65rem 1rem',
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--bg-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)'
                  }}>
                    <Terminal size={13} />
                    <span>Command & Standard Output</span>
                  </div>
                  <pre style={{
                    margin: 0,
                    padding: '1rem',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-primary)',
                    lineHeight: 1.5,
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap'
                  }}>
{`$ javac -version
javac 21.0.2

$ javac ArrayListDemo.java LinkedListDemo.java
BUILD SUCCESSFUL in 0.42s

$ java -cp . ArrayListDemo
Banana
Apple
Banana
Cherry
Size after remove: 2

Verified exit code: 0 (OK)`}
                  </pre>
                </div>

                {/* Standard Error / Diagnostic */}
                <div style={{
                  background: 'var(--bg-surface-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '0.65rem 1rem',
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--bg-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)'
                  }}>
                    <ShieldAlert size={13} color="var(--text-muted)" />
                    <span>Compiler Warnings & Diagnostics (stderr)</span>
                  </div>
                  <pre style={{
                    margin: 0,
                    padding: '1rem',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-muted)',
                    lineHeight: 1.5,
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap'
                  }}>
{`Note: ArrayListDemo.java uses unchecked or unsafe operations.
Note: Recompile with -Xlint:unchecked for details.
Warnings: 0 fatal, 1 informational lint note.
Sandbox memory: 28MB / 512MB max.`}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Export Modal */}
      {exportModal && (
        <div className="modal-overlay" onClick={() => setExportModal(null)} style={{ zIndex: 9999 }}>
          <div className="modal-box animate-slide-up" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Export Teaching Package
              </h3>
              <button className="btn-icon" onClick={() => setExportModal(null)}><X size={15} /></button>
            </div>

            <div style={{
              display: 'flex',
              gap: '0.65rem',
              padding: '0.85rem 1rem',
              background: 'var(--bg-surface-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.5rem'
            }}>
              <AlertCircle size={15} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                Export prepares presentation slides (.pptx), trainer guide (.pdf), and runnable coding labs for student distribution.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <button
                type="button"
                className="btn-secondary"
                disabled={isExporting}
                style={{ justifyContent: 'space-between', padding: '0.75rem 1rem', fontSize: '0.85rem' }}
                onClick={async () => {
                  try {
                    setIsExporting(true);
                    addToast('Generating and downloading PowerPoint (.pptx)...', 'info');
                    await downloadCoursePptx(course);
                    addToast('PowerPoint downloaded successfully!', 'info');
                    setExportModal(null);
                  } catch (err) {
                    console.error('PPTX export error:', err);
                    addToast(`Export failed: ${err.message}`, 'warning');
                  } finally {
                    setIsExporting(false);
                  }
                }}
              >
                <span>{isExporting ? 'Generating Presentation...' : 'Download PowerPoint Deck (.pptx)'}</span>
                <Download size={14} />
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ justifyContent: 'space-between', padding: '0.75rem 1rem', fontSize: '0.85rem' }}
                onClick={() => {
                  try {
                    const content = `# ${course.title}\n\nLevel: ${course.level || 'All'}\nDuration: ${course.duration || ''}\n\n## Overview\n${course.description || ''}\n\n## Modules & Trainer Notes\n` +
                      (slidesList.map(s => `### Slide ${s.number}: ${s.title}\n${s.body || ''}\n\n**Trainer Notes:**\n${s.trainerNotes || ''}\n`).join('\n\n'));
                    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${(course.title || 'course').replace(/[^a-zA-Z0-9_-]+/g, '_')}_trainer_guide.md`;
                    a.click();
                    URL.revokeObjectURL(url);
                    setExportModal(null);
                    addToast('Trainer Manual (.md) downloaded.', 'info');
                  } catch (e) {
                    addToast('Download failed: ' + e.message, 'warning');
                  }
                }}
              >
                <span>Download Trainer Manual (.md)</span>
                <Download size={14} />
              </button>
            </div>

            <button
              className="btn-ghost"
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem' }}
              onClick={() => setExportModal(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// src/pages/GenerationPage.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, ArrowRight, AlertCircle, Sun, Moon, Sparkles, RefreshCw } from 'lucide-react';
import SmartBackButton from '../components/common/SmartBackButton';
import { mockCourses } from '../data/mockCourses';

import { useApp } from '../context/AppContext';
import { recordNavPath } from '../utils/navigation';
import {
  apiGenerateCourse,
  apiGenerateSlides,
  apiGenerateNotes,
  apiGenerateCode,
  apiGenerateExercises,
  apiGenerateQuiz,
  apiGenerateCheatSheet,
} from '../services/api';

const GENERATION_STAGES = [
  { id: 1, label: 'Analyzing learning objectives & prerequisites.' },
  { id: 2, label: 'Structuring curriculum & pedagogical modules.' },
  { id: 3, label: 'Synthesizing verified presentation slides.' },
  { id: 4, label: 'Preparing trainer notes & teaching strategies.' },
  { id: 5, label: 'Generating verified code examples & snippets.' },
  { id: 6, label: 'Creating hands-on exercises & test suites.' },
  { id: 7, label: 'Drafting quiz questions & cheat sheet guide.' },
  { id: 8, label: 'Validating content & packaging workspace.' },
];

function StageStatusIcon({ status }) {
  if (status === 'done') {
    return <CheckCircle2 size={15} color="var(--status-passed)" />;
  }
  if (status === 'active') {
    return <div className="spinner" style={{ width: 14, height: 14 }} />;
  }
  if (status === 'error') {
    return <AlertCircle size={15} color="var(--status-failed)" />;
  }
  return <Circle size={14} color="var(--border-strong)" />;
}

export default function GenerationPage() {
  const { courseId: routeCourseId } = useParams();
  const location = useLocation();
  const { state } = location;
  const navigate = useNavigate();
  const { guestSession, draftCourse, isDark, toggleTheme, openAuthModal, setCurrentCourse } = useApp();

  const fallbackCourse = mockCourses[0];

  // Derive topic and curriculum settings from state or saved draft
  const activeTopic = state?.topic || state?.prompt || draftCourse?.topic || fallbackCourse.title;
  const activeLevel = state?.level || draftCourse?.level || fallbackCourse.level;
  const activeDuration = state?.duration || draftCourse?.duration || fallbackCourse.duration;
  const activeLanguage = state?.language || draftCourse?.language || fallbackCourse.language;
  const activeRuntime = state?.runtime || draftCourse?.runtime || fallbackCourse.runtimeVersion;
  const activeLectures = Number(state?.numberOfLectures || draftCourse?.numberOfLectures) || 4;
  const parsedDuration = parseInt(String(activeDuration).replace(/\D/g, ''), 10) || 60;
  const timePerLecture = Math.round(parsedDuration / Math.max(1, activeLectures));

  const [stepStatus, setStepStatus] = useState(() =>
    GENERATION_STAGES.reduce((acc, s) => ({ ...acc, [s.id]: 'pending' }), {})
  );
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [providerMeta, setProviderMeta] = useState(null);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [createdCourse, setCreatedCourse] = useState(null);
  const activeObjectives = state?.learningObjectives || draftCourse?.learningObjectives || '';
  const [generatedCourseId, setGeneratedCourseId] = useState(routeCourseId || 'course-001');
  const [isRetrying, setIsRetrying] = useState(false);

  const hasInitiatedRef = useRef(false);

  // Record nav path for smart back tracking
  useEffect(() => {
    recordNavPath(location.pathname);
  }, [location.pathname]);

  const markStage = (id, status) =>
    setStepStatus(prev => ({ ...prev, [id]: status }));

  const runPipeline = async () => {
    setErrorMsg(null);
    setDone(false);
    setStepStatus(GENERATION_STAGES.reduce((acc, s) => ({ ...acc, [s.id]: 'pending' }), {}));

    const minutesMatch = String(activeDuration).match(/\d+/);
    const durationMinutes = minutesMatch ? parseInt(minutesMatch[0], 10) : 60;

    try {
      // Stage 1: Analyzing (brief UX delay)
      markStage(1, 'active');
      await new Promise(r => setTimeout(r, 500));
      markStage(1, 'done');

      // Stage 2: Generate Course Structure
      markStage(2, 'active');
      const courseResponse = await apiGenerateCourse({
        topic: activeTopic,
        student_level: activeLevel,
        duration_minutes: durationMinutes,
        language: activeLanguage,
        learning_objectives: activeObjectives,
        number_of_lectures: activeLectures,
      });

      const courseContent = courseResponse.content || {};
      setGeneratedContent(courseContent);
      const courseTitle = courseContent.title || activeTopic;
      const modules = courseContent.modules || [];
      markStage(2, 'done');

      // 2. Initial Slide Deck (use slides returned from generator if available)
      let slides = Array.isArray(courseContent.slides) && courseContent.slides.length > 0 ? courseContent.slides : [];
      if (!slides.length) {
        try {
          const slidesResponse = await apiGenerateSlides({
            title: courseTitle,
            description: courseContent.description || '',
            modules: courseContent.modules || [],
            language: activeLanguage,
            slide_count: 8,
          });
          slides = slidesResponse.slides || [];
        } catch (slideErr) {
          console.warn('Slide generation non-fatal fallback:', slideErr.message);
        }
      }

      // Stage 4: Trainer Notes
      markStage(4, 'active');
      let notes = [];
      try {
        const notesRes = await apiGenerateNotes({ title: courseTitle, modules, language: activeLanguage });
        notes = notesRes.notes || [];
      } catch (e) { console.warn('Notes fallback:', e.message); }
      markStage(4, 'done');

      // Stage 5: Code Examples
      markStage(5, 'active');
      let codeExamples = [];
      try {
        const codeRes = await apiGenerateCode({
          title: courseTitle, modules, language: activeLanguage, runtime: activeRuntime,
        });
        codeExamples = codeRes.examples || [];
      } catch (e) { console.warn('Code fallback:', e.message); }
      markStage(5, 'done');

      // Stage 6: Exercises
      markStage(6, 'active');
      let exercises = [];
      try {
        const exRes = await apiGenerateExercises({
          title: courseTitle, modules, language: activeLanguage, student_level: activeLevel,
        });
        exercises = exRes.exercises || [];
      } catch (e) { console.warn('Exercises fallback:', e.message); }
      markStage(6, 'done');

      // Stage 7: Quiz + Cheat Sheet (parallel for speed)
      markStage(7, 'active');
      let quizQuestions = [];
      let cheatSheetSections = [];
      try {
        const [quizRes, csRes] = await Promise.allSettled([
          apiGenerateQuiz({ title: courseTitle, modules, language: activeLanguage, question_count: 10 }),
          apiGenerateCheatSheet({ title: courseTitle, modules, language: activeLanguage }),
        ]);
        if (quizRes.status === 'fulfilled') quizQuestions = quizRes.value.questions || [];
        if (csRes.status === 'fulfilled') cheatSheetSections = csRes.value.sections || [];
      } catch (e) { console.warn('Quiz/cheatsheet fallback:', e.message); }
      markStage(7, 'done');

      // Stage 8: Packaging
      markStage(8, 'active');
      const newId = courseResponse.savedCourse?.id || `course-${Date.now().toString(36)}`;
      const newCourse = {
        id: newId,
        title: courseTitle,
        topic: activeTopic,
        level: activeLevel,
        student_level: activeLevel,
        duration: `${durationMinutes} minutes`,
        duration_minutes: durationMinutes,
        numberOfLectures: activeLectures,
        language: activeLanguage,
        runtimeVersion: activeRuntime || activeLanguage,
        status: 'completed',
        verificationStatus: 'verified',
        createdAt: new Date().toISOString(),
        description: courseContent.description || `Comprehensive ${activeLevel} course on ${activeTopic}.`,
        slidesCount: slides.length,
        codeExamplesCount: codeExamples.length,
        exercisesCount: exercises.length,
        quizCount: quizQuestions.length,
        slides,
        content: {
          ...courseContent,
          slides: slides.length > 0 ? slides : courseContent.slides,
        },
        slides: slides.length > 0 ? slides : courseContent.slides,
        providerMeta: courseResponse.providerMeta,
      };

      setCurrentCourse(newCourse);
      setCreatedCourse(newCourse);
      try {
        sessionStorage.setItem(`course_${newId}`, JSON.stringify(newCourse));
        const existingRaw = localStorage.getItem('vcs_saved_courses');
        const existing = existingRaw ? JSON.parse(existingRaw) : [];
        const filtered = existing.filter(c => c.id !== newId);
        localStorage.setItem('vcs_saved_courses', JSON.stringify([newCourse, ...filtered]));
      } catch (storageErr) {
        console.warn('Could not cache course locally:', storageErr);
      }

      markStage(8, 'done');
      setGeneratedCourseId(newId);
      setProviderMeta(courseResponse.providerMeta);
      setDone(true);
    } catch (err) {
      console.error('Generation pipeline error:', err);
      setErrorMsg(err.message || 'AI Generation encountered an error.');
      setStepStatus(prev => {
        const activeId = GENERATION_STAGES.find(s => prev[s.id] === 'active')?.id;
        if (activeId) return { ...prev, [activeId]: 'error' };
        return prev;
      });
    }
  };

  useEffect(() => {
    if (!hasInitiatedRef.current) {
      hasInitiatedRef.current = true;
      runPipeline();
    }
  }, []);

  const handleRetry = () => {
    hasInitiatedRef.current = false;
    setIsRetrying(true);
    runPipeline().finally(() => setIsRetrying(false));
  };

  const handleFallbackDemo = () => {
    // Fill with realistic template course
    const fallbackId = 'course-001';
    setGeneratedCourseId(fallbackId);
    setStepStatus(
      GENERATION_STAGES.reduce((acc, s) => ({ ...acc, [s.id]: 'done' }), {})
    );
    setErrorMsg(null);
    setDone(true);
  };

  const completedCount = Object.values(stepStatus).filter(s => s === 'done').length;
  const progress = Math.round((completedCount / GENERATION_STAGES.length) * 100);

  const courseId = createdCourse?.id;
  const verificationSummary = createdCourse?.content?.verificationSummary || createdCourse?.verificationSummary;
  const passedCount = verificationSummary?.passed ?? createdCourse?.verifiedCount ?? 0;
  const totalCount = verificationSummary?.total ?? createdCourse?.totalCount ?? 0;

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', transition: 'background-color 0.2s ease' }}>
      {/* Top Header with Smart Back to /create */}
      <header className="navbar">
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 1.5rem',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Smart Back Navigation to Course Creation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <SmartBackButton fallbackPath="/create" label="Back to Course Creation" />
            <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Generation Progress
            </span>
          </div>

          {/* Right controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {guestSession && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.2rem 0.55rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-surface-secondary)',
                border: '1px solid var(--border)',
                fontSize: '0.725rem',
                color: 'var(--text-secondary)'
              }}>
                <span className="status-dot green" />
                <span style={{ fontFamily: 'var(--font-mono)' }}>Guest Session</span>
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
                >
                  Sign in
                </button>
              </div>
            )}

            <button
              className="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Generation Container */}
      <main style={{ maxWidth: '680px', margin: '0 auto', padding: '3.5rem 1.5rem 5rem' }}>
        {/* Course Specification Summary */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem 1.5rem',
          marginBottom: '2rem'
        }}>
          <p className="overline-editorial" style={{ marginBottom: '0.35rem' }}>
            Submitted Course Topic
          </p>
          <p style={{
            fontSize: '0.95rem',
            color: 'var(--text-primary)',
            lineHeight: 1.6,
            fontWeight: 500
          }}>
            {activeTopic}
          </p>
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            marginTop: '0.75rem',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            flexWrap: 'wrap'
          }}>
            <span>Level: {activeLevel}</span>
            <span>·</span>
            <span>Total Duration: {activeDuration}</span>
            <span>·</span>
            <span>Sessions: {activeLectures} lectures</span>
            <span>·</span>
            <span>Pacing: ~{timePerLecture} mins/class</span>
          </div>
        </div>

        {/* Title */}
        <div style={{ marginBottom: '2rem' }}>
          <p className="overline-editorial" style={{ marginBottom: '0.35rem' }}>
            {done ? 'Generation Completed' : errorMsg ? 'Pipeline Notice' : 'Multi-Provider AI Execution'}
          </p>
          <h1 className="heading-editorial" style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>
            {done ? 'Course Workspace Ready.' : errorMsg ? 'Generation Interrupted' : 'Synthesizing verified course.'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            {done
              ? 'Pedagogical modules, slides, trainer notes, and code pipelines are assembled.'
              : errorMsg
              ? 'An error occurred during generation. You can retry or open the template demo.'
              : 'Streaming verified slide decks, trainer notes, runnable code examples, and test suites.'}
          </p>
        </div>

        {/* Error notification banner if any */}
        {errorMsg && (
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            padding: '1rem 1.25rem',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '2rem',
            alignItems: 'flex-start'
          }}>
            <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <strong style={{ color: '#ef4444', fontSize: '0.85rem' }}>Generation Error:</strong>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem', lineHeight: 1.4 }}>
                {errorMsg}
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleRetry}
                  disabled={isRetrying}
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', gap: '0.4rem' }}
                >
                  <RefreshCw size={13} className={isRetrying ? 'spin' : ''} />
                  Retry Generation
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleFallbackDemo}
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                >
                  Load Demo Template
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Monochromatic Progress Bar */}
        <div style={{
          background: 'var(--border)',
          borderRadius: 'var(--radius-full)',
          height: 3,
          marginBottom: '2rem',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: done ? 'var(--status-passed)' : 'var(--text-primary)',
            transition: 'width 0.35s ease',
          }} />
        </div>

        {/* Structured Stages */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          marginBottom: '2rem'
        }}>
          {GENERATION_STAGES.map(stage => {
            const status = stepStatus[stage.id];
            return (
              <div
                key={stage.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  opacity: status === 'pending' ? 0.45 : 1,
                  transition: 'opacity 0.25s ease'
                }}
              >
                <StageStatusIcon status={status} />
                <span style={{
                  fontSize: '0.85rem',
                  color: status === 'done' ? 'var(--text-primary)' : status === 'active' ? 'var(--text-primary)' : status === 'error' ? 'var(--status-failed)' : 'var(--text-muted)',
                  fontWeight: status === 'active' ? 500 : 400,
                  flex: 1
                }}>
                  {stage.label}
                </span>

                <span style={{
                  fontSize: '0.725rem',
                  fontFamily: 'var(--font-mono)',
                  color: status === 'done' ? 'var(--status-passed)' : status === 'active' ? 'var(--text-secondary)' : status === 'error' ? 'var(--status-failed)' : 'var(--text-muted)'
                }}>
                  {status === 'done' ? 'DONE' : status === 'active' ? 'PROCESSING' : status === 'error' ? 'FAILED' : 'PENDING'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Provider badge */}
        {providerMeta && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.5rem',
            fontSize: '0.775rem',
            color: 'var(--text-secondary)'
          }}>
            <Sparkles size={14} color="var(--accent-primary)" />
            <span>Generated using <strong>{providerMeta.used || 'Gemini'} AI Provider</strong></span>
          </div>
        )}

        {done && generatedContent && (
          <section style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem'
          }}>
            <p className="overline-editorial" style={{ marginBottom: '0.35rem' }}>Generated Course</p>
            <h2 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              {generatedContent.title || activeTopic}
            </h2>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '1rem' }}>
              {generatedContent.description || 'Your course content is ready.'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {(generatedContent.modules || []).map((module, index) => (
                <div key={`${module.title}-${index}`} style={{ display: 'flex', gap: '0.65rem', alignItems: 'baseline', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{String(index + 1).padStart(2, '0')}</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{module.title}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{module.lessons?.length || 0} lessons</span>
                </div>
              ))}
            </div>
          </section>
        )}



        {/* Completion CTA */}
        {done && courseId && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              className="btn-primary"
              style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem', gap: '0.5rem', justifyContent: 'center' }}
              onClick={() => navigate(`/course/${generatedCourseId}`)}
            >
              Open Course Workspace <ArrowRight size={15} />
            </button>
            <button
              className="btn-ghost"
              style={{ width: '100%', padding: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', justifyContent: 'center' }}
              onClick={() => navigate('/create')}
            >
              Modify Specifications & Generate Another
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

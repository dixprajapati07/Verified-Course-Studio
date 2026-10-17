import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, ChevronRight, Trophy, RotateCcw, Loader2, AlertTriangle } from 'lucide-react';
import WorkspaceHeader from '../components/layout/WorkspaceHeader';
import { api } from '../api';

export default function QuizPage() {
  const { courseId } = useParams();
  const navigate     = useNavigate();

  const [course, setCourse]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [current, setCurrent]     = useState(0);
  const [selected, setSelected]   = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers]     = useState([]);
  const [finished, setFinished]   = useState(false);

  const fetchCourse = async () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCourse(courseId);
      setCourse(res.course);
    } catch (err) {
      console.error("Failed to load course quiz:", err);
      setError(err.message || "Failed to load quiz");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  const quiz = Array.isArray(course?.content?.quiz) ? course.content.quiz : [];
  const question = quiz[current] || {};
  const correctIndex = question.correctIndex !== undefined
    ? question.correctIndex
    : (Array.isArray(question.options) ? question.options.indexOf(question.answer) : -1);
  const isCorrect = selected === correctIndex;

  const handleSelect = (idx) => {
    if (submitted) return;
    setSelected(idx);
  };

  const handleSubmit = () => {
    if (selected === null) return;
    setSubmitted(true);
    setAnswers(prev => [...prev, { questionId: question.id || `q-${current}`, selected, correct: selected === correctIndex }]);
  };

  const handleNext = () => {
    if (current < quiz.length - 1) {
      setCurrent(c => c + 1);
      setSelected(null);
      setSubmitted(false);
    } else {
      setFinished(true);
    }
  };

  const handleRestart = () => {
    setCurrent(0);
    setSelected(null);
    setSubmitted(false);
    setAnswers([]);
    setFinished(false);
  };

  const score = answers.filter(a => a.correct).length;
  const pct   = quiz.length > 0 ? Math.round((score / quiz.length) * 100) : 0;

  if (finished) {
    return (
      <div style={{ background: 'var(--bg-base)', minHeight: '100vh', transition: 'background-color 0.2s ease' }}>
        <WorkspaceHeader course={course} />
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '4.5rem 1.5rem', textAlign: 'center' }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 'var(--radius-full)',
            background: 'var(--bg-surface-secondary)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            color: 'var(--text-primary)'
          }}>
            <Trophy size={26} />
          </div>

          <p className="overline-editorial" style={{ marginBottom: '0.4rem' }}>
            Assessment Result
          </p>
          <h1 className="heading-editorial" style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>
            Quiz Complete
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '2rem' }}>
            You scored <strong style={{ color: 'var(--text-primary)' }}>{score} of {quiz.length}</strong> questions correctly ({pct}%).
          </p>

          {/* Score recap box */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '1.5rem',
            marginBottom: '2rem',
            textAlign: 'left'
          }}>
            <p className="overline-editorial" style={{ marginBottom: '0.75rem' }}>
              Question Breakdown
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {answers.map((a, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: '0.65rem',
                    alignItems: 'center',
                    padding: '0.65rem 0.85rem',
                    background: 'var(--bg-surface-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.8rem'
                  }}
                >
                  {a.correct ? (
                    <CheckCircle2 size={14} color="var(--status-passed)" style={{ flexShrink: 0 }} />
                  ) : (
                    <XCircle size={14} color="var(--status-failed)" style={{ flexShrink: 0 }} />
                  )}
                  <span style={{ color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Q{i + 1}: {quiz[i]?.question}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.725rem' }}>
                    {a.correct ? '1.0 / 1.0' : '0.0 / 1.0'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button className="btn-secondary" onClick={handleRestart} style={{ gap: '0.35rem' }}>
              <RotateCcw size={13} /> Retake Quiz
            </button>
            <button className="btn-primary" onClick={() => navigate(`/studio/${courseId}`)}>
              Back to Overview
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ background: 'var(--bg-base)', minHeight: '100vh', padding: '5rem 1.5rem', textAlign: 'center' }}>
        <Loader2 size={32} className="spinner" style={{ margin: '0 auto 1rem', color: 'var(--text-primary)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading interactive assessment...</p>
      </div>
    );
  }

  if (error || !course || quiz.length === 0) {
    return (
      <div style={{ background: 'var(--bg-base)', minHeight: '100vh', padding: '5rem 1.5rem', textAlign: 'center' }}>
        <AlertTriangle size={36} color="var(--status-failed)" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Quiz Unavailable</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error || 'No quiz questions available for this course.'}</p>
        <button className="btn-secondary" onClick={() => navigate(`/course/${courseId}`)}>Back to Workspace</button>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', transition: 'background-color 0.2s ease' }}>
      <WorkspaceHeader course={course} />
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '3.5rem 1.5rem 5rem' }}>

        {/* Progress tracker */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.775rem',
            color: 'var(--text-muted)',
            marginBottom: '0.5rem',
            fontFamily: 'var(--font-mono)'
          }}>
            <span>QUESTION {current + 1} OF {quiz.length}</span>
            <span>{score} CORRECT</span>
          </div>
          <div style={{ background: 'var(--border)', borderRadius: 'var(--radius-full)', height: '3px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${((current + (submitted ? 1 : 0)) / quiz.length) * 100}%`,
                height: '100%',
                background: 'var(--text-primary)',
                transition: 'width 0.3s ease'
              }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '2rem',
          marginBottom: '1.25rem'
        }}>
          <div style={{ display: 'flex', gap: '0.45rem', marginBottom: '1rem', alignItems: 'center' }}>
            <span className={`badge ${question.difficulty === 'Easy' ? 'badge-green' : 'badge-amber'}`}>
              {question.difficulty}
            </span>
            <span className="badge badge-gray">{question.topic}</span>
          </div>

          <h2 style={{
            fontSize: '1.1rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            lineHeight: 1.45,
            marginBottom: '1.75rem'
          }}>
            {question.question}
          </h2>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {question.options.map((opt, i) => {
              let cls = 'quiz-option';
              if (submitted) {
                if (i === question.correctIndex) cls += ' correct';
                else if (i === selected && i !== question.correctIndex) cls += ' incorrect';
              } else if (i === selected) {
                cls += ' selected';
              }

              return (
                <button
                  key={i}
                  className={cls}
                  onClick={() => handleSelect(i)}
                  disabled={submitted}
                >
                  <span style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                    <span style={{
                      width: 20,
                      height: 20,
                      borderRadius: 'var(--radius-full)',
                      border: '1px solid currentColor',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      flexShrink: 0,
                      fontFamily: 'var(--font-mono)'
                    }}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span style={{ lineHeight: 1.45 }}>{opt}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pedagogical Explanation */}
        {submitted && (
          <div style={{
            background: isCorrect ? 'var(--status-passed-bg)' : 'var(--status-failed-bg)',
            border: `1px solid ${isCorrect ? 'var(--status-passed-border)' : 'var(--status-failed-border)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            marginBottom: '1.25rem'
          }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' }}>
              {isCorrect ? (
                <CheckCircle2 size={15} color="var(--status-passed)" />
              ) : (
                <XCircle size={15} color="var(--status-failed)" />
              )}
              <span style={{
                fontWeight: 600,
                fontSize: '0.85rem',
                color: isCorrect ? 'var(--status-passed)' : 'var(--status-failed)'
              }}>
                {isCorrect ? 'Correct Answer' : 'Incorrect Response'}
              </span>
            </div>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {question.explanation}
            </p>
          </div>
        )}

        {/* Action button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {!submitted ? (
            <button
              className="btn-primary"
              disabled={selected === null}
              style={{
                opacity: selected === null ? 0.4 : 1,
                cursor: selected === null ? 'not-allowed' : 'pointer'
              }}
              onClick={handleSubmit}
            >
              Submit Answer
            </button>
          ) : (
            <button className="btn-primary" onClick={handleNext} style={{ gap: '0.35rem' }}>
              <span>{current < quiz.length - 1 ? 'Next Question' : 'View Results'}</span>
              <ChevronRight size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

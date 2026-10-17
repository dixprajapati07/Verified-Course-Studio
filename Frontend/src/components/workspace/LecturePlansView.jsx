// src/components/workspace/LecturePlansView.jsx
import { useState } from 'react';
import {
  BookOpen,
  BookText,
  Code2,
  FlaskConical,
  HelpCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  RefreshCw,
  Download,
  Printer,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  GraduationCap,
  Sparkles,
  FileCheck,
  Layers,
  ArrowRight
} from 'lucide-react';
import { api } from '../../api';
import { useApp } from '../../context/AppContext';

export default function LecturePlansView({ course, onCourseUpdated, activeTab = 'all' }) {
  const { addToast } = useApp();
  const [currentTab, setCurrentTab] = useState(activeTab); // 'all' | 'notes' | 'activities' | 'exercises' | 'homework'
  const [expandedLectures, setExpandedLectures] = useState(() => {
    // By default expand the first lecture
    return { 1: true };
  });
  const [regeneratingLectureNum, setRegeneratingLectureNum] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [revealedSolutions, setRevealedSolutions] = useState({});

  const content = course?.content || {};
  const rawLectures = Array.isArray(content.lectures) ? content.lectures : [];
  const totalMins = course?.duration_minutes || 60;
  const lectureCount = rawLectures.length || course?.numberOfLectures || 4;

  // Ensure lectures have duration and lecture numbers
  const lectures = rawLectures.map((lec, idx) => ({
    ...lec,
    lectureNumber: lec.lectureNumber || idx + 1,
    durationMinutes: lec.durationMinutes || Math.round(totalMins / Math.max(1, lectureCount))
  }));

  const timePerLecture = Math.round(totalMins / Math.max(1, lectures.length));

  const toggleExpand = (lectureNum) => {
    setExpandedLectures(prev => ({
      ...prev,
      [lectureNum]: !prev[lectureNum]
    }));
  };

  const expandAll = () => {
    const all = {};
    lectures.forEach(l => { all[l.lectureNumber] = true; });
    setExpandedLectures(all);
  };

  const collapseAll = () => {
    setExpandedLectures({});
  };

  const copyLectureText = (lecture) => {
    const text = `
# Lecture ${lecture.lectureNumber}: ${lecture.title}
Estimated Duration: ${lecture.durationMinutes} minutes

## Learning Objectives
${(lecture.learningObjectives || []).map(o => `* ${o}`).join('\n')}

## Topics Covered
${(lecture.topicsCovered || []).map(t => `* ${t}`).join('\n')}

## Teaching Notes
${lecture.teachingNotes || 'N/A'}

## Practical Activity: ${lecture.practicalActivity?.title || 'Hands-on Lab'}
${lecture.practicalActivity?.description || 'N/A'}
${(lecture.practicalActivity?.steps || []).map((s, idx) => `${idx + 1}. ${s}`).join('\n')}
Deliverable: ${lecture.practicalActivity?.expectedDeliverable || 'Demonstration of functional solution'}

## Common Mistakes & Pitfalls
${(lecture.commonMistakes || []).map(m => `* ${m}`).join('\n')}

## Student Exercises
${(lecture.studentExercises || []).map((ex, i) => `### Exercise ${i + 1} (${ex.difficulty || 'Intermediate'}): ${ex.title}\n${ex.problemStatement}\nHint: ${ex.hint || 'N/A'}\nSolution: ${ex.solution || 'N/A'}`).join('\n\n')}

## Quiz Questions
${(lecture.quizQuestions || []).map((q, i) => `Q${i + 1}: ${q.question}\nOptions: ${(q.options || []).join(' | ')}\nAnswer: ${q.answer}\nRationale: ${q.explanation}`).join('\n\n')}

## Homework Assignment: ${lecture.homework?.title || 'Take-Home Project'}
${lecture.homework?.instructions || 'N/A'}
Time: ~${lecture.homework?.estimatedTimeMinutes || 30} mins
Submission: ${lecture.homework?.submissionGuidelines || 'Code repository or written report'}
`.trim();

    navigator.clipboard?.writeText(text);
    setCopiedId(lecture.lectureNumber);
    addToast(`Lecture ${lecture.lectureNumber} curriculum copied to clipboard.`, 'success');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleRegenerateLecture = async (lectureNumber) => {
    setRegeneratingLectureNum(lectureNumber);
    try {
      const res = await api.regenerateLecture(course.id, lectureNumber);
      if (onCourseUpdated) {
        onCourseUpdated(res.course);
      }
      addToast(`Lecture ${lectureNumber} refreshed with new activities & exercises.`, 'success');
      // Ensure the regenerated lecture is expanded
      setExpandedLectures(prev => ({ ...prev, [lectureNumber]: true }));
    } catch (err) {
      addToast(`Regenerating lecture failed: ${err.message}`, 'error');
    } finally {
      setRegeneratingLectureNum(null);
    }
  };

  const downloadCoursePlan = () => {
    const markdown = `
# ${course.title}
**Student Level:** ${course.student_level || course.level || 'Beginner'}  
**Total Duration:** ${totalMins} minutes (${lectures.length} sessions, ~${timePerLecture} mins each)  
**Description:** ${course.description || ''}

${(course.learningObjectives || content.learningObjectives || []).length > 0 ? `## Overall Course Learning Objectives\n${(course.learningObjectives || content.learningObjectives || []).map(o => `* ${o}`).join('\n')}\n` : ''}

---

${lectures.map(l => `
## Lecture ${l.lectureNumber}: ${l.title}
*Duration: ${l.durationMinutes} minutes*

### 1. Learning Objectives
${(l.learningObjectives || []).map(o => `* ${o}`).join('\n')}

### 2. Topics Covered
${(l.topicsCovered || []).map(t => `* ${t}`).join('\n')}

### 3. Teaching Notes
${l.teachingNotes || ''}

### 4. Practical In-Class Activity: ${l.practicalActivity?.title || 'Classroom Lab'}
${l.practicalActivity?.description || ''}
${(l.practicalActivity?.steps || []).map((s, idx) => `${idx + 1}. ${s}`).join('\n')}
**Deliverable:** ${l.practicalActivity?.expectedDeliverable || 'Complete code or report'}

### 5. Code Demonstrations
${(l.codeExamples || []).map(c => `#### ${c.title} (${c.language || 'Code'})\n\`\`\`${(c.language || '').toLowerCase()}\n${c.code}\n\`\`\`\n${c.explanation || ''}`).join('\n\n')}

### 6. Common Student Mistakes & Traps
${(l.commonMistakes || []).map(m => `* ${m}`).join('\n')}

### 7. Student Practice Exercises
${(l.studentExercises || []).map((ex, idx) => `**Exercise ${idx + 1} (${ex.difficulty || 'Intermediate'}):** ${ex.title}\n${ex.problemStatement}\n*Hint:* ${ex.hint || 'N/A'}\n*Solution:* ${ex.solution || 'N/A'}`).join('\n\n')}

### 8. Assessment Quiz
${(l.quizQuestions || []).map((q, idx) => `**Q${idx + 1}: ${q.question}**\n${(q.options || []).map(opt => `  - ${opt}`).join('\n')}\n*Correct Answer:* ${q.answer}\n*Explanation:* ${q.explanation}`).join('\n\n')}

### 9. Homework Assignment: ${l.homework?.title || 'Assignment'}
${l.homework?.instructions || ''}
*Estimated Duration:* ${l.homework?.estimatedTimeMinutes || 30} minutes  
*Submission Guidelines:* ${l.homework?.submissionGuidelines || 'Submit through university portal'}

### 10. Expected Outcomes
${(l.expectedOutcomes || []).map(out => `* ${out}`).join('\n')}

---
`).join('\n')}
`.trim();

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(course.title || 'course_plan').replace(/[^a-zA-Z0-9_-]/g, '_')}_Plan.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('Course plan markdown downloaded.', 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  const tabs = [
    { id: 'all', label: 'All Content', count: lectures.length },
    { id: 'notes', label: 'Teaching Notes', count: lectures.filter(l => l.teachingNotes).length },
    { id: 'activities', label: 'Practical Activities', count: lectures.filter(l => l.practicalActivity?.title).length },
    { id: 'exercises', label: 'Quizzes & Exercises', count: lectures.reduce((acc, l) => acc + (l.studentExercises?.length || 0) + (l.quizQuestions?.length || 0), 0) },
    { id: 'homework', label: 'Homework', count: lectures.filter(l => l.homework?.title).length },
  ];

  return (
    <div className="lecture-plans-container" style={{ width: '100%' }}>
      {/* Top Banner: Course Overview & Pacing Header */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '1.75rem',
        marginBottom: '2rem',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: '1 1 450px' }}>
            <div style={{ display: 'flex', gap: '0.45rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="badge badge-green">Curriculum Ready</span>
              <span className="badge badge-gray">{course.student_level || course.level || 'Beginner'}</span>
              <span className="badge badge-gray">{lectures.length} Teaching Sessions</span>
              <span className="badge badge-gray">{totalMins} Total Minutes</span>
            </div>

            <h1 className="heading-editorial" style={{ fontSize: '1.85rem', lineHeight: 1.25, marginBottom: '0.65rem' }}>
              {course.title}
            </h1>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '640px' }}>
              {course.description || `Comprehensive teaching syllabus and classroom activities divided into ${lectures.length} structured sessions.`}
            </p>
          </div>

          {/* Quick Action Buttons for Professor */}
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              className="btn-secondary"
              onClick={downloadCoursePlan}
              style={{ fontSize: '0.8rem', gap: '0.4rem', padding: '0.45rem 0.85rem' }}
              title="Download entire course syllabus as Markdown"
            >
              <Download size={13} />
              <span>Download Plan</span>
            </button>

            <button
              className="btn-secondary"
              onClick={handlePrint}
              style={{ fontSize: '0.8rem', gap: '0.4rem', padding: '0.45rem 0.85rem' }}
              title="Print or export to PDF"
            >
              <Printer size={13} />
              <span>Export to PDF</span>
            </button>
          </div>
        </div>

        {/* Course Duration & Pacing Indicator */}
        <div style={{
          padding: '1rem 1.25rem',
          background: 'var(--bg-surface-secondary)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={15} color="var(--accent-subtle)" />
              <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Session Time Distribution ({totalMins} mins total ÷ {lectures.length} lectures = ~{timePerLecture} mins/class)
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              100% Curriculum Allocated
            </span>
          </div>

          {/* Visual Pacing Segmented Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${lectures.length}, 1fr)`,
            gap: '4px',
            height: '8px',
            borderRadius: 'var(--radius-full)',
            overflow: 'hidden'
          }}>
            {lectures.map((l) => (
              <div
                key={l.lectureNumber}
                title={`Lecture ${l.lectureNumber}: ${l.title} (${l.durationMinutes} mins)`}
                style={{
                  background: 'var(--text-primary)',
                  opacity: 0.85,
                  borderRadius: '2px',
                  transition: 'opacity 0.2s ease',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setExpandedLectures(prev => ({ ...prev, [l.lectureNumber]: true }));
                  const el = document.getElementById(`lecture-card-${l.lectureNumber}`);
                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              />
            ))}
          </div>

          {/* Quick Session Badges Strip */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {lectures.map((l) => (
              <button
                key={l.lectureNumber}
                type="button"
                onClick={() => {
                  setExpandedLectures(prev => ({ ...prev, [l.lectureNumber]: true }));
                  const el = document.getElementById(`lecture-card-${l.lectureNumber}`);
                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                style={{
                  background: expandedLectures[l.lectureNumber] ? 'var(--bg-surface)' : 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-full)',
                  padding: '0.2rem 0.6rem',
                  fontSize: '0.725rem',
                  color: expandedLectures[l.lectureNumber] ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <span style={{ fontWeight: 600 }}>#{l.lectureNumber}</span>
                <span>{l.durationMinutes}m</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action Toolbar & Section Filter Tabs */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '0.85rem'
      }}>
        {/* Sub-Tabs (All, Teaching Notes, Practical Activities, Exercises, Homework) */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {tabs.map(tab => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCurrentTab(tab.id)}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  fontWeight: isActive ? 600 : 500,
                  background: isActive ? 'var(--bg-card)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: '1px solid',
                  borderColor: isActive ? 'var(--border)' : 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  fontSize: '0.675rem',
                  fontFamily: 'var(--font-mono)',
                  padding: '0.1rem 0.4rem',
                  borderRadius: 'var(--radius-full)',
                  background: isActive ? 'var(--bg-surface-secondary)' : 'var(--border-subtle)',
                  color: 'var(--text-muted)'
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Expand / Collapse All Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={expandAll}
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
          >
            Expand All
          </button>
          <span style={{ color: 'var(--border)' }}>|</span>
          <button
            type="button"
            className="btn-ghost"
            onClick={collapseAll}
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Lecture Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {lectures.map((lecture) => {
          const isExpanded = expandedLectures[lecture.lectureNumber];
          const isRegenerating = regeneratingLectureNum === lecture.lectureNumber;
          const isCopied = copiedId === lecture.lectureNumber;

          return (
            <div
              id={`lecture-card-${lecture.lectureNumber}`}
              key={lecture.lectureNumber}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
              }}
            >
              {/* Card Header (Always visible) */}
              <div
                style={{
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  cursor: 'pointer',
                  userSelect: 'none',
                  background: isExpanded ? 'var(--bg-card)' : 'transparent',
                  borderBottom: isExpanded ? '1px solid var(--border-subtle)' : 'none'
                }}
                onClick={() => toggleExpand(lecture.lectureNumber)}
              >
                {/* Left: Number badge, Title & Duration */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0, flex: 1 }}>
                  <div style={{
                    width: 34,
                    height: 34,
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface-secondary)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-primary)',
                    flexShrink: 0
                  }}>
                    {lecture.lectureNumber}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                      <h3 style={{
                        fontSize: '1rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        margin: 0,
                        letterSpacing: '-0.01em'
                      }}>
                        {lecture.title}
                      </h3>
                      <span style={{
                        fontSize: '0.725rem',
                        fontFamily: 'var(--font-mono)',
                        padding: '0.15rem 0.5rem',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--bg-surface-secondary)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)'
                      }}>
                        {lecture.durationMinutes} mins
                      </span>
                    </div>

                    {!isExpanded && (
                      <p style={{
                        fontSize: '0.775rem',
                        color: 'var(--text-muted)',
                        margin: 0,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '560px'
                      }}>
                        {(lecture.topicsCovered || []).join(' · ') || (lecture.learningObjectives || [])[0]}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Actions & Expand Chevron */}
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}
                  onClick={e => e.stopPropagation()}
                >
                  {/* Copy Lecture Content Button */}
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => copyLectureText(lecture)}
                    title="Copy full lecture plan to clipboard"
                    style={{
                      width: 30,
                      height: 30,
                      color: isCopied ? 'var(--status-passed)' : 'var(--text-secondary)'
                    }}
                  >
                    {isCopied ? <Check size={14} /> : <Copy size={14} />}
                  </button>

                  {/* Regenerate Individual Lecture Button */}
                  <button
                    type="button"
                    className="btn-icon"
                    disabled={isRegenerating}
                    onClick={() => handleRegenerateLecture(lecture.lectureNumber)}
                    title="Regenerate this individual lecture with AI"
                    style={{ width: 30, height: 30, color: 'var(--text-secondary)' }}
                  >
                    {isRegenerating ? (
                      <div className="spinner" style={{ width: 13, height: 13 }} />
                    ) : (
                      <RefreshCw size={13} />
                    )}
                  </button>

                  {/* Toggle Accordion */}
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => toggleExpand(lecture.lectureNumber)}
                    style={{ width: 30, height: 30, color: 'var(--text-muted)' }}
                    aria-label={isExpanded ? 'Collapse lecture' : 'Expand lecture'}
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Card Body (Collapsible Accordion Content) */}
              {isExpanded && (
                <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                  {/* SECTION A: Learning Objectives & Topics Covered */}
                  {(currentTab === 'all') && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '1.5rem',
                      background: 'var(--bg-surface-secondary)',
                      padding: '1.25rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      {/* Learning Objectives */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.65rem' }}>
                          <GraduationCap size={15} color="var(--accent-subtle)" />
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                            Learning Objectives
                          </h4>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {(lecture.learningObjectives || []).map((obj, i) => (
                            <li key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                              {obj}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Topics Covered */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.65rem' }}>
                          <BookOpen size={15} color="var(--text-primary)" />
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                            Topics Covered
                          </h4>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          {(lecture.topicsCovered || []).map((topic, i) => (
                            <span
                              key={i}
                              style={{
                                fontSize: '0.75rem',
                                padding: '0.25rem 0.6rem',
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--text-secondary)'
                              }}
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SECTION B: Teaching Notes */}
                  {(currentTab === 'all' || currentTab === 'notes') && lecture.teachingNotes && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.5rem' }}>
                        <BookText size={15} color="var(--text-primary)" />
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                          Teaching Notes for the Professor
                        </h4>
                      </div>
                      <div style={{
                        padding: '1rem 1.25rem',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.65,
                        whiteSpace: 'pre-line'
                      }}>
                        {lecture.teachingNotes}
                      </div>
                    </div>
                  )}

                  {/* SECTION C: Practical Hands-On Activity */}
                  {(currentTab === 'all' || currentTab === 'activities') && lecture.practicalActivity && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.5rem' }}>
                        <FlaskConical size={15} color="var(--status-passed)" />
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                          In-Class Practical Activity: {lecture.practicalActivity.title}
                        </h4>
                      </div>

                      <div style={{
                        padding: '1.25rem',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}>
                        <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>
                          {lecture.practicalActivity.description}
                        </p>

                        {Array.isArray(lecture.practicalActivity.steps) && lecture.practicalActivity.steps.length > 0 && (
                          <div style={{ marginTop: '0.25rem' }}>
                            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                              Activity Steps:
                            </p>
                            <ol style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                              {lecture.practicalActivity.steps.map((st, i) => (
                                <li key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                  {st}
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {lecture.practicalActivity.expectedDeliverable && (
                          <div style={{
                            marginTop: '0.5rem',
                            padding: '0.5rem 0.75rem',
                            background: 'var(--bg-surface-secondary)',
                            borderRadius: 'var(--radius-sm)',
                            borderLeft: '3px solid var(--status-passed)',
                            fontSize: '0.775rem',
                            color: 'var(--text-secondary)'
                          }}>
                            <strong>Expected Deliverable:</strong> {lecture.practicalActivity.expectedDeliverable}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SECTION D: Code Examples or Demonstrations */}
                  {(currentTab === 'all' || currentTab === 'activities') && Array.isArray(lecture.codeExamples) && lecture.codeExamples.length > 0 && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.5rem' }}>
                        <Code2 size={15} color="var(--accent-subtle)" />
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                          Code Examples & Demonstrations
                        </h4>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        {lecture.codeExamples.map((ex, i) => (
                          <div
                            key={i}
                            style={{
                              background: '#0d1117',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-sm)',
                              overflow: 'hidden'
                            }}
                          >
                            <div style={{
                              padding: '0.5rem 0.85rem',
                              background: '#161b22',
                              borderBottom: '1px solid rgba(255,255,255,0.08)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}>
                              <span style={{ fontSize: '0.775rem', color: '#c9d1d9', fontWeight: 600 }}>
                                {ex.title || `Example ${i + 1}`}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: '#8b949e', fontFamily: 'var(--font-mono)' }}>
                                {ex.language || 'Code'}
                              </span>
                            </div>

                            <pre style={{
                              margin: 0,
                              padding: '1rem',
                              fontSize: '0.825rem',
                              color: '#e6edf3',
                              fontFamily: 'var(--font-mono)',
                              overflowX: 'auto',
                              lineHeight: 1.5
                            }}>
                              <code>{ex.code}</code>
                            </pre>

                            {ex.explanation && (
                              <div style={{
                                padding: '0.65rem 0.85rem',
                                background: '#161b22',
                                borderTop: '1px solid rgba(255,255,255,0.08)',
                                fontSize: '0.775rem',
                                color: '#8b949e'
                              }}>
                                <strong>Walkthrough:</strong> {ex.explanation}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SECTION E: Common Student Mistakes */}
                  {(currentTab === 'all' || currentTab === 'notes') && Array.isArray(lecture.commonMistakes) && lecture.commonMistakes.length > 0 && (
                    <div style={{
                      padding: '1rem 1.25rem',
                      background: 'rgba(245, 158, 11, 0.08)',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      borderRadius: 'var(--radius-sm)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.45rem' }}>
                        <AlertTriangle size={15} color="var(--status-review)" />
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--status-review)', margin: 0 }}>
                          Common Mistakes & Misconceptions
                        </h4>
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {lecture.commonMistakes.map((mis, i) => (
                          <li key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            {mis}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* SECTION F: Student Practice Exercises */}
                  {(currentTab === 'all' || currentTab === 'exercises') && Array.isArray(lecture.studentExercises) && lecture.studentExercises.length > 0 && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.5rem' }}>
                        <Lightbulb size={15} color="var(--text-primary)" />
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                          Student Practice Exercises ({lecture.studentExercises.length})
                        </h4>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {lecture.studentExercises.map((ex, exIdx) => {
                          const solKey = `${lecture.lectureNumber}-${exIdx}`;
                          const showSol = revealedSolutions[solKey];

                          return (
                            <div
                              key={exIdx}
                              style={{
                                padding: '1rem',
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {ex.title}
                                </span>
                                <span style={{
                                  fontSize: '0.7rem',
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: 'var(--radius-full)',
                                  background: ex.difficulty === 'Easy' ? 'rgba(34, 197, 94, 0.15)' : ex.difficulty === 'Advanced' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                                  color: ex.difficulty === 'Easy' ? 'var(--status-passed)' : ex.difficulty === 'Advanced' ? 'var(--status-failed)' : 'var(--status-review)',
                                  fontFamily: 'var(--font-mono)'
                                }}>
                                  {ex.difficulty || 'Intermediate'}
                                </span>
                              </div>

                              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                                {ex.problemStatement}
                              </p>

                              {ex.hint && (
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                                  <em>Hint:</em> {ex.hint}
                                </p>
                              )}

                              {ex.solution && (
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => setRevealedSolutions(p => ({ ...p, [solKey]: !p[solKey] }))}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      padding: 0,
                                      fontSize: '0.725rem',
                                      color: 'var(--accent-subtle)',
                                      textDecoration: 'underline',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {showSol ? 'Hide Solution' : 'View Instructor Solution'}
                                  </button>

                                  {showSol && (
                                    <pre style={{
                                      marginTop: '0.5rem',
                                      padding: '0.75rem',
                                      background: '#0d1117',
                                      borderRadius: 'var(--radius-sm)',
                                      fontSize: '0.75rem',
                                      color: '#7ee787',
                                      fontFamily: 'var(--font-mono)',
                                      overflowX: 'auto'
                                    }}>
                                      <code>{ex.solution}</code>
                                    </pre>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SECTION G: Quiz Questions */}
                  {(currentTab === 'all' || currentTab === 'exercises') && Array.isArray(lecture.quizQuestions) && lecture.quizQuestions.length > 0 && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.5rem' }}>
                        <HelpCircle size={15} color="var(--accent-subtle)" />
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                          Lecture Assessment Quiz ({lecture.quizQuestions.length} Questions)
                        </h4>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        {lecture.quizQuestions.map((q, qIdx) => (
                          <div
                            key={qIdx}
                            style={{
                              padding: '1rem',
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-sm)'
                            }}
                          >
                            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.65rem' }}>
                              {qIdx + 1}. {q.question}
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', marginBottom: '0.65rem' }}>
                              {(q.options || []).map((opt, optIdx) => {
                                const isCorrect = opt === q.answer;
                                return (
                                  <div
                                    key={optIdx}
                                    style={{
                                      padding: '0.5rem 0.75rem',
                                      borderRadius: 'var(--radius-sm)',
                                      background: isCorrect ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg-surface-secondary)',
                                      border: '1px solid',
                                      borderColor: isCorrect ? 'var(--status-passed)' : 'var(--border-subtle)',
                                      fontSize: '0.775rem',
                                      color: isCorrect ? 'var(--status-passed)' : 'var(--text-secondary)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.35rem'
                                    }}
                                  >
                                    {isCorrect && <CheckCircle2 size={12} />}
                                    <span>{opt}</span>
                                  </div>
                                );
                              })}
                            </div>

                            {q.explanation && (
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                                <strong>Rationale:</strong> {q.explanation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SECTION H: Homework Assignment */}
                  {(currentTab === 'all' || currentTab === 'homework') && lecture.homework && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.5rem' }}>
                        <FileCheck size={15} color="var(--text-primary)" />
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                          Homework: {lecture.homework.title}
                        </h4>
                      </div>

                      <div style={{
                        padding: '1.25rem',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.65rem'
                      }}>
                        <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>
                          {lecture.homework.instructions}
                        </p>

                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          <span>⏱ Estimated Time: ~{lecture.homework.estimatedTimeMinutes || 30} mins</span>
                          <span>·</span>
                          <span>📋 Submission: {lecture.homework.submissionGuidelines || 'Upload to student portal'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SECTION I: Expected Outcomes */}
                  {(currentTab === 'all') && Array.isArray(lecture.expectedOutcomes) && lecture.expectedOutcomes.length > 0 && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1rem',
                      background: 'var(--bg-surface-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.775rem',
                      color: 'var(--text-secondary)'
                    }}>
                      <CheckCircle2 size={14} color="var(--status-passed)" style={{ flexShrink: 0 }} />
                      <span>
                        <strong>Target Outcomes:</strong> {lecture.expectedOutcomes.join(' · ')}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

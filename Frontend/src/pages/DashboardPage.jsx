import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, BookOpen, ShieldCheck, ShieldAlert, Loader2, Trash2, ArrowRight, AlertTriangle, RefreshCw } from 'lucide-react';
import { api } from '../api';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Modal from '../components/common/Modal';
import { useApp } from '../context/AppContext';

const statusLabels = {
  completed:  { label: 'Completed',  cls: 'badge-green' },
  generating: { label: 'Generating', cls: 'badge-gray' },
  draft:      { label: 'Draft',      cls: 'badge-gray' },
};

function CourseCard({ course, onOpen, onDelete }) {
  const status = statusLabels[course.status] || statusLabels.completed;
  const isVerified = course.verificationStatus === 'verified';
  const isPartial = course.verificationStatus === 'partial';
  const verifiedCount = course.verifiedCount ?? course.verificationSummary?.passed ?? 0;
  const totalCount = course.totalCount ?? course.verificationSummary?.total ?? 0;

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '1.25rem',
        transition: 'border-color 0.15s ease, background-color 0.15s ease'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--border-strong)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      <div>
        {/* Top Badges */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <span className={`badge ${status.cls}`}>{status.label}</span>
            <span className="badge badge-gray">{course.runtimeVersion || 'Java 21'}</span>
          </div>
          <button
            className="btn-icon"
            onClick={(e) => { e.stopPropagation(); onDelete(course); }}
            title="Delete Course"
            style={{ padding: '0.35rem' }}
          >
            <Trash2 size={13} />
          </button>
        </div>

        {/* Title */}
        <h3
          style={{
            fontWeight: 600,
            fontSize: '1rem',
            color: 'var(--text-primary)',
            lineHeight: 1.35,
            marginBottom: '0.35rem',
            cursor: 'pointer'
          }}
          onClick={() => onOpen(course)}
        >
          {course.title}
        </h3>

        {/* Description */}
        <p style={{
          fontSize: '0.825rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.55,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          marginBottom: '1rem'
        }}>
          {course.description || `Comprehensive ${course.level || 'Beginner'} course for ${course.topic}.`}
        </p>
      </div>

      {/* Meta & Actions */}
      <div>
        <div style={{
          display: 'flex',
          gap: '1rem',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          marginBottom: '1rem',
          fontFamily: 'var(--font-mono)'
        }}>
          <span>{course.slidesCount || 0} slides</span>
          <span>·</span>
          <span>{course.exercisesCount || 0} labs</span>
          <span>·</span>
          <span>{course.duration || '60 minutes'}</span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '0.85rem',
          borderTop: '1px solid var(--border-subtle)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.75rem',
            color: isVerified ? 'var(--status-passed)' : isPartial ? 'var(--status-warning)' : 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            fontWeight: 500
          }}>
            {isVerified ? (
              <ShieldCheck size={14} color="var(--status-passed)" />
            ) : isPartial ? (
              <ShieldAlert size={14} color="var(--status-warning)" />
            ) : (
              <Loader2 size={14} className="spinner" />
            )}
            <span>
              {totalCount > 0 ? `${verifiedCount}/${totalCount} Verified` : (isVerified ? 'Verified' : 'Pending')}
            </span>
          </div>

          <button
            className="btn-secondary"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.775rem', gap: '0.35rem' }}
            onClick={() => onOpen(course)}
          >
            Open <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [courses, setCourses]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [search, setSearch]       = useState('');
  const [filterStatus, setFilter] = useState('all');
  const [deleteTarget, setDelete] = useState(null);
  const navigate = useNavigate();
  const { addToast } = useApp();

  const fetchCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCourses();
      setCourses(data.courses || []);
    } catch (err) {
      console.error("Failed to load courses:", err);
      try {
        const savedRaw = localStorage.getItem('vcs_saved_courses');
        if (savedRaw) {
          const saved = JSON.parse(savedRaw);
          if (Array.isArray(saved) && saved.length > 0) {
            setCourses(saved);
            return;
          }
        }
      } catch (e) {}
      setError(err.message || "Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const filtered = courses.filter(c => {
    const title = c.title || '';
    const topic = c.topic || '';
    const matchSearch = title.toLowerCase().includes(search.toLowerCase()) ||
                        topic.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filterStatus === 'all' || (c.status || 'completed') === filterStatus;
    return matchSearch && matchFilter;
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteCourse(deleteTarget.id);
      setCourses(prev => prev.filter(c => c.id !== deleteTarget.id));
      try {
        const savedRaw = localStorage.getItem('vcs_saved_courses');
        if (savedRaw) {
          const saved = JSON.parse(savedRaw).filter(c => c.id !== deleteTarget.id);
          localStorage.setItem('vcs_saved_courses', JSON.stringify(saved));
        }
      } catch {}
      addToast(`"${deleteTarget.title}" deleted.`, 'info');
    } catch (err) {
      addToast(`Failed to delete course: ${err.message}`, 'error');
    } finally {
      setDelete(null);
    }
  };

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', transition: 'background-color 0.2s ease' }}>
      <Header />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3.5rem 1.5rem 6rem' }}>
        {/* Page Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: '2.5rem',
          flexWrap: 'wrap',
          gap: '1.25rem',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '1.75rem'
        }}>
          <div>
            <p className="overline-editorial" style={{ marginBottom: '0.5rem' }}>
              Curriculum Workspace
            </p>
            <h1 className="heading-editorial" style={{
              fontSize: 'clamp(2rem, 3.5vw, 2.5rem)',
              lineHeight: 1.15,
            }}>
              Course Library
            </h1>
          </div>
          <button
            className="btn-primary"
            style={{ gap: '0.45rem' }}
            onClick={() => navigate('/create')}
          >
            <Plus size={14} /> New Course
          </button>
        </div>

        {/* Offline / Backend Error State Banner */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            padding: '1rem 1.25rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--status-failed)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '2rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertTriangle size={18} color="var(--status-failed)" />
              <div>
                <strong style={{ color: 'var(--status-failed)', fontSize: '0.85rem' }}>
                  Backend Offline or Unreachable
                </strong>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.2rem 0 0' }}>
                  {error}
                </p>
              </div>
            </div>
            <button
              className="btn-secondary"
              style={{ gap: '0.35rem', fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
              onClick={fetchCourses}
            >
              <RefreshCw size={13} /> Retry Connection
            </button>
          </div>
        )}

        {/* Search and Filters */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '360px' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }}
            />
            <input
              className="input-field"
              style={{ paddingLeft: '2.25rem', fontSize: '0.825rem' }}
              placeholder="Filter courses by topic or title..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {['all', 'completed', 'generating', 'draft'].map(s => (
              <button
                key={s}
                className={filterStatus === s ? 'btn-primary' : 'btn-ghost'}
                style={{
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.775rem',
                  textTransform: 'capitalize',
                  border: filterStatus === s ? '1px solid var(--btn-primary-bg)' : '1px solid var(--border)'
                }}
                onClick={() => setFilter(s)}
              >
                {s === 'all' ? 'All Courses' : s}
              </button>
            ))}
          </div>
        </div>

        {/* Content Section: Loading, Empty, or Course Grid */}
        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '5rem 1rem',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-card)'
          }}>
            <Loader2 size={28} className="spinner" style={{ margin: '0 auto 1rem', color: 'var(--text-primary)' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Loading your verified course curriculum...
            </p>
          </div>
        ) : filtered.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.25rem'
          }}>
            {filtered.map(c => (
              <CourseCard
                key={c.id}
                course={c}
                onOpen={c => navigate(`/course/${c.id}`)}
                onDelete={setDelete}
              />
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '5rem 1rem',
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius-md)'
          }}>
            <BookOpen size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
              {courses.length === 0 ? "You don't have any generated courses yet." : "No course materials match your filter."}
            </p>
            {courses.length === 0 ? (
              <button
                className="btn-primary"
                onClick={() => navigate('/create')}
              >
                <Plus size={14} /> Generate Your First Course
              </button>
            ) : (
              <button
                className="btn-secondary"
                onClick={() => { setSearch(''); setFilter('all'); }}
              >
                Reset Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDelete(null)} title="Delete Course">
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget?.title}</strong>?
          All associated slides, verified snippets, and exercises will be permanently removed.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={() => setDelete(null)}>
            Cancel
          </button>
          <button
            className="btn-primary"
            style={{
              background: 'var(--status-failed)',
              borderColor: 'var(--status-failed)',
              color: '#FFFFFF'
            }}
            onClick={handleDelete}
          >
            <Trash2 size={13} /> Confirm Delete
          </button>
        </div>
      </Modal>

      <Footer />
    </div>
  );
}

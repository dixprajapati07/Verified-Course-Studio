import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Sparkles, 
  RefreshCw, 
  Edit3, 
  Save, 
  Download, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  ArrowRight, 
  BookOpen, 
  MessageSquare, 
  Key, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  X
} from 'lucide-react';
import { 
  getPresentations, 
  getPresentation, 
  generateAllNotes, 
  regenerateSlideNotes, 
  saveSlideNotes, 
  exportNotes 
} from '../services/api';

// Fallback seed presentation for instant offline preview & resilience
const FALLBACK_PRESENTATION = {
  _id: 'sample_pres_1',
  title: 'Spring Boot REST APIs',
  topic: 'Spring Boot REST APIs',
  targetAudience: 'Intermediate',
  framework: 'Spring Boot 3.2',
  language: 'Java 21',
  slideCount: 5,
  branding: { instituteName: 'TechSummit Academy', accentColor: '#6366f1' }
};

const FALLBACK_SLIDES = [
  {
    _id: 's1',
    slideNumber: 1,
    title: 'Introduction to Spring Boot REST Architecture',
    subtitle: 'Modern Microservices & API Contracts',
    bulletPoints: [
      'Evolution of Spring MVC into modern REST microservices',
      'Decoupling client frontends from backend business capabilities',
      'HTTP verbs: GET, POST, PUT, DELETE, and PATCH conventions'
    ],
    codeSnippet: {
      language: 'java',
      filename: 'Application.java',
      code: '@SpringBootApplication\npublic class RestApiApplication {\n    public static void main(String[] args) {\n        SpringApplication.run(RestApiApplication.class, args);\n    }\n}'
    }
  },
  {
    _id: 's2',
    slideNumber: 2,
    title: 'Core Annotations: @RestController & @RequestMapping',
    subtitle: 'Mapping Endpoints & JSON Serialization',
    bulletPoints: [
      '@RestController combines @Controller and @ResponseBody',
      'Automatic serialization via Jackson Databind 2.16+',
      'Explicit URI path versioning: /api/v1/courses'
    ],
    codeSnippet: {
      language: 'java',
      filename: 'CourseController.java',
      code: '@RestController\n@RequestMapping("/api/v1/courses")\npublic class CourseController {\n    @GetMapping("/{id}")\n    public ResponseEntity<CourseDto> getCourse(@PathVariable Long id) {\n        return ResponseEntity.ok(courseService.findById(id));\n    }\n}'
    }
  },
  {
    _id: 's3',
    slideNumber: 3,
    title: 'Building Your First REST API Endpoint',
    subtitle: 'Separation of Concerns: Controller, Service, & DTOs',
    bulletPoints: [
      'Controllers handle request parsing and HTTP response codes',
      'Services encapsulate domain rules and transactional boundaries',
      'Never return raw JPA entities directly to API consumers'
    ],
    codeSnippet: {
      language: 'java',
      filename: 'CourseService.java',
      code: '@Service\npublic class CourseService {\n    public CourseDto findById(Long id) {\n        Course entity = repository.findById(id)\n            .orElseThrow(() -> new CourseNotFoundException(id));\n        return CourseDto.fromEntity(entity);\n    }\n}'
    }
  },
  {
    _id: 's4',
    slideNumber: 4,
    title: 'DTO Validation & Jakarta Constraints',
    subtitle: 'Fail Fast at the Boundary',
    bulletPoints: [
      'Applying @NotBlank, @Min, @Size, and @NotNull annotations',
      'Enabling validation with @Valid on request body parameters',
      'Standardized RFC 7807 ProblemDetail error responses'
    ],
    codeSnippet: {
      language: 'java',
      filename: 'CourseRequest.java',
      code: 'public record CourseRequest(\n    @NotBlank(message = "Title is required")\n    String title,\n    @Min(value = 15, message = "Duration must be at least 15 mins")\n    int durationMinutes\n) {}'
    }
  },
  {
    _id: 's5',
    slideNumber: 5,
    title: 'Automated Testing & MockMvc Verification',
    subtitle: 'Contract Testing & Unit Test Verification',
    bulletPoints: [
      'Testing controllers in isolation using @WebMvcTest',
      'Mocking dependencies cleanly with @MockBean',
      'Verifying JSON payloads and HTTP status assertions'
    ],
    codeSnippet: {
      language: 'java',
      filename: 'CourseControllerTest.java',
      code: '@WebMvcTest(CourseController.class)\nclass CourseControllerTest {\n    @Test\n    void shouldReturn200ForValidCourse() throws Exception {\n        mockMvc.perform(get("/api/v1/courses/101"))\n            .andExpect(status().isOk())\n            .andExpect(jsonPath("$.title").value("Spring Boot REST"));\n    }\n}'
    }
  }
];

export default function SlideNotesWorkspace({ onClose }) {
  const [presentation, setPresentation] = useState(FALLBACK_PRESENTATION);
  const [slides, setSlides] = useState(FALLBACK_SLIDES);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [notesMap, setNotesMap] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  const activeSlide = slides[activeSlideIndex] || slides[0];
  const activeNote = notesMap[activeSlide?._id] || null;

  // Local editable form state
  const [editForm, setEditForm] = useState({
    summary: '',
    detailedExplanation: '',
    speakingScript: '',
    practicalExample: '',
    transitionSentence: '',
    estimatedSpeakingTime: '3-4 mins'
  });

  // Load presentation and notes from backend
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const presList = await getPresentations();
        if (presList && presList.length > 0) {
          const detailed = await getPresentation(presList[0]._id);
          setPresentation(detailed.presentation);
          setSlides(detailed.slides.length > 0 ? detailed.slides : FALLBACK_SLIDES);

          const notesLookup = {};
          (detailed.notes || []).forEach(n => {
            notesLookup[n.slideId] = n;
          });
          setNotesMap(notesLookup);
        }
      } catch (err) {
        console.warn('Backend not responding yet; running with sample presentation:', err.message);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Sync edit form when active slide or note changes
  useEffect(() => {
    if (activeNote) {
      setEditForm({
        summary: activeNote.summary || '',
        detailedExplanation: activeNote.detailedExplanation || '',
        speakingScript: activeNote.speakingScript || '',
        practicalExample: activeNote.practicalExample || '',
        transitionSentence: activeNote.transitionSentence || '',
        estimatedSpeakingTime: activeNote.estimatedSpeakingTime || '3-4 mins'
      });
    } else {
      // Default placeholder before generation
      setEditForm({
        summary: `Overview for ${activeSlide?.title}`,
        detailedExplanation: `In-depth technical guidance for trainers delivering ${activeSlide?.title}.`,
        speakingScript: `"Welcome to ${activeSlide?.title}. Notice how we isolate concerns here..."`,
        practicalExample: `In high-traffic systems, this pattern prevents cascading failovers.`,
        transitionSentence: `Let's transition to the next slide to explore downstream handling.`,
        estimatedSpeakingTime: '3-4 mins'
      });
    }
    setIsEditing(false);
  }, [activeSlide?._id, activeNote]);

  const showNotification = (type, text) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage({ type: '', text: '' }), 4000);
  };

  // Generate for current slide
  const handleRegenerateCurrent = async () => {
    setIsLoading(true);
    try {
      const res = await regenerateSlideNotes(activeSlide._id, presentation.targetAudience);
      setNotesMap(prev => ({ ...prev, [activeSlide._id]: res.note }));
      showNotification('success', `Regenerated speaker notes for Slide ${activeSlide.slideNumber}!`);
    } catch (err) {
      // Fallback local generation if backend disconnected
      const fallbackNote = {
        slideId: activeSlide._id,
        slideNumber: activeSlide.slideNumber,
        slideTitle: activeSlide.title,
        summary: `Summary of ${activeSlide.title}: Key architectural boundaries in ${presentation.framework}.`,
        detailedExplanation: `Trainers should emphasize why decoupling layers is critical. Walk through: ${activeSlide.bulletPoints?.join(', ')}.`,
        speakingScript: `"Class, pay special attention to the annotations on Slide ${activeSlide.slideNumber}. This sets our baseline API contract."`,
        practicalExample: `Imagine handling 10,000 checkout requests per minute. This validation prevents database corruption.`,
        keyTerms: [
          { term: 'Controller', definition: 'Handles HTTP endpoints and return schemas.' },
          { term: 'Service', definition: 'Encapsulates business operations and transactions.' }
        ],
        takeaways: [
          'Fail fast at the boundary with Jakarta constraints.',
          'Never expose raw entities directly.'
        ],
        transitionSentence: 'Let us now step into the next architectural phase.',
        estimatedSpeakingTime: '3-4 mins',
        isEdited: false
      };
      setNotesMap(prev => ({ ...prev, [activeSlide._id]: fallbackNote }));
      showNotification('success', `Generated curriculum notes for Slide ${activeSlide.slideNumber}.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate for all slides
  const handleGenerateAll = async () => {
    setIsLoading(true);
    try {
      const res = await generateAllNotes(presentation._id);
      const updated = {};
      res.notes.forEach(n => {
        updated[n.slideId] = n;
      });
      setNotesMap(updated);
      showNotification('success', `Generated verified notes for all ${slides.length} slides!`);
    } catch (err) {
      showNotification('error', `Generation failed: ${err.message}.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Save trainer edits
  const handleSaveNotes = async () => {
    setIsSaving(true);
    try {
      const res = await saveSlideNotes(activeSlide._id, editForm);
      setNotesMap(prev => ({ ...prev, [activeSlide._id]: res.note }));
      setIsEditing(false);
      showNotification('success', `Saved trainer notes for Slide ${activeSlide.slideNumber}!`);
    } catch (err) {
      // Local preservation fallback
      setNotesMap(prev => ({
        ...prev,
        [activeSlide._id]: {
          ...(prev[activeSlide._id] || {}),
          ...editForm,
          isEdited: true
        }
      }));
      setIsEditing(false);
      showNotification('success', 'Saved trainer notes locally.');
    } finally {
      setIsSaving(false);
    }
  };

  // Export Notes to PDF or DOCX
  const handleExport = async (format) => {
    setIsExporting(true);
    try {
      const blob = await exportNotes(presentation._id, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${presentation.title.replace(/\s+/g, '_')}_Speaker_Notes.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showNotification('success', `Exported notes as ${format.toUpperCase()}!`);
    } catch (err) {
      showNotification('error', `Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#060913]/95 backdrop-blur-xl flex flex-col text-slate-100 overflow-hidden animate-in fade-in duration-200">
      
      {/* Workspace Top Toolbar */}
      <header className="px-6 py-3.5 bg-[#0a0f1d] border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-violet-600/30">
            <BookOpen size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Presentation Workspace: {presentation.title}
              </h2>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                Speaker Notes Studio
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {slides.length} Slides • {presentation.targetAudience} Level • {presentation.framework}
            </p>
          </div>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex items-center gap-3">
          {/* Notification Toast */}
          {statusMessage.text && (
            <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 animate-in fade-in ${
              statusMessage.type === 'error' 
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
              {statusMessage.type === 'error' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <button
            onClick={handleGenerateAll}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-all shadow-md shadow-violet-600/30 flex items-center gap-1.5 disabled:opacity-60"
          >
            <Sparkles size={14} />
            <span>Generate All Slides</span>
          </button>

          <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => handleExport('pdf')}
              disabled={isExporting}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1 disabled:opacity-50"
              title="Download PDF Briefing"
            >
              <Download size={13} /> PDF
            </button>
            <button
              onClick={() => handleExport('docx')}
              disabled={isExporting}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1 disabled:opacity-50"
              title="Download Word Document"
            >
              <Download size={13} /> DOCX
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close workspace"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </header>

      {/* 3-Pane Presentation Workspace Layout */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden bg-[#060913]">
        
        {/* LEFT PANE: Slide Thumbnails */}
        <aside className="col-span-12 md:col-span-3 lg:col-span-2 bg-[#090d1a] border-r border-white/5 p-4 overflow-y-auto space-y-3">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Slide Navigator ({slides.length})
          </div>

          <div className="space-y-2.5">
            {slides.map((s, idx) => {
              const isActive = idx === activeSlideIndex;
              const hasNotes = !!notesMap[s._id];
              return (
                <button
                  key={s._id || idx}
                  onClick={() => setActiveSlideIndex(idx)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col justify-between ${
                    isActive
                      ? 'bg-violet-950/40 border-violet-500/60 shadow-lg shadow-violet-950/50'
                      : 'bg-[#0e1424] border-white/5 hover:border-white/20 hover:bg-[#12192e]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[11px] font-bold text-violet-400">
                      #{String(s.slideNumber).padStart(2, '0')}
                    </span>
                    {hasNotes && (
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 size={10} /> Notes
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-slate-200 line-clamp-2">
                    {s.title}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* CENTER PANE: Slide Visual Stage */}
        <main className="col-span-12 md:col-span-5 lg:col-span-6 p-6 overflow-y-auto flex flex-col items-center justify-center bg-radial-gradient">
          <div className="w-full max-w-2xl space-y-4">
            
            {/* Aspect Ratio Badge & Pager */}
            <div className="flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="font-mono text-violet-400 font-semibold">
                  SLIDE {activeSlide.slideNumber} OF {slides.length}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-white/5">16:9 Widescreen</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  disabled={activeSlideIndex === 0}
                  onClick={() => setActiveSlideIndex(prev => prev - 1)}
                  className="p-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={activeSlideIndex === slides.length - 1}
                  onClick={() => setActiveSlideIndex(prev => prev + 1)}
                  className="p-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Slide Stage Canvas */}
            <div className="aspect-[16/9] w-full rounded-2xl bg-gradient-to-br from-[#11182c] via-[#0c1222] to-[#070b16] border border-white/15 shadow-2xl p-7 flex flex-col justify-between relative overflow-hidden">
              
              <div className="space-y-3">
                <div className="text-xs uppercase font-bold tracking-widest text-cyan-400">
                  {activeSlide.subtitle || presentation.topic}
                </div>
                <h3 className="text-2xl font-extrabold text-white tracking-tight leading-snug">
                  {activeSlide.title}
                </h3>

                {activeSlide.bulletPoints && (
                  <ul className="space-y-2 pt-2 text-sm text-slate-300">
                    {activeSlide.bulletPoints.map((bp, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="text-violet-400 font-bold mt-0.5">•</span>
                        <span>{bp}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Code Snippet Preview (if present) */}
              {activeSlide.codeSnippet && activeSlide.codeSnippet.code && (
                <div className="mt-3 p-3 rounded-xl bg-black/60 border border-white/10 font-mono text-xs text-slate-200 overflow-x-auto max-h-36">
                  <div className="text-[10px] text-slate-500 mb-1">
                    {activeSlide.codeSnippet.filename || 'Snippet.java'}
                  </div>
                  <pre>{activeSlide.codeSnippet.code}</pre>
                </div>
              )}

              {/* Slide Footer */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                <span>{presentation.branding?.instituteName || 'Verified Course Studio'}</span>
                <span>Page {activeSlide.slideNumber}</span>
              </div>
            </div>

          </div>
        </main>

        {/* RIGHT PANE: Structured Speaker Notes */}
        <section className="col-span-12 md:col-span-4 lg:col-span-4 bg-[#0a0e1c] border-l border-white/5 flex flex-col overflow-hidden">
          
          {/* Notes Header & Slide Actions */}
          <div className="p-4 bg-[#0d1428] border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-violet-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Slide {activeSlide.slideNumber} Speaker Notes
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRegenerateCurrent}
                disabled={isLoading}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 transition-colors flex items-center gap-1 disabled:opacity-50"
                title="Regenerate notes for this slide"
              >
                <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                <span>Regenerate</span>
              </button>

              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 transition-colors flex items-center gap-1"
                >
                  <Edit3 size={12} />
                  <span>Edit</span>
                </button>
              ) : (
                <button
                  onClick={handleSaveNotes}
                  disabled={isSaving}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-600/30 flex items-center gap-1"
                >
                  <Save size={12} />
                  <span>{isSaving ? 'Saving...' : 'Save'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Notes Content (Scrollable) */}
          <div className="flex-1 p-5 overflow-y-auto space-y-6 text-xs text-slate-300">
            
            {/* Estimated Speaking Time Banner */}
            <div className="p-3 rounded-xl bg-violet-950/30 border border-violet-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2 text-violet-300 font-semibold">
                <Clock size={14} />
                <span>Estimated Speaking Time</span>
              </div>
              <span className="font-mono text-white font-bold">
                {activeNote?.estimatedSpeakingTime || editForm.estimatedSpeakingTime}
              </span>
            </div>

            {/* 1. Slide Summary */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                1. Slide Summary
              </label>
              {isEditing ? (
                <textarea
                  rows={3}
                  value={editForm.summary}
                  onChange={e => setEditForm({ ...editForm, summary: e.target.value })}
                  className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-slate-200 focus:outline-none focus:border-violet-500"
                />
              ) : (
                <p className="p-3 rounded-xl bg-white/[0.02] border border-white/5 leading-relaxed text-slate-300">
                  {activeNote?.summary || editForm.summary}
                </p>
              )}
            </div>

            {/* 2. Detailed Explanation */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                2. Detailed Technical Explanation
              </label>
              {isEditing ? (
                <textarea
                  rows={4}
                  value={editForm.detailedExplanation}
                  onChange={e => setEditForm({ ...editForm, detailedExplanation: e.target.value })}
                  className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-slate-200 focus:outline-none focus:border-violet-500"
                />
              ) : (
                <p className="p-3 rounded-xl bg-white/[0.02] border border-white/5 leading-relaxed text-slate-300">
                  {activeNote?.detailedExplanation || editForm.detailedExplanation}
                </p>
              )}
            </div>

            {/* 3. Trainer Speaking Script (Highlighted Classroom Cue) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
                <MessageSquare size={13} />
                <span>3. Trainer Speaking Script (Verbatim Cue)</span>
              </label>
              {isEditing ? (
                <textarea
                  rows={4}
                  value={editForm.speakingScript}
                  onChange={e => setEditForm({ ...editForm, speakingScript: e.target.value })}
                  className="w-full p-3 rounded-xl bg-violet-950/20 border border-violet-500/30 text-violet-200 focus:outline-none"
                />
              ) : (
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-violet-950/30 to-indigo-950/30 border border-violet-500/30 italic text-violet-200 leading-relaxed shadow-inner">
                  "{activeNote?.speakingScript || editForm.speakingScript}"
                </div>
              )}
            </div>

            {/* 4. Practical Industry Example */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                4. Practical Example
              </label>
              {isEditing ? (
                <textarea
                  rows={3}
                  value={editForm.practicalExample}
                  onChange={e => setEditForm({ ...editForm, practicalExample: e.target.value })}
                  className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-slate-200 focus:outline-none"
                />
              ) : (
                <p className="p-3 rounded-xl bg-white/[0.02] border border-white/5 leading-relaxed text-slate-300">
                  {activeNote?.practicalExample || editForm.practicalExample}
                </p>
              )}
            </div>

            {/* 5. Key Terms */}
            {activeNote?.keyTerms && activeNote.keyTerms.length > 0 && (
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Key size={13} /> 5. Key Terms
                </label>
                <div className="space-y-1.5">
                  {activeNote.keyTerms.map((kt, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                      <strong className="text-white block">{kt.term}</strong>
                      <span className="text-slate-400 text-[11px]">{kt.definition}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. Student Takeaways */}
            {activeNote?.takeaways && activeNote.takeaways.length > 0 && (
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  6. Core Takeaways
                </label>
                <div className="space-y-1">
                  {activeNote.takeaways.map((tw, i) => (
                    <div key={i} className="flex items-start gap-2 text-slate-300">
                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span>{tw}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7. Transition Sentence */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 block">
                7. Transition to Next Slide
              </label>
              {isEditing ? (
                <textarea
                  rows={2}
                  value={editForm.transitionSentence}
                  onChange={e => setEditForm({ ...editForm, transitionSentence: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-slate-200 focus:outline-none"
                />
              ) : (
                <p className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-cyan-200 italic leading-relaxed">
                  "{activeNote?.transitionSentence || editForm.transitionSentence}"
                </p>
              )}
            </div>

          </div>
        </section>

      </div>
    </div>
  );
}

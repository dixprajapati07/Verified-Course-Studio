import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Terminal, 
  Layers, 
  FileText, 
  Code, 
  HelpCircle, 
  Bookmark, 
  Play, 
  Cpu, 
  ShieldCheck, 
  ExternalLink,
  Sparkles,
  Info,
  ArrowRight
} from 'lucide-react';

export default function ProductPreview({ onOpenSlideNotes, onOpenCodePlayground }) {
  const [activeTab, setActiveTab] = useState('slides');

  const tabs = [
    { id: 'slides', label: 'Slides', icon: Layers, count: '14' },
    { id: 'notes', label: 'Trainer Notes', icon: FileText, count: '14' },
    { id: 'code', label: 'Code Examples', icon: Code, count: '6' },
    { id: 'exercises', label: 'Exercises', icon: Terminal, count: '3' },
    { id: 'quiz', label: 'Quiz', icon: HelpCircle, count: '10 Qs' },
    { id: 'cheatsheet', label: 'Cheat Sheet', icon: Bookmark, count: '1' }
  ];

  return (
    <div className="relative rounded-2xl p-[1px] bg-gradient-to-b from-violet-500/30 via-indigo-500/10 to-cyan-500/20 shadow-2xl shadow-indigo-950/70">
      
      {/* Decorative Glow */}
      <div className="absolute -top-12 -right-12 w-64 h-64 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Preview Container */}
      <div className="relative bg-[#090d18] rounded-2xl overflow-hidden border border-white/10">
        
        {/* Window Chrome Bar */}
        <div className="bg-[#0e1424] px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            <span className="ml-2 text-xs font-mono text-slate-400">workspace://studio/spring-boot-rest-api</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 size={12} />
              All checks passed
            </span>
            <span className="text-xs font-mono text-slate-400">Java 21 • Spring Boot 3.2</span>
          </div>
        </div>

        {/* Project Header Info */}
        <div className="px-5 py-3.5 bg-[#0b101e] border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-bold text-white tracking-tight">
                Spring Boot REST APIs
              </h4>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                Intermediate
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                • 90 Minutes Session
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive classroom pack: Slides, runnable demos, and validated unit tests.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-500/20">
            <ShieldCheck size={14} />
            <span>Sandbox Verified</span>
          </div>
        </div>

        {/* Workspace Body: Sidebar + Main Stage */}
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[420px]">
          
          {/* Left Asset Sidebar */}
          <div className="md:col-span-4 bg-[#0a0f1d] border-r border-white/5 p-3 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">
                Generated Materials
              </div>
              <div className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-violet-600/20 text-white border border-violet-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon size={14} className={isActive ? 'text-violet-400' : 'text-slate-500'} />
                        <span>{tab.label}</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                        isActive ? 'bg-violet-500/30 text-violet-200' : 'bg-white/5 text-slate-500'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Verification Stats Widget */}
            <div className="mt-4 p-3 rounded-xl bg-[#0e162b] border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-medium">Generation Status</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={11} /> 100% Ready
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-500 to-emerald-400 rounded-full w-full" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1 border-t border-white/5">
                <div>Tests: <strong className="text-white">12/12 Passed</strong></div>
                <div>Errors: <strong className="text-emerald-400">0</strong></div>
              </div>
            </div>
          </div>

          {/* Right Main Stage View */}
          <div className="md:col-span-8 p-5 bg-[#080c16] flex flex-col justify-between">
            
            {/* Tab: SLIDES */}
            {activeTab === 'slides' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono text-violet-400">
                    SLIDE 03 OF 14 • ARCHITECTURE
                  </div>
                  <span className="text-[11px] text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                    Aspect Ratio: 16:9 (PPTX ready)
                  </span>
                </div>

                {/* Slide Card Simulation */}
                <div className="rounded-xl p-5 bg-gradient-to-br from-[#12192e] to-[#0c1120] border border-white/10 shadow-lg space-y-3">
                  <div className="text-xs uppercase font-bold tracking-wider text-cyan-400">
                    Spring MVC Core Flow
                  </div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    Building Your First REST API
                  </h3>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="text-violet-400 font-bold">•</span>
                      <span><strong>@RestController</strong> combines @Controller and @ResponseBody for JSON streaming.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-violet-400 font-bold">•</span>
                      <span>Clean separation of concerns with <strong>Service & Repository</strong> layers.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-violet-400 font-bold">•</span>
                      <span>Automatic serialization with Jackson Databind 2.16+.</span>
                    </li>
                  </ul>

                  {/* Micro Visual Flow */}
                  <div className="grid grid-cols-3 gap-2 pt-2 text-[11px] text-center font-mono">
                    <div className="p-2 rounded bg-violet-950/60 border border-violet-500/30 text-violet-200">
                      HTTP GET
                    </div>
                    <div className="p-2 rounded bg-indigo-950/60 border border-indigo-500/30 text-indigo-200">
                      CourseController
                    </div>
                    <div className="p-2 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-200">
                      200 OK (JSON)
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Speaker Notes: "Explain that @RestController handles serialization..."</span>
                  {onOpenSlideNotes && (
                    <button 
                      onClick={onOpenSlideNotes}
                      className="text-violet-400 font-medium hover:underline flex items-center gap-1"
                    >
                      Open Full Notes Studio <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Tab: CODE */}
            {activeTab === 'code' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-300">src/main/java/CourseController.java</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={12} /> Compiles clean (Java 21)
                  </span>
                </div>
                
                {/* Code Block */}
                <div className="rounded-xl p-4 bg-[#050811] border border-white/10 font-mono text-xs leading-relaxed overflow-x-auto text-slate-200">
                  <p className="text-slate-500">// Verified against Spring Boot 3.2.4</p>
                  <p><span className="text-violet-400">@RestController</span></p>
                  <p><span className="text-violet-400">@RequestMapping</span>(<span className="text-emerald-300">"/api/v1/courses"</span>)</p>
                  <p><span className="text-blue-400">public class</span> <span className="text-amber-300">CourseController</span> &#123;</p>
                  <p className="pl-4 text-slate-400">private final CourseService service;</p>
                  <p className="pl-4 mt-2"><span className="text-violet-400">@GetMapping</span>(<span className="text-emerald-300">"/&#123;id&#125;"</span>)</p>
                  <p className="pl-4"><span className="text-blue-400">public</span> ResponseEntity&lt;CourseDto&gt; <span className="text-cyan-300">getCourse</span>(<span className="text-violet-400">@PathVariable</span> Long id) &#123;</p>
                  <p className="pl-8 text-slate-300"><span className="text-blue-400">return</span> ResponseEntity.ok(service.findVerifiedById(id));</p>
                  <p className="pl-4">&#125;</p>
                  <p>&#125;</p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 size={14} className="shrink-0" />
                    <span>Executed in isolated sandbox. 0 warnings.</span>
                  </div>
                  {onOpenCodePlayground && (
                    <button
                      onClick={onOpenCodePlayground}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <Terminal size={13} /> Launch Playground
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Tab: EXERCISES */}
            {activeTab === 'exercises' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">Lab 02: REST Payload Validation</span>
                  <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded text-[11px]">
                    Includes Reference & Deliberate Bug Solution
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-[#0f1629] border border-white/10 space-y-2 text-xs">
                  <div className="font-semibold text-slate-200">Task Objective:</div>
                  <p className="text-slate-400">
                    Add Jakarta validation constraints (<code>@NotBlank</code>, <code>@Min(1)</code>) to CourseCreationRequest and test the 400 Bad Request handler.
                  </p>
                  <div className="pt-2 border-t border-white/5 grid grid-cols-2 gap-2">
                    <div className="p-2 rounded bg-emerald-950/40 text-emerald-300 text-[11px] border border-emerald-500/30">
                      ✓ Reference Solution: 100% tests passed
                    </div>
                    <div className="p-2 rounded bg-rose-950/40 text-rose-300 text-[11px] border border-rose-500/30">
                      ✕ Naive Solution: Failed boundary test (as designed)
                    </div>
                  </div>
                </div>
                {onOpenCodePlayground && (
                  <button
                    onClick={onOpenCodePlayground}
                    className="w-full py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <span>Run this exercise in Code Playground</span>
                    <ArrowRight size={13} />
                  </button>
                )}
              </div>
            )}

            {/* Tab: TRAINER NOTES */}
            {activeTab === 'notes' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">Pedagogical Guide for Slide 03</span>
                  <span className="text-[11px] font-mono text-violet-400">Speaking Time: 3-4 mins</span>
                </div>
                <div className="p-4 rounded-xl bg-[#0f1629] border border-white/10 space-y-3 text-xs text-slate-300 leading-relaxed">
                  <p>
                    <strong className="text-violet-400">Common Student Confusion:</strong> Students often confuse <code>@Controller</code> with <code>@RestController</code>. Emphasize that without <code>@ResponseBody</code>, Spring looks for a JSP or Thymeleaf template.
                  </p>
                  <p>
                    <strong className="text-cyan-400">Classroom Question:</strong> "Why not return the JPA entity directly?" Use this to transition to DTO projection in Slide 04.
                  </p>
                </div>
                {onOpenSlideNotes && (
                  <button
                    onClick={onOpenSlideNotes}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-violet-600/30"
                  >
                    <FileText size={14} />
                    <span>Open Full Slide Notes Studio (Edit, PDF & DOCX Export)</span>
                  </button>
                )}
              </div>
            )}

            {/* Tab: QUIZ */}
            {activeTab === 'quiz' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="text-xs font-semibold text-white">Formative Assessment (10 Questions)</div>
                <div className="p-4 rounded-xl bg-[#0f1629] border border-white/10 space-y-2 text-xs text-slate-300">
                  <div className="font-medium text-white">Q1: Which HTTP status code should be returned upon successful creation via POST?</div>
                  <div className="space-y-1.5 pt-1">
                    <div className="p-2 rounded bg-white/5 text-slate-400">A) 200 OK</div>
                    <div className="p-2 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-semibold">
                      B) 201 Created (Correct with Location header)
                    </div>
                    <div className="p-2 rounded bg-white/5 text-slate-400">C) 204 No Content</div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: CHEATSHEET */}
            {activeTab === 'cheatsheet' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="text-xs font-semibold text-white">1-Page Student Revision Sheet</div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-3 rounded-lg bg-[#0e162a] border border-white/5 text-slate-300">
                    <strong className="text-violet-400 block mb-1">Annotations</strong>
                    @RestController<br/>
                    @GetMapping<br/>
                    @PostMapping<br/>
                    @Valid @RequestBody
                  </div>
                  <div className="p-3 rounded-lg bg-[#0e162a] border border-white/5 text-slate-300">
                    <strong className="text-cyan-400 block mb-1">Status Codes</strong>
                    200: OK<br/>
                    201: Created<br/>
                    400: Validation Err<br/>
                    404: Not Found
                  </div>
                </div>
              </div>
            )}

            {/* Demonstration Data Notice Bar */}
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <Info size={12} className="text-slate-400" />
                Demonstration data: Illustrative preview of verification engine execution.
              </span>
              <span className="text-slate-400">Run ID: #VCS-8921-LIVE</span>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

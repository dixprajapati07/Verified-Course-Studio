import React from 'react';
import { Sparkles, ArrowRight, ShieldCheck, CheckCircle2, Download, Layers, FileText, Terminal } from 'lucide-react';
import ProductPreview from './ProductPreview';

export default function Hero({ onOpenCreateCourse, onOpenSlideNotes, onOpenCodePlayground }) {
  return (
    <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden bg-grid-pattern">
      
      {/* Background radial gradient */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-tr from-violet-600/15 via-indigo-600/10 to-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Value Prop */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            
            {/* Small announcement badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/30 shadow-inner">
              <Sparkles size={13} className="text-violet-400" />
              <span>AI-Powered Teaching Material Generation</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.12]">
              Create Smarter Courses.{' '}
              <span className="gradient-text">Verify Every Line of Code.</span>
            </h1>

            {/* Supporting Paragraph */}
            <p className="text-base sm:text-lg text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
              Turn any technical topic into a complete, branded teaching experience. 
              Generate beautiful slides, detailed trainer notes, runnable examples, 
              tested assignments, and quizzes — with automated verification built in.
            </p>

            {/* Primary & Secondary Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <button
                onClick={onOpenCreateCourse}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all transform hover:-translate-y-0.5 text-base"
              >
                <span>Start Creating</span>
                <ArrowRight size={16} />
              </button>

              <a
                href="#how-it-works"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-base"
              >
                <span>See How It Works</span>
              </a>
            </div>

            {/* Quick Workspace Switcher Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-1">
              <button
                onClick={onOpenSlideNotes}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-violet-950/30 text-violet-300 hover:text-white hover:bg-violet-900/40 border border-violet-500/30 transition-all"
              >
                <FileText size={14} />
                <span>Open Slide Notes Studio (3-Pane)</span>
              </button>

              <button
                onClick={onOpenCodePlayground}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-950/30 text-cyan-300 hover:text-white hover:bg-cyan-900/40 border border-cyan-500/30 transition-all"
              >
                <Terminal size={14} />
                <span>Launch Code Playground (Live Runner)</span>
              </button>
            </div>

            {/* Three Compact Trust Indicators */}
            <div className="pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center justify-center lg:justify-start gap-2 text-xs font-medium text-slate-300">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>Verified Code Examples</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start gap-2 text-xs font-medium text-slate-300">
                <CheckCircle2 size={16} className="text-violet-400 shrink-0" />
                <span>Export-Ready Materials</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start gap-2 text-xs font-medium text-slate-300">
                <CheckCircle2 size={16} className="text-cyan-400 shrink-0" />
                <span>Framework-Aware Content</span>
              </div>
            </div>

          </div>

          {/* Right Column: High-fidelity Product Preview */}
          <div className="lg:col-span-6 w-full">
            <ProductPreview 
              onOpenSlideNotes={onOpenSlideNotes}
              onOpenCodePlayground={onOpenCodePlayground}
            />
          </div>

        </div>
      </div>

    </section>
  );
}

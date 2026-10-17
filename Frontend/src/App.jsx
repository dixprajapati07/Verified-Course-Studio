import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ProblemSection from './components/ProblemSection';
import FeaturesSection from './components/FeaturesSection';
import WorkflowSection from './components/WorkflowSection';
import VerificationDashboard from './components/VerificationDashboard';
import CourseForm from './components/CourseForm';
import TechTrustSection from './components/TechTrustSection';
import ImpactSection from './components/ImpactSection';
import CTASection from './components/CTASection';
import Footer from './components/Footer';
import SlideNotesWorkspace from './components/SlideNotesWorkspace';
import CodePlayground from './components/CodePlayground';
import { FileText, Terminal, Sparkles } from 'lucide-react';

export default function App() {
  const [isSlideNotesOpen, setIsSlideNotesOpen] = useState(false);
  const [isCodePlaygroundOpen, setIsCodePlaygroundOpen] = useState(false);

  const scrollToCreateCourse = () => {
    const el = document.getElementById('create-course');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 selection:bg-violet-500 selection:text-white font-sans relative">
      {/* Sticky Navigation */}
      <Navbar 
        onOpenCreateCourse={scrollToCreateCourse}
        onOpenSlideNotes={() => setIsSlideNotesOpen(true)}
        onOpenCodePlayground={() => setIsCodePlaygroundOpen(true)}
      />

      {/* Main Content Sections */}
      <main>
        {/* Hero Section with Live Product Preview */}
        <Hero 
          onOpenCreateCourse={scrollToCreateCourse}
          onOpenSlideNotes={() => setIsSlideNotesOpen(true)}
          onOpenCodePlayground={() => setIsCodePlaygroundOpen(true)}
        />

        {/* Problem vs Solution Section */}
        <ProblemSection />

        {/* 10 Core Features Grid */}
        <FeaturesSection />

        {/* 4-Step Pipeline Workflow */}
        <WorkflowSection />

        {/* Verification Engine Interactive Dashboard */}
        <VerificationDashboard />

        {/* Interactive Course Creation Form */}
        <CourseForm />

        {/* Supported Runtimes & Trust Principles */}
        <TechTrustSection />

        {/* Qualitative Impact & Benefits */}
        <ImpactSection />

        {/* Final Call to Action */}
        <CTASection onOpenCreateCourse={scrollToCreateCourse} />
      </main>

      {/* Footer with Sponsorship Attribution */}
      <Footer />

      {/* Floating Workspace Launch Dock */}
      <div className="fixed bottom-6 right-6 z-30 flex items-center gap-2 bg-[#0c1224]/90 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-2xl">
        <button
          onClick={() => setIsSlideNotesOpen(true)}
          className="px-3 py-2 rounded-xl text-xs font-semibold bg-violet-600/20 hover:bg-violet-600 text-violet-200 hover:text-white border border-violet-500/30 transition-all flex items-center gap-1.5 shadow-sm"
        >
          <FileText size={14} />
          <span>Slide Notes Studio</span>
        </button>

        <button
          onClick={() => setIsCodePlaygroundOpen(true)}
          className="px-3 py-2 rounded-xl text-xs font-semibold bg-cyan-600/20 hover:bg-cyan-600 text-cyan-200 hover:text-white border border-cyan-500/30 transition-all flex items-center gap-1.5 shadow-sm"
        >
          <Terminal size={14} />
          <span>Code Playground</span>
        </button>
      </div>

      {/* Feature 1: Slide Notes Workspace Modal */}
      {isSlideNotesOpen && (
        <SlideNotesWorkspace onClose={() => setIsSlideNotesOpen(false)} />
      )}

      {/* Feature 2: Interactive Code Playground Modal */}
      {isCodePlaygroundOpen && (
        <CodePlayground onClose={() => setIsCodePlaygroundOpen(false)} />
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { ShieldCheck, BookOpen, Menu, X, ArrowRight, Sparkles, Terminal, FileText } from 'lucide-react';

export default function Navbar({ onOpenCreateCourse, onOpenSlideNotes, onOpenCodePlayground }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Verification', href: '#verification' },
    { label: 'Supported Tech', href: '#technology' },
    { label: 'Resources', href: '#resources' }
  ];

  return (
    <header 
      className={`sticky top-0 z-40 transition-all duration-300 ${
        isScrolled 
          ? 'bg-[#060913]/90 backdrop-blur-md border-b border-white/10 shadow-lg shadow-black/40 py-3' 
          : 'bg-transparent border-b border-white/5 py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          {/* Logo */}
          <a href="#" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 p-[1px] transition-transform duration-300 group-hover:scale-105 shadow-md shadow-indigo-500/20">
              <div className="w-full h-full bg-[#0a0e1a] rounded-[11px] flex items-center justify-center relative">
                <BookOpen size={18} className="text-violet-400" />
                <ShieldCheck size={14} className="text-emerald-400 absolute -bottom-1 -right-1 fill-[#0a0e1a]" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
                Verified Studio
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  Pro
                </span>
              </span>
              <span className="text-[11px] text-slate-400 font-medium -mt-1">
                Course Material Engine
              </span>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors duration-150 relative py-1 hover:after:w-full after:w-0 after:h-[2px] after:bg-gradient-to-r after:from-violet-500 after:to-cyan-400 after:absolute after:bottom-0 after:left-0 after:transition-all"
              >
                {link.label}
              </a>
            ))}

            <div className="h-4 w-[1px] bg-white/10 mx-1" />

            {/* Feature 1 & 2 Quick Launchers */}
            <button
              onClick={onOpenSlideNotes}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-violet-950/40 text-violet-300 hover:text-white hover:bg-violet-900/50 border border-violet-500/30 transition-all flex items-center gap-1.5"
            >
              <FileText size={13} />
              <span>Slide Notes</span>
            </button>

            <button
              onClick={onOpenCodePlayground}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-cyan-950/40 text-cyan-300 hover:text-white hover:bg-cyan-900/50 border border-cyan-500/30 transition-all flex items-center gap-1.5"
            >
              <Terminal size={13} />
              <span>Code Playground</span>
            </button>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={() => alert('Sign in demo: Authentication provider integration ready.')}
              className="text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5"
            >
              Sign In
            </button>
            <button
              onClick={onOpenCreateCourse}
              className="inline-flex items-center gap-2 text-sm font-semibold text-white px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all duration-200 transform hover:-translate-y-0.5"
            >
              <Sparkles size={14} />
              Start Building
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0a0e1a]/98 border-b border-white/10 px-4 pt-3 pb-6 space-y-3 backdrop-blur-xl animate-in slide-in-from-top duration-200">
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-base font-medium text-slate-200 hover:text-white hover:bg-white/5"
              >
                {link.label}
              </a>
            ))}

            <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenSlideNotes();
                }}
                className="py-2.5 px-3 rounded-xl bg-violet-950/40 text-violet-300 border border-violet-500/30 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <FileText size={14} /> Slide Notes
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenCodePlayground();
                }}
                className="py-2.5 px-3 rounded-xl bg-cyan-950/40 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Terminal size={14} /> Playground
              </button>
            </div>
          </div>
          <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
            <button 
              onClick={() => {
                setMobileMenuOpen(false);
                alert('Sign in demo: Authentication provider integration ready.');
              }}
              className="w-full text-center py-2.5 rounded-xl border border-white/10 text-slate-200 font-medium hover:bg-white/5"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenCreateCourse();
              }}
              className="w-full text-center py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30"
            >
              Start Building
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

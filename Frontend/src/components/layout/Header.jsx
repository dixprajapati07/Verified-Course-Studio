// src/components/layout/Header.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sun, Moon, Menu, X, ArrowRight, LogOut } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function Header() {
    const [menuOpen, setMenuOpen] = useState(false);
    const navigate = useNavigate();
    const {
        isDark,
        toggleTheme,
        openAuthModal,
        guestSession,
        authUser,
        isAuthenticated,
        clearAuthSession,
    } = useApp();

    const displayName = authUser?.user_metadata?.full_name || authUser?.email;

    const navLinks = [
        { label: 'Product', href: '#features' },
        { label: 'How It Works', href: '#how-it-works' },
        { label: 'My Courses', href: '/dashboard' },
    ];

    const scrollTo = (href) => {
        if (href.startsWith('#')) {
            const el = document.querySelector(href);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        } else {
            navigate(href);
        }
        setMenuOpen(false);
    };

    return (
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
                {/* Left: Minimal Logo & Name */}
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
                    <div style={{
                        width: 24,
                        height: 24,
                        borderRadius: '4px',
                        background: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--bg-base)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)'
                    }}>
                        V
                    </div>
                    <span style={{
                        fontWeight: 500,
                        fontSize: '0.9rem',
                        color: 'var(--text-primary)',
                        letterSpacing: '-0.01em'
                    }}>
                        Verified Course Studio
                    </span>
                </Link>

                {/* Right: Desktop Navigation */}
                <nav className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {navLinks.map(l => (
                        <button
                            key={l.label}
                            className="btn-ghost"
                            onClick={() => scrollTo(l.href)}
                            style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}
                        >
                            {l.label}
                        </button>
                    ))}

                    {/* Theme toggle */}
                    <button
                        className="theme-toggle-btn"
                        onClick={toggleTheme}
                        title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
                        aria-label="Toggle theme"
                    >
                        {isDark ? <Sun size={14} /> : <Moon size={14} />}
                    </button>

                    {/* Guest indicator if active in header */}
                    {guestSession && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.2rem 0.55rem',
                            borderRadius: 'var(--radius-full)',
                            background: 'var(--bg-surface-secondary)',
                            border: '1px solid var(--border)',
                            fontSize: '0.725rem',
                            color: 'var(--text-secondary)',
                            fontFamily: 'var(--font-mono)'
                        }}>
                            <span className="status-dot green" />
                            <span>Guest</span>
                        </div>
                    )}

                    {isAuthenticated && displayName && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                                <span className="status-dot green" />
                                {displayName}
                            </span>
                            <button
                                type="button"
                                className="btn-ghost"
                                onClick={clearAuthSession}
                                title="Log out"
                                style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}
                            >
                                <LogOut size={13} />
                                Logout
                            </button>
                        </div>
                    )}

                    {/* Signup button */}
                    {!isAuthenticated && (
                        <button
                            className="btn-primary"
                            style={{ fontSize: '0.825rem', padding: '0.45rem 0.95rem' }}
                            onClick={openAuthModal}
                        >
                            Signup <ArrowRight size={13} />
                        </button>
                    )}
                </nav>

                {/* Mobile controls */}
                <div className="hide-desktop" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                        className="theme-toggle-btn"
                        onClick={toggleTheme}
                        aria-label="Toggle theme"
                    >
                        {isDark ? <Sun size={14} /> : <Moon size={14} />}
                    </button>
                    <button
                        className="btn-icon"
                        onClick={() => setMenuOpen(v => !v)}
                        aria-label="Menu"
                    >
                        {menuOpen ? <X size={16} /> : <Menu size={16} />}
                    </button>
                </div>
            </div>

            {/* Mobile dropdown */}
            {menuOpen && (
                <div style={{
                    background: 'var(--bg-surface)',
                    borderBottom: '1px solid var(--border)',
                    padding: '1rem 1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                }}>
                    {navLinks.map(l => (
                        <button
                            key={l.label}
                            className="btn-ghost"
                            onClick={() => scrollTo(l.href)}
                            style={{ justifyContent: 'flex-start', width: '100%', fontSize: '0.875rem' }}
                        >
                            {l.label}
                        </button>
                    ))}
                    {isAuthenticated && displayName && (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0', fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                                <span className="status-dot green" />
                                {displayName}
                            </div>
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => {
                                    clearAuthSession();
                                    setMenuOpen(false);
                                }}
                                style={{ justifyContent: 'center', width: '100%', fontSize: '0.8rem' }}
                            >
                                <LogOut size={14} />
                                Logout
                            </button>
                        </>
                    )}
                    {!isAuthenticated && (
                        <button
                            className="btn-primary"
                            style={{ marginTop: '0.5rem', justifyContent: 'center' }}
                            onClick={() => {
                                setMenuOpen(false);
                                openAuthModal();
                            }}
                        >
                            Signup <ArrowRight size={14} />
                        </button>
                    )}
                </div>
            )}
        </header>
    );
}
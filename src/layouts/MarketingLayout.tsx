import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { Button } from '@/components/ui/Button';

export const MarketingLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-md">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 group">
              <span className="font-mono font-black text-xl tracking-tight bg-gradient-to-r from-brand to-indigo-400 bg-clip-text text-transparent group-hover:opacity-90">
                SkipLogic
              </span>
              <span className="hidden sm:inline-block rounded-md bg-surface-elevated px-1.5 py-0.5 text-[10px] font-bold font-mono border border-border text-brand uppercase tracking-wider">
                Engine
              </span>
            </Link>
          </div>
          
          <nav className="flex items-center gap-4">
            <ThemeToggle />
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                Sign In
              </Button>
            </Link>
            <Link to="/app">
              <Button size="sm">
                Get Started
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border/80 bg-surface/50 py-8 px-4">
        <div className="container mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left text-xs text-text-muted">
          <div>
            <p className="font-semibold text-text-secondary font-mono">SkipLogic © 2026</p>
            <p className="mt-1">Don't guess. Know whether you can bunk.</p>
          </div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-text-primary transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-text-primary transition-colors">GitHub Repository</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

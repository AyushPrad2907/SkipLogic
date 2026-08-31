import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  Settings,
  GraduationCap,
  History,
  TrendingUp,
  Sparkles,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useToast } from '@/providers/ToastProvider';
import { useAttendance } from '@/providers/AttendanceProvider';
import { supabase } from '@/lib/supabase';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { resetAllData, loadMockData } = useAttendance();
  const [profileOpen, setProfileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('guest@skiplogic.io');
  const [userInitial, setUserInitial] = useState<string>('S');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        setUserEmail(data.user.email);
        setUserInitial(data.user.email.charAt(0).toUpperCase());
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        setUserEmail(session.user.email);
        setUserInitial(session.user.email.charAt(0).toUpperCase());
      } else {
        setUserEmail('guest@skiplogic.io');
        setUserInitial('G');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const menuItems = [
    { label: 'Dashboard', path: '/app', icon: LayoutDashboard },
    { label: 'AI Coach', path: '/app/coach', icon: Sparkles },
    { label: 'Subjects', path: '/app/subjects', icon: BookOpen },
    { label: 'Timetable', path: '/app/timetable', icon: Calendar },
    { label: 'Analytics', path: '/app/analytics', icon: TrendingUp },
    { label: 'History', path: '/app/history', icon: History },
    { label: 'Semester', path: '/app/semester', icon: GraduationCap },
  ];

  const handleLogout = async () => {
    setProfileOpen(false);
    try {
      await supabase.auth.signOut();
      showToast({
        title: 'Signed Out',
        message: 'You have been signed out successfully.',
        type: 'info',
      });
      navigate('/auth');
    } catch (err: any) {
      showToast({
        title: 'Sign Out Error',
        message: err?.message || 'Failed to sign out.',
        type: 'danger',
      });
    }
  };

  const handleLoadMock = () => {
    loadMockData();
    showToast({
      title: 'Mock Data Loaded',
      message: 'Successfully populated dashboard with sample classes and attendance log.',
      type: 'success',
    });
    setProfileOpen(false);
  };

  const handleResetData = () => {
    resetAllData();
    showToast({
      title: 'Data Cleared',
      message: 'All local attendance data and subjects have been reset.',
      type: 'warning',
    });
    setProfileOpen(false);
  };

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col md:flex-row">
      {/* 1. DESKTOP SIDEBAR NAVIGATION */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-surface shrink-0 h-screen sticky top-0">
        
        {/* Brand Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <Link to="/app" className="flex items-center gap-2">
            <span className="font-mono font-black text-2xl tracking-tight bg-gradient-to-r from-brand to-indigo-400 bg-clip-text text-transparent">
              SkipLogic
            </span>
          </Link>
          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-brand/10 text-brand border border-brand/20">
            PRO
          </span>
        </div>

        {/* Menu Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors select-none',
                  isActive
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-white' : 'text-text-secondary')} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Bottom Controls */}
        <div className="p-4 border-t border-border bg-surface-elevated/20 flex flex-col gap-2">
          {/* Quick Actions Panel */}
          <div className="flex items-center justify-between px-2 py-1 mb-2">
            <span className="text-[10px] text-text-muted uppercase font-mono tracking-wider font-semibold">Preferences</span>
            <ThemeToggle />
          </div>

          {/* User Section */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-surface-elevated transition-colors text-left border border-transparent hover:border-border cursor-pointer"
            >
              <div className="h-9 w-9 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center text-brand font-semibold text-sm">
                {userInitial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">Student Account</p>
                <p className="text-xs text-text-muted truncate">{userEmail}</p>
              </div>
            </button>

            {/* Profile Dropdown Context Menu */}
            {profileOpen && (
              <div className="absolute bottom-full left-0 w-full mb-2 bg-surface border border-border rounded-lg shadow-xl py-1 z-30 animate-in fade-in slide-in-from-bottom-2">
                <button
                  onClick={handleLoadMock}
                  className="w-full px-4 py-2 text-left text-xs hover:bg-surface-elevated text-brand font-semibold transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Load Mock Data
                </button>
                <button
                  onClick={handleResetData}
                  className="w-full px-4 py-2 text-left text-xs hover:bg-surface-elevated text-danger font-semibold transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Reset Local Data
                </button>
                <div className="border-t border-border my-1" />
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-xs hover:bg-surface-elevated text-text-primary transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* 2. MOBILE TOP NAVIGATION & CONTENT SHELL */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Mobile Header Bar */}
        <header className="md:hidden h-16 bg-surface border-b border-border px-4 flex items-center justify-between sticky top-0 z-20">
          <Link to="/app" className="flex items-center gap-2">
            <span className="font-mono font-black text-xl tracking-tight bg-gradient-to-r from-brand to-indigo-400 bg-clip-text text-transparent">
              SkipLogic
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="h-8 w-8 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center text-brand font-semibold text-xs cursor-pointer"
            >
              {userInitial}
            </button>
          </div>
          
          {/* Mobile Profile Dropdown Overlay */}
          {profileOpen && (
            <div className="absolute top-16 right-4 w-56 bg-surface border border-border rounded-lg shadow-xl py-1 z-30 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-2 border-b border-border">
                <p className="text-xs font-semibold text-text-primary">Student Account</p>
                <p className="text-[10px] text-text-muted truncate">{userEmail}</p>
              </div>
              <button
                onClick={handleLoadMock}
                className="w-full px-4 py-2 text-left text-xs hover:bg-surface-elevated text-brand font-semibold transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Calendar className="h-3.5 w-3.5" />
                Load Mock Data
              </button>
              <button
                onClick={handleResetData}
                className="w-full px-4 py-2 text-left text-xs hover:bg-surface-elevated text-danger font-semibold transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Settings className="h-3.5 w-3.5" />
                Reset Local Data
              </button>
              <div className="border-t border-border my-1" />
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-xs hover:bg-surface-elevated text-text-primary transition-colors flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          )}
        </header>

        {/* Page Content Layout */}
        <main className="flex-1 px-4 py-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full pb-24 md:pb-8">
          <ErrorBoundary fallbackTitle="An error occurred while loading this view">
            <Outlet />
          </ErrorBoundary>
        </main>

        {/* 3. MOBILE BOTTOM NAVIGATION (hidden on desktop) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-border flex items-center justify-around px-2 z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.1)]">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full py-1 text-center select-none',
                  isActive ? 'text-brand font-semibold' : 'text-text-secondary'
                )}
              >
                <Icon className={cn('h-5 w-5 mb-0.5', isActive ? 'text-brand' : 'text-text-secondary')} />
                <span className="text-[10px] tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

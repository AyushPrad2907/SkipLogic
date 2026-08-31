import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  GraduationCap,
  History,
  TrendingUp,
  Sparkles,
  LogOut,
  Edit3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useToast } from '@/providers/ToastProvider';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { getStoredStudentName, updateStudentName } from '@/lib/userProfile';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [profileOpen, setProfileOpen] = useState(false);
  const [studentName, setStudentName] = useState<string>(() => getStoredStudentName() || 'Student');
  const [userEmail, setUserEmail] = useState<string>('guest@skiplogic.io');
  const [userInitial, setUserInitial] = useState<string>(() => {
    const stored = getStoredStudentName();
    return stored ? stored.charAt(0).toUpperCase() : 'S';
  });

  const [isEditNameModalOpen, setIsEditNameModalOpen] = useState(false);
  const [editNameInput, setEditNameInput] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  useEffect(() => {
    // Initial fetch from supabase or localStorage
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        if (data.user.email) setUserEmail(data.user.email);
        const metaName = data.user.user_metadata?.full_name || data.user.user_metadata?.name;
        const currentStored = getStoredStudentName();
        const effectiveName = metaName || currentStored || '';
        if (effectiveName) {
          setStudentName(effectiveName);
          setUserInitial(effectiveName.charAt(0).toUpperCase());
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        if (session.user.email) setUserEmail(session.user.email);
        const metaName = session.user.user_metadata?.full_name || session.user.user_metadata?.name;
        const currentStored = getStoredStudentName();
        const effectiveName = metaName || currentStored || '';
        if (effectiveName) {
          setStudentName(effectiveName);
          setUserInitial(effectiveName.charAt(0).toUpperCase());
        }
      }
    });

    // Listen for custom name changed events
    const handleNameChanged = (e: CustomEvent<string>) => {
      if (e.detail) {
        setStudentName(e.detail);
        setUserInitial(e.detail.charAt(0).toUpperCase());
      }
    };

    window.addEventListener('skiplogic_name_changed' as any, handleNameChanged);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('skiplogic_name_changed' as any, handleNameChanged);
    };
  }, []);

  const handleSaveName = async () => {
    if (!editNameInput.trim()) return;
    setIsSavingName(true);
    try {
      const updated = await updateStudentName(editNameInput.trim());
      setStudentName(updated);
      setUserInitial(updated.charAt(0).toUpperCase());
      showToast({
        title: 'Name Updated',
        message: `Your name is now set to ${updated}.`,
        type: 'success',
      });
      setIsEditNameModalOpen(false);
    } catch {
      showToast({
        title: 'Update Failed',
        message: 'Could not update name.',
        type: 'danger',
      });
    } finally {
      setIsSavingName(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col md:flex-row">
      {/* 1. DESKTOP SIDEBAR NAVIGATION */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-surface shrink-0 h-screen sticky top-0">
        
        {/* Brand Header */}
        <div className="p-6 border-b border-border/80 flex items-center justify-between">
          <Link to="/app" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-brand to-sky-400 flex items-center justify-center text-background shadow-[0_0_15px_rgba(0,210,255,0.35)] group-hover:scale-105 transition-transform duration-200">
              <Sparkles className="h-4 w-4 text-background" />
            </div>
            <span className="font-mono font-black text-2xl tracking-tight bg-gradient-to-r from-brand via-sky-400 to-indigo-400 bg-clip-text text-transparent">
              SkipLogic
            </span>
          </Link>
          <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-brand/15 text-brand border border-brand/30 shadow-xs">
            RADAR
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
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 select-none active:scale-98',
                  isActive
                    ? 'bg-brand text-background font-bold shadow-[0_0_16px_rgba(0,210,255,0.25)] border border-brand/50'
                    : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-background' : 'text-text-muted')} />
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
              className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-surface-elevated transition-colors text-left border border-transparent hover:border-border cursor-pointer select-none"
            >
              <div className="h-9 w-9 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center text-brand font-bold text-sm shadow-xs">
                {userInitial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-text-primary truncate">{studentName}</p>
                <p className="text-xs text-text-muted truncate font-mono">{userEmail}</p>
              </div>
            </button>

            {/* Profile Dropdown Context Menu */}
            {profileOpen && (
              <div className="absolute bottom-full left-0 w-full mb-2 bg-surface/95 backdrop-blur-xl border border-border/80 rounded-xl shadow-2xl py-1.5 z-30 animate-in fade-in slide-in-from-bottom-2">
                <button
                  onClick={() => {
                    setEditNameInput(studentName === 'Student' ? '' : studentName);
                    setIsEditNameModalOpen(true);
                    setProfileOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-xs hover:bg-surface-elevated text-text-primary font-medium transition-colors flex items-center gap-2.5 cursor-pointer"
                >
                  <Edit3 className="h-4 w-4 text-brand" />
                  Edit Name
                </button>
                <Link
                  to="/app/semester"
                  onClick={() => setProfileOpen(false)}
                  className="w-full px-4 py-2 text-left text-xs hover:bg-surface-elevated text-text-primary font-medium transition-colors flex items-center gap-2.5"
                >
                  <GraduationCap className="h-4 w-4 text-brand" />
                  Semester Settings
                </Link>
                <Link
                  to="/app/history"
                  onClick={() => setProfileOpen(false)}
                  className="w-full px-4 py-2 text-left text-xs hover:bg-surface-elevated text-text-primary font-medium transition-colors flex items-center gap-2.5"
                >
                  <History className="h-4 w-4 text-brand" />
                  Attendance History
                </Link>
                <div className="border-t border-border/60 my-1" />
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-xs hover:bg-danger-muted text-danger font-bold transition-colors flex items-center gap-2.5 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* 2. MOBILE TOP NAVIGATION & CONTENT SHELL */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Mobile Header Bar (Frosted Glass & Sticky) */}
        <header className="md:hidden h-14 bg-surface/85 backdrop-blur-xl border-b border-border px-4 flex items-center justify-between sticky top-0 z-30 transition-all">
          <Link to="/app" className="flex items-center gap-2 active:scale-95 transition-transform">
            <span className="font-mono font-black text-xl tracking-tight bg-gradient-to-r from-brand via-sky-400 to-indigo-400 bg-clip-text text-transparent">
              SkipLogic
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="h-8 w-8 rounded-full bg-brand/15 border border-brand/30 flex items-center justify-center text-brand font-bold text-xs active:scale-90 transition-transform cursor-pointer shadow-sm"
              aria-label="User profile"
            >
              {userInitial}
            </button>
          </div>
          
          {/* Mobile Profile Dropdown Overlay */}
          {profileOpen && (
            <div className="absolute top-14 right-4 w-60 bg-surface/95 backdrop-blur-2xl border border-border rounded-xl shadow-2xl py-1.5 z-40 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2.5 border-b border-border">
                <p className="text-xs font-bold text-text-primary">{studentName}</p>
                <p className="text-[11px] font-mono text-text-muted truncate mt-0.5">{userEmail}</p>
              </div>
              
              <div className="py-1">
                <button
                  onClick={() => {
                    setEditNameInput(studentName === 'Student' ? '' : studentName);
                    setIsEditNameModalOpen(true);
                    setProfileOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-xs hover:bg-surface-elevated text-text-primary font-medium transition-colors flex items-center gap-2.5 cursor-pointer"
                >
                  <Edit3 className="h-4 w-4 text-brand" />
                  Edit Name
                </button>
                <Link
                  to="/app/semester"
                  onClick={() => setProfileOpen(false)}
                  className="w-full px-4 py-2 text-left text-xs hover:bg-surface-elevated text-text-primary font-medium transition-colors flex items-center gap-2.5"
                >
                  <GraduationCap className="h-4 w-4 text-brand" />
                  Semester Settings
                </Link>
                <Link
                  to="/app/history"
                  onClick={() => setProfileOpen(false)}
                  className="w-full px-4 py-2 text-left text-xs hover:bg-surface-elevated text-text-primary font-medium transition-colors flex items-center gap-2.5"
                >
                  <History className="h-4 w-4 text-brand" />
                  Attendance History
                </Link>
              </div>

              <div className="border-t border-border my-1" />
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-xs hover:bg-danger-muted text-danger font-bold transition-colors flex items-center gap-2.5 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          )}
        </header>

        {/* Page Content Layout */}
        <main className="flex-1 px-3.5 py-5 sm:px-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full pb-24 md:pb-8">
          <ErrorBoundary fallbackTitle="An error occurred while loading this view">
            <Outlet />
          </ErrorBoundary>
        </main>

        {/* Edit Student Name Modal */}
        <Modal
          isOpen={isEditNameModalOpen}
          onClose={() => setIsEditNameModalOpen(false)}
          title="Edit Student Name"
          description="Your name is personalized on your command center, timetable, and attendance coach."
        >
          <div className="space-y-4 pt-2">
            <div>
              <label htmlFor="studentNameInput" className="block text-xs font-mono font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                Your Name
              </label>
              <input
                id="studentNameInput"
                type="text"
                placeholder="e.g. Ayush Pradhan"
                value={editNameInput}
                onChange={(e) => setEditNameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                className="w-full h-11 px-4 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:border-brand font-sans transition-colors"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={() => setIsEditNameModalOpen(false)}
                disabled={isSavingName}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveName}
                disabled={!editNameInput.trim() || isSavingName}
                isLoading={isSavingName}
              >
                Save Name
              </Button>
            </div>
          </div>
        </Modal>

        {/* 3. MOBILE BOTTOM NAVIGATION (Fast, 5-core-item native feel) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/90 backdrop-blur-xl border-t border-border/80 flex items-center justify-around px-1 z-30 shadow-[0_-8px_20px_rgba(0,0,0,0.08)] pb-[max(env(safe-area-inset-bottom),0px)]">
          {[
            { label: 'Home', path: '/app', icon: LayoutDashboard },
            { label: 'Coach', path: '/app/coach', icon: Sparkles },
            { label: 'Subjects', path: '/app/subjects', icon: BookOpen },
            { label: 'Timetable', path: '/app/timetable', icon: Calendar },
            { label: 'Analytics', path: '/app/analytics', icon: TrendingUp },
          ].map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full py-1 text-center select-none active:scale-90 transition-all duration-150',
                  isActive ? 'text-brand font-bold' : 'text-text-muted hover:text-text-secondary'
                )}
              >
                <div
                  className={cn(
                    'p-1 rounded-xl transition-all',
                    isActive && 'bg-brand/15 text-brand shadow-[0_0_10px_rgba(99,102,241,0.25)]'
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] tracking-tight mt-0.5">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

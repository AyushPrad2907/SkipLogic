import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  Settings,
  GraduationCap,
  History,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { useToast } from '@/providers/ToastProvider';
import { useAttendance } from '@/providers/AttendanceProvider';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const { showToast } = useToast();
  const { resetAllData, loadMockData } = useAttendance();
  const [profileOpen, setProfileOpen] = useState(false);

  const menuItems = [
    { label: 'Dashboard', path: '/app', icon: LayoutDashboard },
    { label: 'Subjects', path: '/app/subjects', icon: BookOpen },
    { label: 'Timetable', path: '/app/timetable', icon: Calendar },
    { label: 'History', path: '/app/history', icon: History },
    { label: 'Semester', path: '/app/semester', icon: GraduationCap },
  ];

  const handleLogoutPlaceholder = () => {
    showToast({
      title: 'Sign Out Attempted',
      message: 'Authentication session management will be added in Phase 3.',
      type: 'info',
    });
    setProfileOpen(false);
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
      title: 'Data Reset',
      message: 'All local attendance data and configurations cleared.',
      type: 'warning',
    });
    setProfileOpen(false);
  };

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col md:flex-row transition-colors duration-200">
      
      {/* 1. DESKTOP SIDEBAR (hidden on mobile) */}
      <aside className="hidden md:flex flex-col w-64 bg-surface border-r border-border shrink-0 sticky top-0 h-screen z-20">
        {/* Sidebar Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-border">
          <Link to="/app" className="flex items-center gap-2">
            <span className="font-mono font-black text-xl tracking-tight bg-gradient-to-r from-brand to-indigo-400 bg-clip-text text-transparent">
              SkipLogic
            </span>
          </Link>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group relative',
                  isActive
                    ? 'bg-brand/10 text-brand border-l-2 border-brand font-semibold'
                    : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                )}
              >
                <Icon className={cn('h-[18px] w-[18px]', isActive ? 'text-brand' : 'text-text-secondary group-hover:text-text-primary')} />
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
                S
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">Student Account</p>
                <p className="text-xs text-text-muted truncate">skipper@skiplogic.io</p>
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
                  onClick={handleLogoutPlaceholder}
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
              S
            </button>
          </div>
          
          {/* Mobile Profile Dropdown Overlay */}
          {profileOpen && (
            <div className="absolute top-16 right-4 w-56 bg-surface border border-border rounded-lg shadow-xl py-1 z-30 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-2 border-b border-border">
                <p className="text-xs font-semibold text-text-primary">Student Account</p>
                <p className="text-[10px] text-text-muted truncate">skipper@skiplogic.io</p>
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
                onClick={handleLogoutPlaceholder}
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
          <Outlet />
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

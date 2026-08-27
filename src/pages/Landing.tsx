import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Calculator,
  Compass,
  ArrowRight,
  ShieldCheck,
  Zap,
  TrendingUp,
  FileSpreadsheet,
  AlertTriangle
} from 'lucide-react';

export const Landing: React.FC = () => {
  return (
    <div className="relative overflow-hidden bg-background">
      {/* Tactical Glow Effect */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-safe/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Hero Section */}
      <section className="relative px-4 pt-20 pb-16 sm:px-6 md:pt-32 md:pb-24 max-w-7xl mx-auto">
        <div className="text-center">
          <Badge variant="safe" className="mb-4 text-xs font-mono uppercase tracking-widest px-3 py-1">
            Phase 1 Foundation Live
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight text-text-primary sm:text-6xl md:text-7xl font-sans max-w-4xl mx-auto leading-[1.1]">
            Don't guess.{' '}
            <span className="bg-gradient-to-r from-brand to-indigo-400 bg-clip-text text-transparent">
              Know whether you can bunk.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-text-secondary sm:text-lg md:text-xl leading-relaxed">
            Your attendance shouldn't be a guessing game. SkipLogic calculates exactly when you can skip, when you should attend, and how to recover when you're below the threshold.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link to="/app">
              <Button size="lg" className="h-12 px-8 flex items-center gap-2 group cursor-pointer">
                Get Started
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="secondary" size="lg" className="h-12 px-8 cursor-pointer">
                See How It Works
              </Button>
            </a>
          </div>
        </div>

        {/* Dashboard Visual Mockup Preview */}
        <div className="mt-16 border border-border bg-surface/50 rounded-xl p-3 shadow-[0_20px_50px_rgba(0,0,0,0.3)] max-w-5xl mx-auto backdrop-blur-sm relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-brand/20 to-indigo-500/20 rounded-xl blur opacity-30 group-hover:opacity-40 transition duration-1000" />
          <div className="relative border border-border bg-background rounded-lg p-4 sm:p-6 overflow-hidden">
            {/* Window header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-6">
              <div className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded-full bg-danger/60" />
                <span className="h-3.5 w-3.5 rounded-full bg-risk/60" />
                <span className="h-3.5 w-3.5 rounded-full bg-safe/60" />
              </div>
              <div className="h-5 w-40 bg-surface-elevated rounded-md border border-border flex items-center justify-center">
                <span className="text-[10px] font-mono text-text-muted">skiplogic.io/app</span>
              </div>
              <div className="w-8" />
            </div>

            {/* Dashboard Mockup Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-safe/30 bg-surface/40 p-4">
                <p className="text-[10px] font-mono text-text-muted uppercase">Mathematics IV</p>
                <div className="flex items-baseline justify-between mt-2">
                  <h3 className="text-xl font-bold font-mono text-safe">80.0%</h3>
                  <Badge variant="safe">SAFE</Badge>
                </div>
                <div className="border-t border-border/40 mt-3 pt-2 text-[10px] text-text-secondary flex justify-between">
                  <span>Bunk Limit:</span>
                  <span className="font-mono font-bold text-safe">2 Classes</span>
                </div>
              </Card>

              <Card className="border-risk/30 bg-surface/40 p-4">
                <p className="text-[10px] font-mono text-text-muted uppercase">DBMS Lecture</p>
                <div className="flex items-baseline justify-between mt-2">
                  <h3 className="text-xl font-bold font-mono text-risk">75.0%</h3>
                  <Badge variant="risk">RISK BOUNDARY</Badge>
                </div>
                <div className="border-t border-border/40 mt-3 pt-2 text-[10px] text-text-secondary flex justify-between">
                  <span>Bunk Limit:</span>
                  <span className="font-mono font-bold text-risk">0 Classes</span>
                </div>
              </Card>

              <Card className="border-danger/30 bg-surface/40 p-4">
                <p className="text-[10px] font-mono text-text-muted uppercase">Operating Systems</p>
                <div className="flex items-baseline justify-between mt-2">
                  <h3 className="text-xl font-bold font-mono text-danger">62.5%</h3>
                  <Badge variant="danger">MUST ATTEND</Badge>
                </div>
                <div className="border-t border-border/40 mt-3 pt-2 text-[10px] text-text-secondary flex justify-between">
                  <span>Recovery Required:</span>
                  <span className="font-mono font-bold text-danger">6 Classes</span>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="border-t border-border py-16 px-4 bg-surface-elevated/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-sm font-semibold uppercase tracking-wider font-mono text-brand">The Student Dilemma</h2>
            <p className="text-3xl font-bold mt-2 text-text-primary">Why general trackers fail you</p>
            <p className="text-sm text-text-secondary mt-3 leading-relaxed">
              Standard attendance tools tell you what your percentage is. They do not help you make decisions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-danger/10 border border-danger/20 text-danger mb-4">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-text-primary">"Can I bunk today?"</h4>
              <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                You want to skip a lecture to catch up on assignments or project deadlines. Traditional trackers make you open a calculator to figure out the math.
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-danger/10 border border-danger/20 text-danger mb-4">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-text-primary">"How many can I skip?"</h4>
              <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                If your attendance is 85%, you have a buffer. But exactly how many lectures can you miss consecutively before slipping below 75%?
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-danger/10 border border-danger/20 text-danger mb-4">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-text-primary">"How do I recover?"</h4>
              <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                Once you drop below the attendance bar, you are at risk. How many consecutive sessions do you need to sit through to recover?
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* The Solution Section */}
      <section className="border-t border-border py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-sm font-semibold uppercase tracking-wider font-mono text-brand">The Solution</h2>
            <p className="text-3xl font-bold mt-2 text-text-primary">SkipLogic Attendance Engine</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex gap-4 items-start">
              <div className="p-2.5 rounded-lg bg-brand/10 border border-brand/20 text-brand mt-1 shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h5 className="font-bold text-sm text-text-primary">Smart Bunk Limit</h5>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">Calculates the buffer count of upcoming classes you can miss while staying above your target percentage.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="p-2.5 rounded-lg bg-brand/10 border border-brand/20 text-brand mt-1 shrink-0">
                <Calculator className="h-5 w-5" />
              </div>
              <div>
                <h5 className="font-bold text-sm text-text-primary">Recovery Calculator</h5>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">Know the exact number of consecutive lectures you must sit through to reach your target threshold.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="p-2.5 rounded-lg bg-brand/10 border border-brand/20 text-brand mt-1 shrink-0">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h5 className="font-bold text-sm text-text-primary">Today's Decisions</h5>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">Provides instantaneous recommendations for each scheduled class today: Safe, Risky, or Must Attend.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="p-2.5 rounded-lg bg-brand/10 border border-brand/20 text-brand mt-1 shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h5 className="font-bold text-sm text-text-primary">Semester Prediction</h5>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">Predicts semester-end attendance outcomes based on current trends and historical skip patterns.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="p-2.5 rounded-lg bg-brand/10 border border-brand/20 text-brand mt-1 shrink-0">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h5 className="font-bold text-sm text-text-primary">AI Timetable Import</h5>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">Import calendars or take photos of notice boards to automatically import schedules (future scope).</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="p-2.5 rounded-lg bg-brand/10 border border-brand/20 text-brand mt-1 shrink-0">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <h5 className="font-bold text-sm text-text-primary">What-If Simulator</h5>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">Simulate future attendances and skips to visually see how your overall score changes before committing.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Diagram */}
      <section id="how-it-works" className="border-t border-border py-16 px-4 bg-surface-elevated/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wider font-mono text-brand">System Architecture</h2>
          <p className="text-2xl font-bold mt-2 text-text-primary mb-12">How SkipLogic works</p>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative">
            <div className="w-full md:w-1/4 flex flex-col items-center">
              <div className="h-16 w-16 rounded-full bg-surface border border-border flex items-center justify-center text-text-primary font-mono text-lg shadow-md font-bold mb-3">
                1
              </div>
              <h6 className="font-bold text-sm">Your Timetable</h6>
              <p className="text-xs text-text-muted mt-1 leading-normal px-4">Upload or configure class slots</p>
            </div>

            <div className="hidden md:block flex-1 h-0.5 bg-gradient-to-r from-brand to-indigo-500 relative top-[-16px]">
              <div className="absolute right-0 top-1/2 -translate-y-1/2 border-solid border-r-indigo-500 border-r-8 border-y-transparent border-y-4 border-l-0" />
            </div>

            <div className="w-full md:w-1/4 flex flex-col items-center">
              <div className="h-16 w-16 rounded-full bg-surface border border-border flex items-center justify-center text-text-primary font-mono text-lg shadow-md font-bold mb-3">
                2
              </div>
              <h6 className="font-bold text-sm">Attendance Logs</h6>
              <p className="text-xs text-text-muted mt-1 leading-normal px-4">Log attended and skipped classes</p>
            </div>

            <div className="hidden md:block flex-1 h-0.5 bg-gradient-to-r from-indigo-500 to-brand relative top-[-16px]">
              <div className="absolute right-0 top-1/2 -translate-y-1/2 border-solid border-r-brand border-r-8 border-y-transparent border-y-4 border-l-0" />
            </div>

            <div className="w-full md:w-1/4 flex flex-col items-center">
              <div className="h-16 w-16 rounded-full bg-brand/10 border border-brand/30 flex items-center justify-center text-brand font-mono text-lg shadow-md font-bold mb-3">
                3
              </div>
              <h6 className="font-bold text-sm">SkipLogic Engine</h6>
              <p className="text-xs text-text-muted mt-1 leading-normal px-4">Calculates thresholds & limits</p>
            </div>

            <div className="hidden md:block flex-1 h-0.5 bg-gradient-to-r from-brand to-safe relative top-[-16px]">
              <div className="absolute right-0 top-1/2 -translate-y-1/2 border-solid border-r-safe border-r-8 border-y-transparent border-y-4 border-l-0" />
            </div>

            <div className="w-full md:w-1/4 flex flex-col items-center">
              <div className="h-16 w-16 rounded-full bg-safe-muted border border-safe/30 flex items-center justify-center text-safe font-mono text-lg shadow-md font-bold mb-3">
                4
              </div>
              <h6 className="font-bold text-sm">Clear Decisions</h6>
              <p className="text-xs text-text-muted mt-1 leading-normal px-4">Tells you if you can skip today</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="border-t border-border py-16 px-4">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-2xl font-bold text-text-primary">Take control of your calendar</h2>
          <p className="text-sm text-text-secondary mt-3 mb-8">
            Set up your current semester details and target attendance values in under 3 minutes.
          </p>
          <Link to="/app">
            <Button size="lg" className="w-full sm:w-auto h-12 px-10 cursor-pointer">
              Launch Application
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

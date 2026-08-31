import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { buildCoachContext } from '@/lib/ai/coachContext';
import { sendCoachQuestion } from '@/services/coachClient';
import { CoachResponseContract } from '@/lib/ai/coachService';
import {
  Sparkles,
  Send,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
  Bot,
  User,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChatMessage {
  id: string;
  sender: 'USER' | 'COACH';
  text: string;
  timestamp: string;
  data?: CoachResponseContract;
}

const QUICK_QUESTIONS = [
  'Can I bunk tomorrow?',
  'Which class should I attend today?',
  'Why is my attendance risky?',
  'How many classes to recover?',
  'What if I miss 3 classes?',
  'How am I doing this semester?',
];

import { useAttendance } from '@/providers/AttendanceProvider';

export const AIAttendanceCoach: React.FC = () => {
  const { viewModel: dashboard } = useDashboardData();
  const { subjects, timetable, settings, holidays } = useAttendance();
  const { viewModel: analytics } = useAnalyticsData();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'COACH',
      text: 'Hello! I am your SkipLogic AI Attendance Coach. Ask me anything about your attendance eligibility, bunk limits, recovery requirements, or semester trajectory.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputQuestion, setInputQuestion] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  const handleSend = async (questionToSend?: string) => {
    const query = (questionToSend || inputQuestion).trim();
    if (!query || isProcessing) return;

    const userMsg: ChatMessage = {
      id: `usr-${crypto.randomUUID()}`,
      sender: 'USER',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setIsProcessing(true);

    try {
      // Build question-aware context from canonical SkipLogic engines
      const context = buildCoachContext(dashboard, analytics, subjects, timetable, settings, holidays, {
        currentDateStr: dashboard.todayClasses[0] ? undefined : undefined,
      });

      // Call server-side API boundary
      const coachResponse = await sendCoachQuestion(query, context);

      const coachMsg: ChatMessage = {
        id: `ai-${crypto.randomUUID()}`,
        sender: 'COACH',
        text: coachResponse.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        data: coachResponse,
      };

      setMessages((prev) => [...prev, coachMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `err-${crypto.randomUUID()}`,
        sender: 'COACH',
        text: 'I ran into an issue connecting to the AI Coach service. Please try again in a moment.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'msg-welcome',
        sender: 'COACH',
        text: 'Conversation cleared. How can I help protect your attendance today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <Card variant="glass" className="p-0 border-border/80 overflow-hidden flex flex-col h-[650px] shadow-2xl">
      {/* 1. Header */}
      <div className="p-4 bg-surface/90 border-b border-border/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand to-sky-400 flex items-center justify-center text-background shadow-[0_0_12px_rgba(0,210,255,0.3)]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black tracking-tight text-text-primary">AI Attendance Coach</h3>
              <Badge variant="safe" className="text-[9px] font-mono py-0.5 px-2 font-bold uppercase">
                FACT-CHECKED
              </Badge>
            </div>
            <p className="text-xs text-text-muted">
              Real-time attendance trajectory intelligence & bunk advisory.
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleClearHistory}
          className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1.5 cursor-pointer rounded-xl"
        >
          <Trash2 className="h-3.5 w-3.5" /> Clear
        </Button>
      </div>

      {/* 2. Messages List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-surface-elevated/20">
        {messages.map((msg) => {
          const isCoach = msg.sender === 'COACH';
          return (
            <div
              key={msg.id}
              className={cn('flex gap-3 max-w-[88%]', isCoach ? 'mr-auto' : 'ml-auto flex-row-reverse')}
            >
              {/* Avatar */}
              <div
                className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-1',
                  isCoach
                    ? 'bg-brand text-white'
                    : 'bg-surface-elevated border border-border text-text-primary'
                )}
              >
                {isCoach ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={cn(
                  'p-3.5 rounded-2xl text-xs space-y-2 leading-relaxed font-sans shadow-sm',
                  isCoach
                    ? 'bg-surface border border-border/80 text-text-primary rounded-tl-none'
                    : 'bg-brand text-white rounded-tr-none'
                )}
              >
                <div className="flex items-center justify-between gap-4 text-[10px] opacity-75 font-mono mb-1">
                  <span className="font-bold">{isCoach ? 'AI Coach' : 'You'}</span>
                  <span>{msg.timestamp}</span>
                </div>

                <p className="whitespace-pre-wrap">{msg.text}</p>

                {/* Additional Structured Telemetry from AI Contract */}
                {msg.data && (
                  <div className="pt-2 border-t border-border/40 space-y-2 mt-2 font-sans">
                    {/* Recommendation Box */}
                    {msg.data.recommendation && (
                      <div className="p-2.5 bg-brand/10 border border-brand/20 rounded-lg text-brand font-semibold flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] font-mono uppercase block font-bold">
                            Coach Recommendation
                          </span>
                          <span className="text-xs">{msg.data.recommendation}</span>
                        </div>
                      </div>
                    )}

                    {/* Warnings Box */}
                    {msg.data.warnings && msg.data.warnings.length > 0 && (
                      <div className="p-2.5 bg-danger/10 border border-danger/20 rounded-lg text-danger flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] font-mono uppercase block font-bold">
                            Attendance Risk Notice
                          </span>
                          <ul className="list-disc list-inside text-xs space-y-0.5">
                            {msg.data.warnings.map((w, idx) => (
                              <li key={idx}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Facts Used Chips */}
                    {msg.data.factsUsed && msg.data.factsUsed.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[9px] font-mono text-text-muted uppercase font-bold">
                          Facts Evaluated:
                        </span>
                        {msg.data.factsUsed.map((fact, idx) => (
                          <span
                            key={idx}
                            className="text-[9px] font-mono bg-surface-elevated border border-border px-1.5 py-0.5 rounded text-text-secondary"
                          >
                            {fact}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isProcessing && (
          <div className="flex items-center gap-3 mr-auto">
            <div className="h-8 w-8 rounded-full bg-brand text-white flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 animate-spin" />
            </div>
            <div className="p-3 bg-surface border border-border/80 rounded-2xl text-xs text-text-muted flex items-center gap-2">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-brand" />
              Evaluating canonical attendance facts...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Quick Question Chips */}
      <div className="p-3 bg-surface/90 border-t border-border/80 overflow-x-auto flex items-center gap-2 no-scrollbar">
        <span className="text-[10px] font-mono font-bold uppercase text-brand shrink-0 flex items-center gap-1">
          <HelpCircle className="h-3.5 w-3.5 text-brand" /> Quick Ask:
        </span>
        {QUICK_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => handleSend(q)}
            disabled={isProcessing}
            className="px-3 py-1.5 rounded-xl bg-surface-elevated/80 border border-border text-[11px] font-medium text-text-secondary hover:text-brand hover:border-brand/40 active:scale-95 transition-all duration-150 whitespace-nowrap cursor-pointer disabled:opacity-50 shrink-0 shadow-2xs"
          >
            {q}
          </button>
        ))}
      </div>

      {/* 4. Input Controls */}
      <div className="p-3 bg-surface/90 border-t border-border flex items-center gap-2">
        <input
          type="text"
          value={inputQuestion}
          onChange={(e) => setInputQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask a question about your attendance (e.g. Can I bunk tomorrow?)"
          disabled={isProcessing}
          className="flex-1 h-11 px-4 rounded-xl border border-border/80 bg-surface-elevated/60 text-text-primary text-xs focus:outline-none focus:border-brand font-sans placeholder:text-text-muted transition-colors"
        />
        <Button
          onClick={() => handleSend()}
          disabled={!inputQuestion.trim() || isProcessing}
          className="h-11 px-5 flex items-center gap-2 cursor-pointer shrink-0 font-bold"
        >
          <Send className="h-4 w-4" /> Send
        </Button>
      </div>

      {/* 5. Safety Read-Only Footer */}
      <div className="bg-surface-elevated/60 px-4 py-1.5 border-t border-border/40 flex items-center justify-between text-[10px] text-text-muted font-mono">
        <span className="flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-safe" />
          Read-Only AI: Cannot modify attendance logs or subjects.
        </span>
        <span>SkipLogic Phase 14 AI Engine</span>
      </div>
    </Card>
  );
};

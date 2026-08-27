import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/providers/ThemeProvider';
import { Button } from '@/components/ui/Button';

export const ThemeToggle: React.FC = () => {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="w-10 h-10 p-0 rounded-lg flex items-center justify-center border border-transparent hover:border-border hover:bg-surface-elevated text-text-secondary hover:text-text-primary"
      aria-label="Toggle visual theme"
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="h-[18px] w-[18px] text-yellow-400 transition-all rotate-0 scale-100" />
      ) : (
        <Moon className="h-[18px] w-[18px] text-slate-700 transition-all rotate-0 scale-100" />
      )}
    </Button>
  );
};

import { useState } from 'react';
import { SAMPLE_QUERIES } from '@/lib/queryAnalyzer';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Play, Sparkles, RotateCcw } from 'lucide-react';

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onAnalyze: () => void;
}

const SqlEditor = ({ value, onChange, onAnalyze }: SqlEditorProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          SQL Query Input
        </h2>
        <div className="flex gap-2">
          {SAMPLE_QUERIES.map((sq) => (
            <button
              key={sq.label}
              onClick={() => onChange(sq.query)}
              className="rounded-md border border-border bg-secondary px-2.5 py-1 text-xs text-secondary-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {sq.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter your SQL query here... e.g. SELECT * FROM sales;"
          className="min-h-[160px] resize-none rounded-lg border-border bg-muted font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
        />
        <div className="absolute bottom-3 right-3 flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange('')}
            className="text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Clear
          </Button>
          <Button
            size="sm"
            onClick={onAnalyze}
            disabled={!value.trim()}
            className="bg-primary text-primary-foreground glow-primary hover:opacity-90"
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Analyze
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SqlEditor;

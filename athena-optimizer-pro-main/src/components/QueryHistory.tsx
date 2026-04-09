import { useState } from 'react';
import { AnalysisResult } from '@/lib/queryAnalyzer';
import { History, ChevronDown, ChevronUp, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface HistoryEntry {
  id: string;
  query: string;
  result: AnalysisResult;
  timestamp: Date;
}

interface QueryHistoryProps {
  entries: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onClear: () => void;
}

const QueryHistory = ({ entries, onSelect, onClear }: QueryHistoryProps) => {
  const [expanded, setExpanded] = useState(true);

  if (entries.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          <History className="h-4 w-4" />
          Query History ({entries.length})
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Clear
        </Button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2">
          {entries.map((entry) => {
            const savings = entry.result.originalEstimate.dataScannedGB > 0
              ? Math.round(((entry.result.originalEstimate.dataScannedGB - entry.result.optimizedEstimate.dataScannedGB) / entry.result.originalEstimate.dataScannedGB) * 100)
              : 0;

            return (
              <button
                key={entry.id}
                onClick={() => onSelect(entry)}
                className="w-full rounded-lg border border-border bg-muted p-3 text-left transition-all hover:border-primary/40 hover:bg-muted/80"
              >
                <div className="flex items-start justify-between gap-3">
                  <pre className="flex-1 truncate font-mono text-xs text-foreground">
                    {entry.query}
                  </pre>
                  <div className="flex flex-shrink-0 items-center gap-3">
                    {entry.result.issues.length > 0 && (
                      <span className="rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-bold text-warning">
                        {entry.result.issues.length} issues
                      </span>
                    )}
                    {savings > 0 && (
                      <span className="rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-bold text-success">
                        {savings}% savings
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {entry.timestamp.toLocaleTimeString()}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default QueryHistory;

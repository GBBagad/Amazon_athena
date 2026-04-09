import { useEffect, useState } from 'react';
import { History, Clock, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface HistoryEntry {
  id: number;
  query_text: string;
  execution_time_ms: number;
  data_scanned_bytes: number;
  cost: number;
  status: string;
  timestamp: string;
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8000/get-history')
      .then(r => r.json())
      .then(data => {
         setEntries(data.history || []);
      })
      .catch(err => {
         console.error('Failed to load history', err);
      })
      .finally(() => {
         setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Query History</h1>
          <p className="mt-1 text-sm text-muted-foreground">Browse all manually executed queries globally.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
            <Loader2 className="animate-spin text-primary h-8 w-8" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <History className="mb-4 h-12 w-12 text-muted-foreground/30" />
          <p className="text-lg font-medium text-muted-foreground">No history yet</p>
          <p className="mt-1 text-sm text-muted-foreground/60">Executed queries via Live Query will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
              <div
                key={entry.id}
                className="w-full rounded-xl border border-border bg-card p-5 text-left flex flex-col hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <pre className="truncate font-mono text-sm text-foreground">{entry.query_text}</pre>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(entry.timestamp).toLocaleString()}
                      </div>
                      
                      {entry.status === 'SUCCEEDED' ? (
                          <span className="rounded bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success border border-success/20">
                            {entry.status}
                          </span>
                      ) : (
                          <span className="rounded bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive border border-destructive/20">
                            {entry.status}
                          </span>
                      )}

                      <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                          {(entry.execution_time_ms / 1000).toFixed(2)}s
                      </span>
                      <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-500">
                          ${entry.cost.toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
          ))}
        </div>
      )}
    </div>
  );
}

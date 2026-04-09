import { useEffect, useState } from 'react';
import { AnalysisResult } from '@/lib/queryAnalyzer';
import ComparisonDashboard from '@/components/ComparisonDashboard';
import SuggestionsPanel from '@/components/SuggestionsPanel';
import { BarChart3, Clock, Database, HardDrive, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useQueryState } from '@/contexts/QueryContext';

interface StoredResult {
  id: string;
  query: string;
  result: AnalysisResult;
  timestamp: string;
}

export default function Results() {
  const { latestResult, latestQuery } = useQueryState();
  const [latestAnalysis, setLatestAnalysis] = useState<StoredResult | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const raw = sessionStorage.getItem('athena_latest');
    if (raw) setLatestAnalysis(JSON.parse(raw));
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatMs = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const estimateCost = (bytes: number): string => {
    const tb = bytes / (1024 ** 4);
    const cost = Math.max(tb * 5, 0);
    return cost < 0.01 ? '< $0.01' : `$${cost.toFixed(4)}`;
  };

  if (!latestResult && !latestAnalysis) {
    return (
      <div className="flex flex-col items-center justify-center p-6 py-32 text-center">
        <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground/30" />
        <p className="text-lg font-medium text-muted-foreground">No results yet</p>
        <p className="mt-1 text-sm text-muted-foreground/60">Execute a live query or analyze a query first.</p>
        <div className="mt-6 flex gap-3 justify-center">
           <Button onClick={() => navigate('/live-query')}>Live Query</Button>
           <Button variant="outline" onClick={() => navigate('/analyzer')}>Analyzer</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Latest Results</h1>
        <p className="mt-1 text-sm text-muted-foreground">Recent query execution or analysis details.</p>
      </div>

      {latestResult && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold border-b border-border pb-2 text-foreground">Live Query Execution</h2>
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Executed Query</h2>
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm text-foreground">{latestQuery}</pre>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              { icon: CheckCircle2, label: 'Status', value: latestResult.state, color: 'text-green-400' },
              { icon: Clock, label: 'Execution Time', value: formatMs(latestResult.executionTimeMs), color: 'text-primary' },
              { icon: HardDrive, label: 'Data Scanned', value: formatBytes(latestResult.dataScannedBytes), color: 'text-primary' },
              { icon: Database, label: 'Est. Cost', value: estimateCost(latestResult.dataScannedBytes), color: 'text-amber-400' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                  {label}
                </div>
                <p className="text-lg font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </div>
          
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-secondary">
                  <tr>
                    {latestResult.columns.map((col, i) => (
                      <th key={i} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {latestResult.rows.length === 0 ? (
                    <tr><td colSpan={latestResult.columns.length} className="px-4 py-8 text-center text-muted-foreground">No results returned</td></tr>
                  ) : (
                    latestResult.rows.map((row, ri) => (
                      <tr key={ri} className="border-t border-border hover:bg-muted/50 transition-colors">
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-4 py-2 text-foreground whitespace-nowrap">{cell || <span className="text-muted-foreground italic">null</span>}</td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border bg-secondary/50 px-4 py-2 text-xs text-muted-foreground">
              {latestResult.rows.length} row{latestResult.rows.length !== 1 ? 's' : ''} • Query ID: {latestResult.queryExecutionId}
            </div>
          </div>
        </div>
      )}

      {latestAnalysis && (
        <div className="space-y-6 mt-12 border-t border-border pt-8">
          <h2 className="text-lg font-semibold border-b border-border pb-2 text-foreground">Latest Analysis</h2>
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Analyzed Query</h2>
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm text-foreground">{latestAnalysis.query}</pre>
            <p className="mt-2 text-xs text-muted-foreground">Analyzed at {new Date(latestAnalysis.timestamp).toLocaleString()}</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-6">
              <SuggestionsPanel issues={latestAnalysis.result.issues} />
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <ComparisonDashboard
                originalEstimate={latestAnalysis.result.originalEstimate}
                optimizedEstimate={latestAnalysis.result.optimizedEstimate}
                optimizedQuery={latestAnalysis.result.optimizedQuery}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

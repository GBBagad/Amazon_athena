import { useState } from 'react';
import { analyzeQuery, AnalysisResult } from '@/lib/queryAnalyzer';
import SqlEditor from '@/components/SqlEditor';
import SuggestionsPanel from '@/components/SuggestionsPanel';
import ComparisonDashboard from '@/components/ComparisonDashboard';
import QueryHistory, { HistoryEntry } from '@/components/QueryHistory';
import { Database, Zap } from 'lucide-react';

const Index = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const handleAnalyze = () => {
    if (!query.trim()) return;
    const analysis = analyzeQuery(query);
    setResult(analysis);

    // Add to history (avoid duplicates of the exact same query)
    setHistory((prev) => {
      const exists = prev.some((e) => e.query === query.trim());
      if (exists) return prev;
      return [
        { id: crypto.randomUUID(), query: query.trim(), result: analysis, timestamp: new Date() },
        ...prev,
      ].slice(0, 20); // keep last 20
    });
  };

  const handleSelectHistory = (entry: HistoryEntry) => {
    setQuery(entry.query);
    setResult(entry.result);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center gap-3 px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 glow-primary">
            <Database className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              Athena Query Optimizer
            </h1>
            <p className="text-xs text-muted-foreground">
              Intelligent SQL optimization for Amazon Athena
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1">
            <Zap className="h-3.5 w-3.5 text-primary animate-pulse-glow" />
            <span className="text-xs font-medium text-primary">$5/TB pricing</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto space-y-6 px-6 py-8">
        {/* Editor */}
        <div className="rounded-xl border border-border bg-card p-6">
          <SqlEditor value={query} onChange={setQuery} onAnalyze={handleAnalyze} />
        </div>

        {/* Results */}
        {result && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-6">
              <SuggestionsPanel issues={result.issues} />
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <ComparisonDashboard
                originalEstimate={result.originalEstimate}
                optimizedEstimate={result.optimizedEstimate}
                optimizedQuery={result.optimizedQuery}
              />
            </div>
          </div>
        )}

        {/* Query History */}
        <QueryHistory
          entries={history}
          onSelect={handleSelectHistory}
          onClear={() => setHistory([])}
        />

        {/* Empty State */}
        {!result && history.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
            <Database className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-lg font-medium text-muted-foreground">
              Enter a SQL query to get started
            </p>
            <p className="mt-1 text-sm text-muted-foreground/60">
              Try a sample query above or write your own
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;

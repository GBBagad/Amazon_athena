import { useState } from 'react';
import { AnalysisResult } from '@/lib/queryAnalyzer';
import SqlEditor from '@/components/SqlEditor';
import SuggestionsPanel from '@/components/SuggestionsPanel';
import ComparisonDashboard from '@/components/ComparisonDashboard';
import { Database, Loader2, Play, CheckCircle2, AlertTriangle, HardDrive, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function Analyzer() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [execResult, setExecResult] = useState<any>(null);
  const [execError, setExecError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!query.trim()) return;
    setIsAnalyzing(true);
    
    try {
      const response = await fetch('http://localhost:8000/optimize-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      
      if (!response.ok) throw new Error('Optimization API failed');
      const data = await response.json();
      
      const issues = (data.suggestions || []).map((s: string, i: number) => ({
         id: `insight-${i}`,
         severity: (s.includes('SELECT *') || s.includes('Missing WHERE') || s.includes('Avoid')) ? 'warning' : 'info',
         title: 'Optimization Insight',
         description: s,
         suggestion: s
      }));

      const syntheticResult: AnalysisResult = {
         issues,
         optimizedQuery: data.optimizedQuery,
         originalEstimate: data.originalEstimate || { dataScannedGB: 50.0, costUSD: 0.25, estimatedTimeSeconds: 15 },
         optimizedEstimate: data.optimizedEstimate || { dataScannedGB: 5.0, costUSD: 0.02, estimatedTimeSeconds: 3 }
      };

      setResult(syntheticResult);
      setExecResult(null);
      setExecError(null);

      const stored = JSON.parse(sessionStorage.getItem('athena_results') || '[]');
      const entry = { id: crypto.randomUUID(), query: query.trim(), result: syntheticResult, timestamp: new Date().toISOString() };
      sessionStorage.setItem('athena_results', JSON.stringify([entry, ...stored].slice(0, 50)));
      sessionStorage.setItem('athena_latest', JSON.stringify(entry));
      
      toast.success('Query analyzed via Gemini');
    } catch (e: any) {
      toast.error(e.message || 'Error executing Gemini optimization.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExecute = async () => {
      if (!result?.optimizedQuery) return;
      setIsExecuting(true);
      setExecError(null);
      setExecResult(null);
      try {
          const response = await fetch('http://localhost:8000/run-query', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  query: result.optimizedQuery,
                  database: 'default',
                  outputLocation: 's3://athena-query-results-bucket/',
                  region: 'us-east-1'
              })
          });
          if (!response.ok) {
              const err = await response.json();
              throw new Error(err.detail || 'Execution failed');
          }
          const data = await response.json();
          setExecResult(data);
          toast.success("Optimized query executed successfully");
      } catch (e: any) {
          setExecError(e.message);
          toast.error(e.message);
      } finally {
          setIsExecuting(false);
      }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Query Analyzer</h1>
        <p className="mt-1 text-sm text-muted-foreground">Paste your SQL query to get Gemini AI optimization suggestions.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 relative">
         {isAnalyzing && (
            <div className="absolute inset-0 bg-background/50 z-10 flex items-center justify-center rounded-xl backdrop-blur-sm">
               <div className="bg-card border border-border p-4 flex items-center gap-3 rounded-lg shadow-xl">
                 <Loader2 className="animate-spin text-primary h-5 w-5" />
                 <span className="font-medium text-foreground">Gemini is analyzing...</span>
               </div>
            </div>
         )}
        <SqlEditor value={query} onChange={setQuery} onAnalyze={handleAnalyze} />
      </div>

      {result && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-6">
              <SuggestionsPanel issues={result.issues} />
            </div>
            <div className="rounded-xl border border-border bg-card p-6 flex flex-col">
              <ComparisonDashboard
                originalEstimate={result.originalEstimate}
                optimizedEstimate={result.optimizedEstimate}
                optimizedQuery={result.optimizedQuery}
              />
              <div className="mt-6 flex justify-end">
                  <Button onClick={handleExecute} disabled={isExecuting} className="bg-primary text-primary-foreground glow-primary">
                      {isExecuting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                      {isExecuting ? "Executing..." : "Execute Optimized Query"}
                  </Button>
              </div>
            </div>
          </div>
          
          {/* Execution Result Panel */}
          {execError && (
             <div className="animate-slide-up flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
               <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive shrink-0" />
               <div>
                  <p className="text-sm font-medium text-destructive">Query Failed</p>
                  <p className="mt-1 text-xs text-muted-foreground">{execError}</p>
               </div>
             </div>
          )}
          {execResult && (
             <div className="animate-slide-up rounded-xl border border-border bg-card p-6 space-y-4 shadow-sm">
                 <h2 className="text-md font-semibold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    Execution Results
                 </h2>
                 <div className="overflow-x-auto max-h-[300px] overflow-y-auto border border-border rounded-lg">
                    <table className="w-full text-sm">
                       <thead className="sticky top-0 bg-secondary">
                          <tr>
                             {execResult.columns.map((col: string, i: number) => (
                               <th key={i} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{col}</th>
                             ))}
                          </tr>
                       </thead>
                       <tbody>
                          {execResult.rows.map((row: any[], ri: number) => (
                             <tr key={ri} className="border-t border-border hover:bg-muted/50 transition-colors">
                                {row.map((cell, ci) => (
                                  <td key={ci} className="px-4 py-2 whitespace-nowrap text-foreground">{cell || <span className="italic text-muted-foreground">null</span>}</td>
                                ))}
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
                 <div className="flex items-center gap-6 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><HardDrive className="h-4 w-4 text-primary"/> Data Scanned: {(execResult.dataScannedBytes / 1024 / 1024).toFixed(2)} MB</span>
                    <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-primary"/> Exec Time: {execResult.executionTimeMs} ms</span>
                    <span className="flex items-center gap-1.5"><Database className="h-4 w-4 text-amber-500"/> Cost: ${execResult.cost.toFixed(6)}</span>
                 </div>
             </div>
          )}
        </div>
      )}

      {!result && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <Database className="mb-4 h-12 w-12 text-muted-foreground/30" />
          <p className="text-lg font-medium text-muted-foreground">Enter a SQL query</p>
          <p className="mt-1 text-sm text-muted-foreground/60">Upload your query to Gemini AI for deep analysis</p>
        </div>
      )}
    </div>
  );
}

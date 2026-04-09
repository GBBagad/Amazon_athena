import { Database, Search, BarChart3, History, TrendingDown, Zap, DollarSign, Clock, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryState } from '@/contexts/QueryContext';



const quickActions = [
  { title: 'Execute Live Query', description: 'Run Athena queries manually and track their cost', icon: Database, route: '/live-query' },
  { title: 'Query Analyzer', description: 'Paste SQL and get instant optimization suggestions', icon: Search, route: '/analyzer' },
  { title: 'Latest Results', description: 'See output of the most recent live query execution', icon: BarChart3, route: '/results' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { queryCount, totalCost, totalDataScanned, totalExecutionTimeMs, isRunning } = useQueryState();

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatMs = (ms: number): string => {
    if (ms === 0) return '0ms';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const avgTime = queryCount > 0 ? totalExecutionTimeMs / queryCount : 0;

  const stats = [
    { label: 'Queries Executed', value: queryCount.toString(), icon: Database, color: 'text-primary' },
    { label: 'Total Cost', value: queryCount > 0 && totalCost < 0.01 ? '< $0.01' : `$${totalCost.toFixed(4)}`, icon: DollarSign, color: 'text-amber-500' },
    { label: 'Data Scanned', value: formatBytes(totalDataScanned), icon: Search, color: 'text-blue-500' },
    { label: 'Avg Execution Time', value: formatMs(avgTime), icon: Clock, color: 'text-warning' },
  ];

  return (
    <div className="space-y-8 p-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome to Athena Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Intelligent SQL execution and optimization for Amazon Athena.</p>
      </div>

      {/* Stats */}
      {isRunning && (
        <div className="flex items-center gap-2 text-sm text-primary animate-pulse bg-primary/10 w-fit px-4 py-2 rounded-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
          A query is currently executing...
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${s.color}`} />
                <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground">{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.title}
                onClick={() => navigate(action.route)}
                className="group rounded-xl border border-border bg-card p-6 text-left transition-all hover:border-primary/40 hover:glow-primary"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-4 font-semibold text-foreground group-hover:text-primary transition-colors">{action.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tip */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
        <div className="flex items-start gap-3">
          <Zap className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <p className="font-medium text-foreground">Pro Tip</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Start by analyzing a query in the <span className="text-primary font-medium cursor-pointer" onClick={() => navigate('/analyzer')}>Query Analyzer</span>. 
              Use partition filters and avoid SELECT * to save up to 90% on Athena costs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { CostEstimate } from '@/lib/queryAnalyzer';
import { ArrowDown, DollarSign, Clock, Database } from 'lucide-react';

interface ComparisonDashboardProps {
  originalEstimate: CostEstimate;
  optimizedEstimate: CostEstimate;
  optimizedQuery: string;
}

const ComparisonDashboard = ({
  originalEstimate,
  optimizedEstimate,
  optimizedQuery,
}: ComparisonDashboardProps) => {
  const dataSavingsPercent = originalEstimate.dataScannedGB > 0
    ? Math.round(((originalEstimate.dataScannedGB - optimizedEstimate.dataScannedGB) / originalEstimate.dataScannedGB) * 100)
    : 0;

  const costSavingsPercent = originalEstimate.costUSD > 0
    ? Math.round(((originalEstimate.costUSD - optimizedEstimate.costUSD) / originalEstimate.costUSD) * 100)
    : 0;

  const timeSavingsPercent = originalEstimate.estimatedTimeSeconds > 0
    ? Math.round(((originalEstimate.estimatedTimeSeconds - optimizedEstimate.estimatedTimeSeconds) / originalEstimate.estimatedTimeSeconds) * 100)
    : 0;

  const metrics = [
    {
      label: 'Data Scanned',
      icon: Database,
      original: `${originalEstimate.dataScannedGB} GB`,
      optimized: `${optimizedEstimate.dataScannedGB} GB`,
      savings: dataSavingsPercent,
    },
    {
      label: 'Estimated Cost',
      icon: DollarSign,
      original: `$${originalEstimate.costUSD.toFixed(4)}`,
      optimized: `$${optimizedEstimate.costUSD.toFixed(4)}`,
      savings: costSavingsPercent,
    },
    {
      label: 'Est. Time',
      icon: Clock,
      original: `${originalEstimate.estimatedTimeSeconds}s`,
      optimized: `${optimizedEstimate.estimatedTimeSeconds}s`,
      savings: timeSavingsPercent,
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Performance Comparison
      </h2>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-3">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className="animate-slide-up rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="h-4 w-4" />
                <span className="text-xs font-medium">{m.label}</span>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Original</span>
                  <span className="font-mono text-sm text-foreground">{m.original}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Optimized</span>
                  <span className="font-mono text-sm text-primary">{m.optimized}</span>
                </div>
              </div>
              {m.savings > 0 && (
                <div className="mt-3 flex items-center gap-1 text-success">
                  <ArrowDown className="h-3.5 w-3.5" />
                  <span className="text-sm font-bold">{m.savings}% reduction</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Optimized Query */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Optimized Query
        </h3>
        <pre className="overflow-x-auto rounded-lg border border-primary/20 bg-muted p-4 font-mono text-sm text-foreground glow-primary">
          {optimizedQuery}
        </pre>
      </div>

      {/* Savings Summary */}
      {dataSavingsPercent > 0 && (
        <div className="rounded-lg border border-success/30 bg-success/10 p-4 text-center">
          <p className="text-lg font-bold text-success">
            🎉 Up to {dataSavingsPercent}% cost savings estimated
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            ${(originalEstimate.costUSD - optimizedEstimate.costUSD).toFixed(4)} saved per query execution
          </p>
        </div>
      )}
    </div>
  );
};

export default ComparisonDashboard;

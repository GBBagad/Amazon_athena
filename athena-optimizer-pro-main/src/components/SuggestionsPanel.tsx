import { QueryIssue } from '@/lib/queryAnalyzer';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';

interface SuggestionsPanelProps {
  issues: QueryIssue[];
}

const severityConfig = {
  critical: {
    icon: AlertCircle,
    bgClass: 'bg-destructive/10 border-destructive/30',
    textClass: 'text-destructive',
    label: 'Critical',
  },
  warning: {
    icon: AlertTriangle,
    bgClass: 'bg-warning/10 border-warning/30',
    textClass: 'text-warning',
    label: 'Warning',
  },
  info: {
    icon: Info,
    bgClass: 'bg-info/10 border-info/30',
    textClass: 'text-info',
    label: 'Info',
  },
};

const SuggestionsPanel = ({ issues }: SuggestionsPanelProps) => {
  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-success/30 bg-success/10 p-4">
        <CheckCircle className="h-5 w-5 text-success" />
        <div>
          <p className="font-medium text-success">Query looks good!</p>
          <p className="text-sm text-muted-foreground">No major optimization issues detected.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Optimization Suggestions ({issues.length})
      </h2>
      <div className="space-y-2">
        {issues.map((issue) => {
          const config = severityConfig[issue.severity];
          const Icon = config.icon;
          return (
            <div
              key={issue.id}
              className={`animate-slide-up rounded-lg border p-4 ${config.bgClass}`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${config.textClass}`} />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${config.textClass}`}>
                      {issue.title}
                    </span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${config.bgClass} ${config.textClass}`}>
                      {config.label}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{issue.description}</p>
                  <p className="text-sm text-foreground">
                    <span className="font-medium text-primary">💡 </span>
                    {issue.suggestion}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SuggestionsPanel;

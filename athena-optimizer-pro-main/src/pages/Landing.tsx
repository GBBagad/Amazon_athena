import { useNavigate } from 'react-router-dom';
import { Database, ArrowRight, Zap, Search, BarChart3, Shield, TrendingDown, Clock, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';

const stats = [
  { value: '90%', label: 'Cost Savings', color: 'text-primary' },
  { value: '$5/TB', label: 'Athena Pricing', color: 'text-primary' },
  { value: '<2s', label: 'Avg. Analysis', color: 'text-primary' },
];

const features = [
  { icon: Search, title: 'Smart Analysis', description: 'Detect SELECT *, missing filters, unpartitioned scans, and more.' },
  { icon: TrendingDown, title: 'Cost Estimation', description: 'See exactly how much each query costs and how much you can save.' },
  { icon: BarChart3, title: 'Performance Comparison', description: 'Side-by-side original vs optimized query performance metrics.' },
  { icon: Shield, title: 'Best Practices', description: 'Get actionable suggestions based on Athena optimization best practices.' },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 glow-primary">
              <Database className="h-4 w-4 text-primary" />
            </div>
            <span className="text-base font-bold text-foreground">Athena Optimizer</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
              Sign In
            </Button>
            <Button size="sm" onClick={() => navigate('/login')} className="glow-primary">
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="container relative mx-auto px-6 py-24 text-center lg:py-32">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 mb-8">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">Intelligent Query Optimization</span>
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-foreground lg:text-5xl">
            SQL query optimization{' '}
            <span className="text-primary">made effortless</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground">
            Analyze, optimize, and reduce costs for your Amazon Athena queries with intelligent rule-based suggestions that save you time and money.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button size="lg" onClick={() => navigate('/login')} className="glow-primary px-8">
              Start Free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate('/login')}>
              Sign In
            </Button>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-20 flex max-w-lg items-center justify-center gap-12 lg:gap-16">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-card/50">
        <div className="container mx-auto px-6 py-20">
          <h2 className="text-center text-2xl font-bold text-foreground">Why use Athena Optimizer?</h2>
          <p className="mx-auto mt-2 max-w-md text-center text-sm text-muted-foreground">
            Everything you need to write cost-effective, high-performance Athena queries.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:glow-primary">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mt-4 font-semibold text-foreground">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Database className="h-3.5 w-3.5" />
            <span>Athena Query Optimizer</span>
          </div>
          <p className="text-xs text-muted-foreground">Built for intelligent SQL optimization</p>
        </div>
      </footer>
    </div>
  );
}

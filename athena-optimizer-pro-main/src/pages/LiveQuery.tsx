import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryState } from '@/contexts/QueryContext';
import { executeAthenaQuery, AthenaQueryResult } from '@/lib/athenaClient';
import { listDatabases, listTables, CatalogDatabase, CatalogTable } from '@/lib/glueCatalog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Play, Loader2, Database, Clock, HardDrive, AlertTriangle, CheckCircle2, Terminal,
  RefreshCw, Table2, Columns3,
} from 'lucide-react';
import { toast } from 'sonner';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function estimateCost(bytes: number): string {
  const tb = bytes / (1024 ** 4);
  const cost = Math.max(tb * 5, 0);
  return cost < 0.01 ? '< $0.01' : `$${cost.toFixed(4)}`;
}

export default function LiveQuery() {
  const { credentials } = useAuth();
  const [sql, setSql] = useState('');
  const [database, setDatabase] = useState('');
  const [outputLocation, setOutputLocation] = useState('s3://athena-query-results-bucket/');
  const { isRunning, setIsRunning, latestResult: result, setLatestResult: setResult, addQueryExecution, setLatestQuery } = useQueryState();
  const [error, setError] = useState<string | null>(null);

  // Catalog state
  const [databases, setDatabases] = useState<CatalogDatabase[]>([]);
  const [tables, setTables] = useState<CatalogTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [loadingDbs, setLoadingDbs] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const getCreds = useCallback(() => {
    if (!credentials) return null;
    return {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken || '',
      region: credentials.region,
    };
  }, [credentials]);

  // Fetch databases on mount
  useEffect(() => {
    const creds = getCreds();
    if (!creds) return;
    setLoadingDbs(true);
    setCatalogError(null);
    listDatabases(creds)
      .then((dbs) => {
        setDatabases(dbs);
        if (dbs.length > 0 && !database) {
          setDatabase(dbs[0].name);
        }
      })
      .catch((e) => setCatalogError(e.message || 'Failed to list databases'))
      .finally(() => setLoadingDbs(false));
  }, [credentials]);

  // Fetch tables when database changes
  useEffect(() => {
    const creds = getCreds();
    if (!creds || !database) {
      setTables([]);
      return;
    }
    setLoadingTables(true);
    setSelectedTable('');
    listTables(creds, database)
      .then(setTables)
      .catch(() => setTables([]))
      .finally(() => setLoadingTables(false));
  }, [database, credentials]);

  const handleInsertTable = (tableName: string) => {
    setSelectedTable(tableName);
    if (!sql.trim()) {
      setSql(`SELECT * FROM ${database}.${tableName} LIMIT 10;`);
    }
  };

  const handleExecute = useCallback(async () => {
    if (!sql.trim()) return;
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const creds = credentials ? {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken || '',
      } : null;

      const response = await fetch('http://localhost:8000/run-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: sql,
          database: database || 'default',
          credentials: creds,
          outputLocation: outputLocation,
          region: credentials?.region || 'us-east-1'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Query execution failed via backend');
      }

      const queryResult = await response.json();
      setResult(queryResult);
      setLatestQuery(sql);
      
      const tb = queryResult.dataScannedBytes / (1024 ** 4);
      const cost = Math.max(tb * 5, 0);
      addQueryExecution(cost, queryResult.dataScannedBytes, queryResult.executionTimeMs);
      toast.success('Query executed successfully');
    } catch (e: any) {
      const msg = e.message || 'Query execution failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsRunning(false);
    }
  }, [sql, database, outputLocation, credentials, addQueryExecution, setIsRunning, setLatestQuery, setResult]);

  const refreshCatalog = () => {
    const creds = getCreds();
    if (!creds) return;
    setLoadingDbs(true);
    setCatalogError(null);
    listDatabases(creds)
      .then((dbs) => {
        setDatabases(dbs);
        toast.success(`Found ${dbs.length} database(s)`);
      })
      .catch((e) => setCatalogError(e.message))
      .finally(() => setLoadingDbs(false));
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Terminal className="h-6 w-6 text-primary" />
          Live Query Execution
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Run SQL queries directly on Amazon Athena using your IAM credentials.
        </p>
      </div>

      {/* Catalog Browser */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            Data Catalog
          </h2>
          <Button variant="ghost" size="sm" onClick={refreshCatalog} disabled={loadingDbs}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loadingDbs ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {catalogError && (
          <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {catalogError}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Database</label>
            {loadingDbs ? (
              <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-border bg-muted text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading databases...
              </div>
            ) : databases.length > 0 ? (
              <Select value={database} onValueChange={setDatabase}>
                <SelectTrigger className="border-border bg-muted font-mono text-sm">
                  <SelectValue placeholder="Select database" />
                </SelectTrigger>
                <SelectContent>
                  {databases.map((db) => (
                    <SelectItem key={db.name} value={db.name} className="font-mono text-sm">
                      {db.name}
                      {db.description && <span className="ml-2 text-muted-foreground text-xs">— {db.description}</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input value={database} onChange={(e) => setDatabase(e.target.value)} placeholder="default" className="border-border bg-muted font-mono text-sm" />
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">S3 Output Location</label>
            <Input value={outputLocation} onChange={(e) => setOutputLocation(e.target.value)} placeholder="s3://your-bucket/athena-results/" className="border-border bg-muted font-mono text-sm" />
          </div>
        </div>

        {/* Tables list */}
        {database && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Table2 className="h-3.5 w-3.5" />
              Tables in <span className="font-mono text-primary">{database}</span>
            </label>
            {loadingTables ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading tables...
              </div>
            ) : tables.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tables.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => handleInsertTable(t.name)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-mono transition-colors ${
                      selectedTable === t.name
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-muted text-foreground hover:border-primary/50'
                    }`}
                  >
                    <Table2 className="h-3 w-3" />
                    {t.name}
                    <span className="text-muted-foreground">({t.columns.length} cols)</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-2">No tables found in this database.</p>
            )}
          </div>
        )}

        {/* Column preview for selected table */}
        {selectedTable && tables.find(t => t.name === selectedTable) && (
          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <Columns3 className="h-3.5 w-3.5" />
              Columns in <span className="font-mono text-primary">{selectedTable}</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {tables.find(t => t.name === selectedTable)!.columns.map((col) => (
                <span key={col.name} className="inline-flex items-center gap-1 rounded border border-border bg-card px-2 py-0.5 text-xs">
                  <span className="font-mono text-foreground">{col.name}</span>
                  <span className="text-muted-foreground">{col.type}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SQL Editor */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">SQL Query</h2>
          <Badge variant="outline" className="text-xs border-primary/30 text-primary">Live Execution</Badge>
        </div>
        <Textarea value={sql} onChange={(e) => setSql(e.target.value)} placeholder="SELECT * FROM your_table LIMIT 10;" className="min-h-[140px] resize-none rounded-lg border-border bg-muted font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary" />
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Queries run with your IAM credentials directly.</p>
          <Button onClick={handleExecute} disabled={!sql.trim() || isRunning || !credentials} className="bg-primary text-primary-foreground glow-primary hover:opacity-90">
            {isRunning ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Play className="mr-1.5 h-4 w-4" />}
            {isRunning ? 'Running…' : 'Execute Query'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive shrink-0" />
          <div>
            <p className="text-sm font-medium text-destructive">Query Failed</p>
            <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              { icon: CheckCircle2, label: 'Status', value: result.state, color: 'text-green-400' },
              { icon: Clock, label: 'Execution Time', value: formatMs(result.executionTimeMs), color: 'text-primary' },
              { icon: HardDrive, label: 'Data Scanned', value: formatBytes(result.dataScannedBytes), color: 'text-primary' },
              { icon: Database, label: 'Est. Cost', value: estimateCost(result.dataScannedBytes), color: 'text-amber-400' },
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
                    {result.columns.map((col, i) => (
                      <th key={i} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.length === 0 ? (
                    <tr><td colSpan={result.columns.length} className="px-4 py-8 text-center text-muted-foreground">No results returned</td></tr>
                  ) : (
                    result.rows.map((row, ri) => (
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
              {result.rows.length} row{result.rows.length !== 1 ? 's' : ''} • Query ID: {result.queryExecutionId}
            </div>
          </div>
        </div>
      )}

      {!result && !error && !isRunning && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <Database className="mb-4 h-12 w-12 text-muted-foreground/30" />
          <p className="text-lg font-medium text-muted-foreground">Ready to execute</p>
          <p className="mt-1 text-sm text-muted-foreground/60">Select a database and table above, or write your own query</p>
        </div>
      )}
    </div>
  );
}

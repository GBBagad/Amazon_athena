import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AthenaQueryResult } from '@/lib/athenaClient';

interface QueryContextType {
  latestResult: AthenaQueryResult | null;
  setLatestResult: (result: AthenaQueryResult | null) => void;
  isRunning: boolean;
  setIsRunning: (running: boolean) => void;
  queryCount: number;
  totalCost: number;
  totalDataScanned: number;
  totalExecutionTimeMs: number;
  addQueryExecution: (cost: number, scannedBytes: number, timeMs: number) => void;
  latestQuery: string;
  setLatestQuery: (query: string) => void;
}

const QueryContext = createContext<QueryContextType | undefined>(undefined);

export function QueryProvider({ children }: { children: ReactNode }) {
  const [latestResult, setLatestResult] = useState<AthenaQueryResult | null>(null);
  const [latestQuery, setLatestQuery] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [queryCount, setQueryCount] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [totalDataScanned, setTotalDataScanned] = useState(0);
  const [totalExecutionTimeMs, setTotalExecutionTimeMs] = useState(0);

  // Fetch true statistics from backend on page load
  React.useEffect(() => {
    fetch('http://localhost:8000/get-history')
      .then(res => res.json())
      .then(data => {
        if (data.history && Array.isArray(data.history)) {
          let c = 0, cost = 0, scanned = 0, time = 0;
          data.history.forEach((h: any) => {
            if (h.status === 'SUCCEEDED') {
              c++;
              cost += (h.cost || 0);
              scanned += (h.data_scanned_bytes || 0);
              time += (h.execution_time_ms || 0);
            }
          });
          setQueryCount(c);
          setTotalCost(cost);
          setTotalDataScanned(scanned);
          setTotalExecutionTimeMs(time);
        }
      })
      .catch(err => console.error('Failed to load history metrics:', err));
  }, []);

  const addQueryExecution = (cost: number, scannedBytes: number, timeMs: number) => {
    setQueryCount((prev) => prev + 1);
    setTotalCost((prev) => prev + cost);
    setTotalDataScanned((prev) => prev + scannedBytes);
    setTotalExecutionTimeMs((prev) => prev + timeMs);
  };

  return (
    <QueryContext.Provider
      value={{
        latestResult,
        setLatestResult,
        isRunning,
        setIsRunning,
        queryCount,
        totalCost,
        totalDataScanned,
        totalExecutionTimeMs,
        addQueryExecution,
        latestQuery,
        setLatestQuery
      }}
    >
      {children}
    </QueryContext.Provider>
  );
}

export function useQueryState() {
  const context = useContext(QueryContext);
  if (context === undefined) {
    throw new Error('useQueryState must be used within a QueryProvider');
  }
  return context;
}

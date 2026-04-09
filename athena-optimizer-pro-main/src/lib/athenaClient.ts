export interface AthenaQueryResult {
  columns: string[];
  rows: string[][];
  queryExecutionId: string;
  state: string;
  dataScannedBytes: number;
  executionTimeMs: number;
}

interface TempCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}

export async function executeAthenaQuery(
  sql: string,
  creds: TempCredentials,
  database: string = 'default',
  outputLocation: string = 's3://athena-query-results-bucket/',
  region: string = 'us-east-1'
): Promise<AthenaQueryResult> {
  const response = await fetch('http://localhost:8000/run-query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: sql,
      database,
      outputLocation,
      region,
      credentials: creds
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Failed to execute query via backend');
  }

  return await response.json();
}

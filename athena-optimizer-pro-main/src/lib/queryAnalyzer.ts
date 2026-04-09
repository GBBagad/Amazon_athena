export interface QueryIssue {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  suggestion: string;
}

export interface AnalysisResult {
  issues: QueryIssue[];
  optimizedQuery: string;
  originalEstimate: CostEstimate;
  optimizedEstimate: CostEstimate;
}

export interface CostEstimate {
  dataScannedGB: number;
  costUSD: number;
  estimatedTimeSeconds: number;
}

const ATHENA_COST_PER_TB = 5.0;
const SQL_KEYWORDS = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'ON', 'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'AND', 'OR', 'NOT', 'IN', 'BETWEEN', 'LIKE', 'IS', 'NULL', 'AS', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'UNION', 'ALL', 'EXISTS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'WITH', 'PARTITION', 'OVER', 'ROW_NUMBER', 'RANK', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'FULL', 'CROSS', 'INTO', 'VALUES', 'SET', 'TABLE', 'INDEX', 'VIEW', 'ASC', 'DESC', 'OFFSET', 'FETCH', 'NEXT', 'ROWS', 'ONLY'];

function normalizeSQL(query: string): string {
  return query.replace(/\s+/g, ' ').trim().toUpperCase();
}

function extractTableName(query: string): string {
  const match = query.match(/FROM\s+(\w+)/i);
  return match ? match[1] : 'unknown_table';
}

function extractColumns(query: string): string[] {
  const match = query.match(/SELECT\s+(.*?)\s+FROM/is);
  if (!match) return [];
  return match[1].split(',').map(c => c.trim());
}

function hasSelectStar(query: string): boolean {
  return /SELECT\s+\*/i.test(query);
}

function hasWhereClause(query: string): boolean {
  return /WHERE\s+/i.test(query);
}

function hasPartitionFilter(query: string): boolean {
  const partitionKeys = ['year', 'month', 'date', 'dt', 'partition', 'day'];
  const normalized = normalizeSQL(query);
  return partitionKeys.some(key => normalized.includes(key.toUpperCase()));
}

function hasLimit(query: string): boolean {
  return /LIMIT\s+\d+/i.test(query);
}

function hasOrderByWithoutLimit(query: string): boolean {
  return /ORDER\s+BY/i.test(query) && !hasLimit(query);
}

function hasJoinWithoutCondition(query: string): boolean {
  const joinCount = (query.match(/JOIN/gi) || []).length;
  const onCount = (query.match(/\bON\b/gi) || []).length;
  return joinCount > onCount;
}

function estimateCost(dataGB: number): CostEstimate {
  const costUSD = (dataGB / 1024) * ATHENA_COST_PER_TB;
  const estimatedTimeSeconds = Math.max(2, dataGB * 0.8 + Math.random() * 5);
  return { dataScannedGB: dataGB, costUSD: Math.round(costUSD * 10000) / 10000, estimatedTimeSeconds: Math.round(estimatedTimeSeconds * 10) / 10 };
}

function generateOptimizedQuery(query: string, issues: QueryIssue[]): string {
  let optimized = query.trim();
  const table = extractTableName(query);

  // Replace SELECT * with specific columns
  if (issues.some(i => i.id === 'select-star')) {
    const sampleColumns = getSampleColumns(table);
    optimized = optimized.replace(/SELECT\s+\*/i, `SELECT ${sampleColumns.join(', ')}`);
  }

  // Add partition filter
  if (issues.some(i => i.id === 'no-partition')) {
    if (hasWhereClause(optimized)) {
      optimized = optimized.replace(/WHERE\s+/i, 'WHERE year = 2024 AND ');
    } else {
      optimized = optimized.replace(
        new RegExp(`(FROM\\s+${table})`, 'i'),
        `$1 WHERE year = 2024`
      );
    }
  }

  // Add LIMIT if missing
  if (issues.some(i => i.id === 'no-limit') && !hasLimit(optimized)) {
    optimized = optimized.replace(/;?\s*$/, ' LIMIT 1000;');
  }

  if (!optimized.endsWith(';')) optimized += ';';
  return optimized;
}

function getSampleColumns(table: string): string[] {
  const columnMap: Record<string, string[]> = {
    sales: ['product', 'price', 'quantity', 'sale_date', 'region'],
    orders: ['order_id', 'customer_id', 'total', 'order_date', 'status'],
    logs: ['timestamp', 'level', 'message', 'source'],
    users: ['user_id', 'name', 'email', 'created_at'],
    events: ['event_id', 'event_type', 'timestamp', 'user_id'],
  };
  return columnMap[table.toLowerCase()] || ['id', 'name', 'created_at', 'status'];
}

function estimateBaseDataScan(query: string): number {
  let base = 500; // base GB for full table scan
  if (!hasSelectStar(query)) base *= 0.3;
  if (hasWhereClause(query)) base *= 0.4;
  if (hasPartitionFilter(query)) base *= 0.1;
  if (hasLimit(query)) base *= 0.5;
  return Math.max(1, Math.round(base));
}

export function analyzeQuery(query: string): AnalysisResult {
  const issues: QueryIssue[] = [];

  if (!query.trim()) {
    return {
      issues: [],
      optimizedQuery: '',
      originalEstimate: estimateCost(0),
      optimizedEstimate: estimateCost(0),
    };
  }

  if (hasSelectStar(query)) {
    issues.push({
      id: 'select-star',
      severity: 'critical',
      title: 'SELECT * Detected',
      description: 'Using SELECT * scans all columns, significantly increasing data scanned and cost.',
      suggestion: 'Replace SELECT * with only the specific columns you need.',
    });
  }

  if (!hasWhereClause(query)) {
    issues.push({
      id: 'no-where',
      severity: 'critical',
      title: 'Missing WHERE Clause',
      description: 'Without filtering, Athena scans the entire dataset.',
      suggestion: 'Add a WHERE clause to filter rows and reduce data scanned.',
    });
  }

  if (!hasPartitionFilter(query)) {
    issues.push({
      id: 'no-partition',
      severity: 'warning',
      title: 'No Partition Filter',
      description: 'Queries without partition filters (year, month, date) scan all partitions.',
      suggestion: 'Add partition key filters (e.g., year = 2024) to minimize data scanned.',
    });
  }

  if (!hasLimit(query) && /SELECT/i.test(query)) {
    issues.push({
      id: 'no-limit',
      severity: 'info',
      title: 'No LIMIT Clause',
      description: 'Without LIMIT, all matching rows are returned which may be unnecessary.',
      suggestion: 'Add LIMIT to restrict result set size during exploration.',
    });
  }

  if (hasOrderByWithoutLimit(query)) {
    issues.push({
      id: 'order-no-limit',
      severity: 'warning',
      title: 'ORDER BY Without LIMIT',
      description: 'Sorting entire result sets is expensive. Combine with LIMIT for top-N queries.',
      suggestion: 'Add LIMIT after ORDER BY to reduce sorting overhead.',
    });
  }

  if (hasJoinWithoutCondition(query)) {
    issues.push({
      id: 'join-no-condition',
      severity: 'critical',
      title: 'JOIN Without ON Condition',
      description: 'Missing JOIN conditions cause cartesian products, exponentially increasing data.',
      suggestion: 'Ensure every JOIN has a proper ON condition.',
    });
  }

  if (/\.csv/i.test(query) || /FORMAT\s+.*CSV/i.test(query)) {
    issues.push({
      id: 'csv-format',
      severity: 'info',
      title: 'Consider Columnar Format',
      description: 'CSV files require full row scans. Columnar formats skip unused columns.',
      suggestion: 'Convert data to Parquet or ORC format for up to 90% cost savings.',
    });
  }

  const originalDataGB = estimateBaseDataScan(query);
  const optimizedQuery = generateOptimizedQuery(query, issues);
  const optimizedDataGB = estimateBaseDataScan(optimizedQuery);

  return {
    issues,
    optimizedQuery,
    originalEstimate: estimateCost(originalDataGB),
    optimizedEstimate: estimateCost(optimizedDataGB),
  };
}

export function highlightSQL(sql: string): string {
  let highlighted = sql.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Highlight strings
  highlighted = highlighted.replace(/'([^']*)'/g, '<span class="sql-string">\'$1\'</span>');

  // Highlight numbers
  highlighted = highlighted.replace(/\b(\d+)\b/g, '<span class="sql-number">$1</span>');

  // Highlight keywords
  SQL_KEYWORDS.forEach(kw => {
    const regex = new RegExp(`\\b(${kw})\\b`, 'gi');
    highlighted = highlighted.replace(regex, '<span class="sql-keyword">$1</span>');
  });

  return highlighted;
}

export const SAMPLE_QUERIES = [
  {
    label: 'Full table scan',
    query: "SELECT * FROM sales;",
  },
  {
    label: 'Missing partition',
    query: "SELECT * FROM sales WHERE product = 'phone';",
  },
  {
    label: 'ORDER BY no LIMIT',
    query: "SELECT name, total FROM orders ORDER BY total DESC;",
  },
  {
    label: 'Reasonably optimized',
    query: "SELECT product, price, quantity FROM sales WHERE year = 2024 AND region = 'US' LIMIT 100;",
  },
];

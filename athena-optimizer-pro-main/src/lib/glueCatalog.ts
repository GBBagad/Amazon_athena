import {
  GlueClient,
  GetDatabasesCommand,
  GetTablesCommand,
} from '@aws-sdk/client-glue';

interface CatalogCreds {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  region: string;
}

function createGlueClient(creds: CatalogCreds): GlueClient {
  return new GlueClient({
    region: creds.region,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
      ...(creds.sessionToken ? { sessionToken: creds.sessionToken } : {}),
    },
  });
}

export interface CatalogDatabase {
  name: string;
  description?: string;
  locationUri?: string;
}

export interface CatalogTable {
  name: string;
  databaseName: string;
  columns: { name: string; type: string }[];
  location?: string;
  tableType?: string;
  rowCount?: number;
}

export async function listDatabases(creds: CatalogCreds): Promise<CatalogDatabase[]> {
  const client = createGlueClient(creds);
  const databases: CatalogDatabase[] = [];
  let nextToken: string | undefined;

  do {
    const res = await client.send(new GetDatabasesCommand({ NextToken: nextToken }));
    for (const db of res.DatabaseList || []) {
      databases.push({
        name: db.Name || '',
        description: db.Description,
        locationUri: db.LocationUri,
      });
    }
    nextToken = res.NextToken;
  } while (nextToken);

  return databases;
}

export async function listTables(creds: CatalogCreds, databaseName: string): Promise<CatalogTable[]> {
  const client = createGlueClient(creds);
  const tables: CatalogTable[] = [];
  let nextToken: string | undefined;

  do {
    const res = await client.send(new GetTablesCommand({ DatabaseName: databaseName, NextToken: nextToken }));
    for (const t of res.TableList || []) {
      tables.push({
        name: t.Name || '',
        databaseName,
        columns: (t.StorageDescriptor?.Columns || []).map(c => ({ name: c.Name || '', type: c.Type || '' })),
        location: t.StorageDescriptor?.Location,
        tableType: t.TableType,
      });
    }
    nextToken = res.NextToken;
  } while (nextToken);

  return tables;
}

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  region: string;
}

export interface AwsIdentityInfo {
  arn: string;
  accountId: string;
  userId: string;
  region: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  credentials: AwsCredentials | null;
  awsIdentity: AwsIdentityInfo | null;
  awsIdentityLoading: boolean;
  login: (creds: AwsCredentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const CREDS_KEY = 'aws_creds';

function loadStoredCreds(): AwsCredentials | null {
  try {
    const raw = sessionStorage.getItem(CREDS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeCreds(creds: AwsCredentials) {
  sessionStorage.setItem(CREDS_KEY, JSON.stringify(creds));
}

function clearCreds() {
  sessionStorage.removeItem(CREDS_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [credentials, setCredentials] = useState<AwsCredentials | null>(null);
  const [awsIdentity, setAwsIdentity] = useState<AwsIdentityInfo | null>(null);
  const [awsIdentityLoading, setAwsIdentityLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchIdentity = async (creds: AwsCredentials): Promise<AwsIdentityInfo> => {
    const sts = new STSClient({
      region: creds.region,
      credentials: {
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
        ...(creds.sessionToken ? { sessionToken: creds.sessionToken } : {}),
      },
    });
    const identity = await sts.send(new GetCallerIdentityCommand({}));
    return {
      arn: identity.Arn || 'Unknown',
      accountId: identity.Account || 'Unknown',
      userId: identity.UserId || 'Unknown',
      region: creds.region,
    };
  };

  // Restore session on mount
  useEffect(() => {
    const stored = loadStoredCreds();
    if (stored) {
      setCredentials(stored);
      setAwsIdentityLoading(true);
      fetchIdentity(stored)
        .then((id) => {
          setAwsIdentity(id);
          setUser({
            id: id.userId,
            name: id.arn.split('/').pop() || 'AWS User',
            email: `${id.accountId}@aws`,
          });
        })
        .catch(() => {
          clearCreds();
        })
        .finally(() => {
          setAwsIdentityLoading(false);
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (creds: AwsCredentials) => {
    setAwsIdentityLoading(true);
    try {
      const id = await fetchIdentity(creds);
      setAwsIdentity(id);
      setCredentials(creds);
      storeCreds(creds);
      setUser({
        id: id.userId,
        name: id.arn.split('/').pop() || 'AWS User',
        email: `${id.accountId}@aws`,
      });
    } catch (e: any) {
      throw new Error(e.message || 'Invalid AWS credentials');
    } finally {
      setAwsIdentityLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setCredentials(null);
    setAwsIdentity(null);
    clearCreds();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, credentials, awsIdentity, awsIdentityLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

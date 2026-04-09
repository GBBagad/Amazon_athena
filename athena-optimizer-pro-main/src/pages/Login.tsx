import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Database, Key, Lock, Eye, EyeOff, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [region, setRegion] = useState('us-east-1');
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessKeyId.trim() || !secretAccessKey.trim()) {
      toast({ title: 'Missing credentials', description: 'Access Key ID and Secret Access Key are required.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await login({
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
        sessionToken: sessionToken.trim() || undefined,
        region: region.trim(),
      });
      navigate('/');
      toast({ title: 'Connected!', description: 'AWS credentials verified successfully.' });
    } catch (err: any) {
      toast({ title: 'Authentication failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <Link to="/landing" className="inline-flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 glow-primary">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg font-bold text-foreground">Athena Optimizer</span>
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-foreground">Connect your AWS Account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Enter your IAM Access Key credentials</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="accessKeyId">Access Key ID</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="accessKeyId" placeholder="AKIAIOSFODNN7EXAMPLE" value={accessKeyId} onChange={e => setAccessKeyId(e.target.value)} className="pl-10 font-mono text-sm" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="secretAccessKey">Secret Access Key</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="secretAccessKey" type={showSecret ? 'text' : 'password'} placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" value={secretAccessKey} onChange={e => setSecretAccessKey(e.target.value)} className="pl-10 pr-10 font-mono text-sm" required />
              <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sessionToken">Session Token <span className="text-muted-foreground">(optional)</span></Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="sessionToken" type="password" placeholder="Paste if using temporary credentials" value={sessionToken} onChange={e => setSessionToken(e.target.value)} className="pl-10 font-mono text-sm" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="region">AWS Region</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="region" placeholder="us-east-1" value={region} onChange={e => setRegion(e.target.value)} className="pl-10 font-mono text-sm" required />
            </div>
          </div>
          <Button type="submit" className="w-full glow-primary" disabled={loading}>
            {loading ? 'Verifying...' : 'Connect to AWS'}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Credentials are stored only in your browser session and never sent to any server.
          </p>
        </form>
      </div>
    </div>
  );
}

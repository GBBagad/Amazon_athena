import { User, Shield, Activity, LogOut, Cloud, Key, Globe, Hash, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user, logout, awsIdentity, awsIdentityLoading, credentials } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/landing');
  };

  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your AWS account & identity details.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout} className="text-destructive hover:bg-destructive/10">
          <LogOut className="mr-1.5 h-3.5 w-3.5" />
          Disconnect
        </Button>
      </div>

      {/* User Card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-5">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{user?.name || 'AWS User'}</h2>
            <p className="text-sm text-muted-foreground font-mono">{credentials?.accessKeyId ? `${credentials.accessKeyId.slice(0, 8)}...` : 'Not connected'}</p>
            <Badge variant="secondary" className="mt-1.5 text-xs">
              <Key className="mr-1 h-3 w-3" />
              IAM Credentials
            </Badge>
          </div>
        </div>
      </div>

      {/* AWS Identity Section */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <Cloud className="h-5 w-5 text-primary" />
          AWS Identity
        </h3>
        {awsIdentityLoading ? (
          <div className="rounded-xl border border-border bg-card p-8 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Verifying AWS identity...</span>
          </div>
        ) : awsIdentity ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span className="text-xs font-medium">Caller ARN</span>
              </div>
              <p className="mt-2 text-xs font-mono text-foreground break-all">{awsIdentity.arn}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Hash className="h-4 w-4" />
                <span className="text-xs font-medium">AWS Account ID</span>
              </div>
              <p className="mt-2 text-sm font-mono text-foreground">{awsIdentity.accountId}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span className="text-xs font-medium">User ID</span>
              </div>
              <p className="mt-2 text-xs font-mono text-foreground break-all">{awsIdentity.userId}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="h-4 w-4" />
                <span className="text-xs font-medium">Region</span>
              </div>
              <p className="mt-2 text-sm text-foreground">{awsIdentity.region}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
            <Cloud className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">AWS identity not available.</p>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Activity className="h-4 w-4" />
            <span className="text-xs font-medium">Queries Today</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">0</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Globe className="h-4 w-4" />
            <span className="text-xs font-medium">Connected Region</span>
          </div>
          <p className="mt-2 text-sm font-mono text-foreground">{credentials?.region || 'N/A'}</p>
        </div>
      </div>
    </div>
  );
}

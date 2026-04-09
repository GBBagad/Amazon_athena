import { Outlet, useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Zap } from 'lucide-react';
import FloatingChatbot from './FloatingChatbot';

export default function AppLayout() {
  const location = useLocation();
  const hideChatbot = ['/results', '/profile'].includes(location.pathname);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center justify-between border-b border-border bg-card px-4">
            <SidebarTrigger className="text-muted-foreground" />
            <div className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1">
              <Zap className="h-3.5 w-3.5 text-primary animate-pulse" />
              <span className="text-xs font-medium text-primary">$5/TB pricing</span>
            </div>
          </header>
          <main className="flex-1 overflow-auto relative">
            <Outlet />
            {!hideChatbot && <FloatingChatbot />}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

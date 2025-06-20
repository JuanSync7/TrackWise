
"use client";
import type { ReactNode } from 'react';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { AppProvider } from '@/contexts/app-context'; // This will now wrap the domain providers
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-muted/40">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppProvider> {/* AppProvider now orchestrates PersonalFinance, Household, Trip providers */}
      <SidebarProvider>
        <div className="flex h-screen w-full bg-muted/40 overflow-hidden">
          <AppSidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <AppHeader />
            <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8 md:p-6 lg:p-8 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </AppProvider>
  );
}

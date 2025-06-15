
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  useSidebar, // Import useSidebar
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import type { NavItem } from "@/lib/types";
import { APP_NAME } from "@/lib/constants";
import { LayoutDashboard, ListChecks, PiggyBank, Settings, BarChart3, LogOut, Briefcase, Users, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Expenses", href: "/expenses", icon: ListChecks },
  { title: "Budgets", href: "/budgets", icon: PiggyBank },
  { title: "Household", href: "/household", icon: Users },
  { title: "Reports", href: "/reports", icon: BarChart3 },
  { title: "Settings", href: "/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar(); // Get isMobile and setOpenMobile

  const handleLogout = async () => {
    await logout();
  };

  const handleNavItemClick = () => {
    if (isMobile) {
      setOpenMobile(false); // Close mobile sidebar on item click
    }
  };

  return (
    <Sidebar collapsible="icon" side="left" variant="sidebar" className="border-r">
      <SidebarHeader className="p-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
          <Briefcase className="h-7 w-7 text-primary" />
          <h1 className="text-xl font-semibold tracking-tight">{APP_NAME}</h1>
        </Link>
        <Link href="/dashboard" className="items-center gap-2 hidden group-data-[collapsible=icon]:flex">
           <Briefcase className="h-7 w-7 text-primary" />
        </Link>
        <div className="md:hidden">
           <SidebarTrigger />
        </div>
      </SidebarHeader>
      <SidebarContent className="flex-1 overflow-y-auto">
        <SidebarMenu className="p-2 space-y-1">
          {navItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <Link href={item.href} onClick={handleNavItemClick}> {/* Add onClick handler */}
                <SidebarMenuButton
                  
                  isActive={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
                  tooltip={{children: item.title, className: "text-xs"}}
                  className={cn(
                    "justify-start",
                     pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
                      ? "bg-primary/10 text-primary hover:bg-primary/20"
                      : "hover:bg-accent/50"
                  )}
                >
                  <span>
                    <item.icon className="h-5 w-5" />
                    <span>{item.title}</span>
                  </span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t">
         <Button variant="ghost" className="w-full justify-start gap-2 group-data-[collapsible=icon]:justify-center" onClick={handleLogout} disabled={authLoading}>
            {authLoading && <Loader2 className="h-5 w-5 animate-spin" />}
            {!authLoading && <LogOut className="h-5 w-5" />}
            <span className="group-data-[collapsible=icon]:hidden">Log Out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

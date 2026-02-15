import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Plus, 
  CheckSquare, 
  Settings,
  HardHat,
  LogOut,
  Building2,
  Package,
  ChevronDown,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePendingRequestsCount } from '@/hooks/useDatabase';

export function Sidebar() {
  const location = useLocation();
  const { profile, isAdmin, signOut } = useAuth();
  const { data: pendingCount = 0 } = usePendingRequestsCount();

  const mainNav = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'New Request', href: '/requests/new', icon: Plus, hideForAdmin: true },
    { name: isAdmin ? 'All Requests' : 'My Requests', href: '/requests', icon: FileText },
    { name: 'Approvals', href: '/approvals', icon: CheckSquare, adminOnly: true, badge: pendingCount },
  ];

  const manageNav = [
    { name: 'Projects', href: '/projects', icon: Building2, adminOnly: true },
    { name: 'Stock', href: '/stock', icon: Package, adminOnly: true },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const filterNav = (items: Array<{ name: string; href: string; icon: any; adminOnly?: boolean; hideForAdmin?: boolean; badge?: number }>) =>
    items.filter(item => (!item.adminOnly || isAdmin) && (!item.hideForAdmin || !isAdmin));

  const filteredMain = filterNav(mainNav);
  const filteredManage = filterNav(manageNav);

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[240px] bg-sidebar border-r border-sidebar-border flex-col hidden lg:flex">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 px-5 border-b border-sidebar-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shrink-0">
          <HardHat className="h-4.5 w-4.5 text-primary-foreground" />
        </div>
        <span className="text-[15px] font-semibold text-sidebar-foreground">BuildFlow</span>
      </div>

      {/* Search */}
      <div className="px-3 pt-3 pb-1">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full h-8 pl-8 pr-3 text-sm rounded-md bg-sidebar-accent border-0 text-sidebar-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-3">
        {/* Main */}
        <div className="space-y-0.5">
          {filteredMain.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-medium transition-colors duration-100",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-foreground"
                    : "text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
                )}
              >
                <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "")} />
                <span className="flex-1">{item.name}</span>
                {item.badge && item.badge > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="h-5 min-w-5 flex items-center justify-center text-[10px] px-1.5 rounded-full"
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </div>

        {/* Manage section */}
        {filteredManage.length > 0 && (
          <div className="mt-6">
            <p className="px-2.5 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Manage
            </p>
            <div className="space-y-0.5">
              {filteredManage.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-medium transition-colors duration-100",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-foreground"
                        : "text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "")} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* User Profile */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2.5 px-1">
          <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-semibold shrink-0">
            {profile?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-sidebar-foreground truncate">
              {profile?.full_name || 'User'}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {profile?.designation || ''}
            </p>
          </div>
          <button
            onClick={signOut}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            title="Sign Out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

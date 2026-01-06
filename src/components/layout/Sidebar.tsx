import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Plus, 
  CheckSquare, 
  Settings,
  ChevronLeft,
  ChevronRight,
  HardHat,
  LogOut,
  Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePendingRequestsCount } from '@/hooks/useDatabase';

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  
  const location = useLocation();
  const { profile, isAdmin, signOut } = useAuth();
  const { data: pendingCount = 0 } = usePendingRequestsCount();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'New Request', href: '/requests/new', icon: Plus, hideForAdmin: true },
    { name: isAdmin ? 'All Requests' : 'My Requests', href: '/requests', icon: FileText },
    { name: 'Approvals', href: '/approvals', icon: CheckSquare, adminOnly: true, badge: pendingCount },
    { name: 'Projects', href: '/projects', icon: Building2, adminOnly: true },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const filteredNavigation = navigation.filter(item => 
    (!item.adminOnly || isAdmin) && (!item.hideForAdmin || !isAdmin)
  );

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 flex-col hidden lg:flex",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary shrink-0">
            <HardHat className="h-6 w-6 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold text-sidebar-foreground">BuildFlow</span>
              <span className="text-xs text-sidebar-foreground/60">Procurement</span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={cn(
                    "nav-link relative",
                    isActive && "nav-link-active"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span className="flex-1">{item.name}</span>}
                  {item.badge && item.badge > 0 && (
                    <Badge 
                      variant="destructive" 
                      className={cn(
                        "h-5 min-w-5 flex items-center justify-center text-xs px-1.5",
                        collapsed && "absolute -top-1 -right-1"
                      )}
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </Badge>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

      </nav>

      {/* User Profile */}
      <div className="border-t border-sidebar-border p-4">
        <div className={cn(
          "flex items-center gap-3",
          collapsed && "justify-center"
        )}>
          <div className="h-10 w-10 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-semibold shrink-0">
            {profile?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {profile?.designation || 'Loading...'}
              </p>
            </div>
          )}
        </div>
        {!collapsed && (
          <Button 
            variant="ghost" 
            className="w-full mt-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        )}
        {collapsed && (
          <Button 
            variant="ghost" 
            size="icon"
            className="w-full mt-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>
    </aside>
  );
}
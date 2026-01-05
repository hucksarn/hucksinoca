import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Plus, CheckSquare, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { usePendingRequestsCount } from '@/hooks/useDatabase';

export function MobileNav() {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { data: pendingCount = 0 } = usePendingRequestsCount();

  const navigation = [
    { name: 'Home', href: '/', icon: LayoutDashboard },
    { name: 'New', href: '/requests/new', icon: Plus, hideForAdmin: true },
    { name: isAdmin ? 'All' : 'Requests', href: '/requests', icon: FileText },
    { name: 'Approvals', href: '/approvals', icon: CheckSquare, adminOnly: true, badge: pendingCount },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const filteredNavigation = navigation.filter(item => 
    (!item.adminOnly || isAdmin) && (!item.hideForAdmin || !isAdmin)
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border lg:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {filteredNavigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-1 relative",
                "text-muted-foreground hover:text-foreground transition-colors",
                isActive && "text-primary"
              )}
            >
              <div className="relative">
                <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium px-1">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[10px] mt-0.5 font-medium",
                isActive && "text-primary"
              )}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
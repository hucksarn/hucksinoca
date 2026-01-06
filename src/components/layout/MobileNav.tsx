import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Plus, CheckSquare, Settings, LogOut, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { usePendingRequestsCount } from '@/hooks/useDatabase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';
import { MobileProjectsSheet } from './MobileProjectsSheet';

export function MobileNav() {
  const location = useLocation();
  const { isAdmin, signOut } = useAuth();
  const { data: pendingCount = 0 } = usePendingRequestsCount();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

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

  const handleLogout = async () => {
    await signOut();
    setShowLogoutDialog(false);
  };

  return (
    <>
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
          
          {/* Projects button for admin */}
          {isAdmin && (
            <MobileProjectsSheet>
              <button
                className="flex flex-col items-center justify-center flex-1 h-full py-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Building2 className="h-5 w-5" />
                <span className="text-[10px] mt-0.5 font-medium">Projects</span>
              </button>
            </MobileProjectsSheet>
          )}
          
          <button
            onClick={() => setShowLogoutDialog(true)}
            className="flex flex-col items-center justify-center flex-1 h-full py-1 text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-[10px] mt-0.5 font-medium">Logout</span>
          </button>
        </div>
      </nav>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out of your account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Sign Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
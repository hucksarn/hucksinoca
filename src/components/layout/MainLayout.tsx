import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';

interface MainLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function MainLayout({ children, title, subtitle }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <Sidebar />
      
      {/* Mobile Bottom Nav */}
      <MobileNav />
      
      {/* Main Content */}
      <div className="lg:pl-[240px] transition-all duration-200">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-background border-b border-border">
          <div className="px-4 md:px-6 py-3">
            <h1 className="text-lg md:text-xl font-semibold text-foreground">{title}</h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
        </header>
        
        {/* Page Content */}
        <main className="px-4 md:px-6 py-4 md:py-5 pb-20 lg:pb-5">
          {children}
        </main>
      </div>
    </div>
  );
}

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
  Building2,
  Trash2,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useProjects, useCreateProject, usePendingRequestsCount } from '@/hooks/useDatabase';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectLocation, setNewProjectLocation] = useState('');
  const [addingProject, setAddingProject] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  
  const location = useLocation();
  const { profile, isAdmin, signOut } = useAuth();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: pendingCount = 0 } = usePendingRequestsCount();
  const createProject = useCreateProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const activeProjects = projects.filter(p => p.status === 'active');

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'New Request', href: '/requests/new', icon: Plus },
    { name: 'My Requests', href: '/requests', icon: FileText },
    { name: 'Approvals', href: '/approvals', icon: CheckSquare, adminOnly: true, badge: pendingCount },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const filteredNavigation = navigation.filter(item => !item.adminOnly || isAdmin);

  const handleAddProject = async () => {
    if (!newProjectName.trim() || !newProjectLocation.trim()) {
      toast({ title: 'Error', description: 'Name and location required', variant: 'destructive' });
      return;
    }

    setAddingProject(true);
    try {
      await createProject.mutateAsync({
        name: newProjectName,
        location: newProjectLocation,
      });
      setNewProjectName('');
      setNewProjectLocation('');
      setShowAddProject(false);
      toast({ title: 'Project Added' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setAddingProject(false);
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Delete "${projectName}"? This cannot be undone.`)) return;

    setDeletingProjectId(projectId);
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: 'Project Deleted' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setDeletingProjectId(null);
    }
  };

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 flex flex-col",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary">
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

        {/* Projects Section (Admin Only) */}
        {isAdmin && !collapsed && (
          <div className="mt-6 pt-4 border-t border-sidebar-border">
            <Collapsible open={projectsOpen} onOpenChange={setProjectsOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider hover:text-sidebar-foreground">
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Projects
                </span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", projectsOpen && "rotate-180")} />
              </CollapsibleTrigger>
              
              <CollapsibleContent className="mt-2 space-y-1">
                {projectsLoading ? (
                  <div className="flex justify-center py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-sidebar-foreground/40" />
                  </div>
                ) : (
                  <>
                    {activeProjects.map((project) => (
                      <div
                        key={project.id}
                        className="group flex items-center justify-between px-3 py-2 rounded-lg text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium">{project.name}</p>
                          <p className="text-xs text-sidebar-foreground/50 truncate">{project.location}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteProject(project.id, project.name)}
                          disabled={deletingProjectId === project.id}
                        >
                          {deletingProjectId === project.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    ))}

                    {activeProjects.length === 0 && !showAddProject && (
                      <p className="px-3 py-2 text-xs text-sidebar-foreground/50">No active projects</p>
                    )}

                    {showAddProject ? (
                      <div className="px-3 py-2 space-y-2">
                        <Input
                          placeholder="Project name"
                          value={newProjectName}
                          onChange={(e) => setNewProjectName(e.target.value)}
                          className="h-8 text-xs bg-sidebar-accent border-sidebar-border"
                        />
                        <Input
                          placeholder="Location"
                          value={newProjectLocation}
                          onChange={(e) => setNewProjectLocation(e.target.value)}
                          className="h-8 text-xs bg-sidebar-accent border-sidebar-border"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="flex-1 h-7 text-xs"
                            onClick={() => setShowAddProject(false)}
                            disabled={addingProject}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            variant="accent"
                            className="flex-1 h-7 text-xs"
                            onClick={handleAddProject}
                            disabled={addingProject}
                          >
                            {addingProject ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowAddProject(true)}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-primary hover:bg-sidebar-accent rounded-lg"
                      >
                        <Plus className="h-4 w-4" />
                        Add Project
                      </button>
                    )}
                  </>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* Collapsed Projects Icon */}
        {isAdmin && collapsed && (
          <div className="mt-6 pt-4 border-t border-sidebar-border">
            <div className="flex justify-center">
              <div className="p-2 rounded-lg bg-sidebar-accent">
                <Building2 className="h-5 w-5 text-sidebar-foreground/60" />
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* User Profile */}
      <div className="border-t border-sidebar-border p-4">
        <div className={cn(
          "flex items-center gap-3",
          collapsed && "justify-center"
        )}>
          <div className="h-10 w-10 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-semibold">
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

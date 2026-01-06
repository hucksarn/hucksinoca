import { useState } from 'react';
import { Building2, Plus, Trash2, Loader2, CheckCircle, RotateCcw, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useProjects, useCreateProject } from '@/hooks/useDatabase';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface MobileProjectsSheetProps {
  children: React.ReactNode;
}

export function MobileProjectsSheet({ children }: MobileProjectsSheetProps) {
  const [open, setOpen] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectLocation, setNewProjectLocation] = useState('');
  const [addingProject, setAddingProject] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [updatingProjectId, setUpdatingProjectId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);

  const { data: projects = [], isLoading } = useProjects();
  const createProject = useCreateProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const activeProjects = projects.filter(p => p.status === 'active');
  const completedProjects = projects.filter(p => p.status === 'completed');

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

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    setDeletingProjectId(projectToDelete.id);
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectToDelete.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: 'Project Deleted' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setDeletingProjectId(null);
      setProjectToDelete(null);
    }
  };

  const handleToggleProjectStatus = async (projectId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'completed' : 'active';
    setUpdatingProjectId(projectId);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: newStatus })
        .eq('id', projectId);

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: newStatus === 'completed' ? 'Project Completed' : 'Project Reactivated' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setUpdatingProjectId(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        <DialogContent className="max-w-[90vw] sm:max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Projects
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 overflow-y-auto flex-1">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Active Projects */}
                {activeProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{project.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{project.location}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-green-600 hover:text-green-600 hover:bg-green-600/10"
                        onClick={() => handleToggleProjectStatus(project.id, project.status)}
                        disabled={updatingProjectId === project.id}
                      >
                        {updatingProjectId === project.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setProjectToDelete({ id: project.id, name: project.name })}
                        disabled={deletingProjectId === project.id}
                      >
                        {deletingProjectId === project.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}

                {activeProjects.length === 0 && !showAddProject && (
                  <p className="text-center py-4 text-muted-foreground text-sm">No active projects</p>
                )}

                {showAddProject ? (
                  <div className="p-3 rounded-lg bg-muted/50 space-y-3">
                    <Input
                      placeholder="Project name"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                    />
                    <Input
                      placeholder="Location"
                      value={newProjectLocation}
                      onChange={(e) => setNewProjectLocation(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setShowAddProject(false);
                          setNewProjectName('');
                          setNewProjectLocation('');
                        }}
                        disabled={addingProject}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={handleAddProject}
                        disabled={addingProject}
                      >
                        {addingProject ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowAddProject(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Project
                  </Button>
                )}

                {/* Completed Projects */}
                {completedProjects.length > 0 && (
                  <Collapsible open={completedOpen} onOpenChange={setCompletedOpen} className="mt-4">
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground rounded-lg hover:bg-muted/50">
                      <span className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3" />
                        Completed ({completedProjects.length})
                      </span>
                      <ChevronDown className={cn("h-3 w-3 transition-transform", completedOpen && "rotate-180")} />
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="mt-2 space-y-2">
                      {completedProjects.map((project) => (
                        <div
                          key={project.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-muted-foreground line-through">{project.name}</p>
                            <p className="text-xs text-muted-foreground/60 truncate">{project.location}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => handleToggleProjectStatus(project.id, project.status)}
                            disabled={updatingProjectId === project.id}
                          >
                            {updatingProjectId === project.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{projectToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
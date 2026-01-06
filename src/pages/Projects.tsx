import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
import { Plus, Trash2, Loader2, CheckCircle, RotateCcw, ChevronDown, MapPin } from 'lucide-react';
import { useProjects, useCreateProject } from '@/hooks/useDatabase';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

export default function Projects() {
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
    <MainLayout title="Projects" subtitle="Manage your construction projects">
      <div className="space-y-4">
        {/* Add Project Button */}
        {!showAddProject && (
          <Button onClick={() => setShowAddProject(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Project
          </Button>
        )}

        {/* Add Project Form */}
        {showAddProject && (
          <Card>
            <CardContent className="p-4 space-y-3">
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
                  {addingProject ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Project'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Active Projects */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Active Projects ({activeProjects.length})
              </h3>
              {activeProjects.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No active projects</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {activeProjects.map((project) => (
                    <Card key={project.id} className="group">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{project.name}</p>
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {project.location}
                          </p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600 hover:text-green-600 hover:bg-green-600/10"
                            onClick={() => handleToggleProjectStatus(project.id, project.status)}
                            disabled={updatingProjectId === project.id}
                            title="Mark as completed"
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
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Completed Projects */}
            {completedProjects.length > 0 && (
              <Collapsible open={completedOpen} onOpenChange={setCompletedOpen} className="mt-6">
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Completed Projects ({completedProjects.length})
                  </span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", completedOpen && "rotate-180")} />
                </CollapsibleTrigger>
                
                <CollapsibleContent className="mt-2">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {completedProjects.map((project) => (
                      <Card key={project.id} className="group opacity-60">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate line-through text-muted-foreground">{project.name}</p>
                            <p className="text-xs text-muted-foreground/60 truncate flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {project.location}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => handleToggleProjectStatus(project.id, project.status)}
                            disabled={updatingProjectId === project.id}
                            title="Reactivate project"
                          >
                            {updatingProjectId === project.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
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
    </MainLayout>
  );
}
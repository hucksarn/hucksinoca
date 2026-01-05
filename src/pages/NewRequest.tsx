import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Trash2, Upload, Save, Send, Loader2 } from 'lucide-react';
import { useProjects, useCreateMaterialRequest, useCreateProject, useMaterialCategories } from '@/hooks/useDatabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

type Unit = 'nos' | 'bags' | 'kg' | 'ton' | 'm3';

const units: { value: Unit; label: string }[] = [
  { value: 'nos', label: 'Nos' },
  { value: 'bags', label: 'Bags' },
  { value: 'kg', label: 'Kg' },
  { value: 'ton', label: 'Ton' },
  { value: 'm3', label: 'm³' },
];

interface FormItem {
  id: string;
  category: string;
  name: string;
  specification: string;
  quantity: string;
  unit: Unit | '';
  preferredBrand: string;
}

export default function NewRequest() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuth();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: categories = [], isLoading: categoriesLoading } = useMaterialCategories();
  const createRequest = useCreateMaterialRequest();
  const createProject = useCreateProject();
  
  const [formData, setFormData] = useState({
    projectId: '',
    priority: 'normal' as 'urgent' | 'normal',
    requiredDate: '',
    remarks: '',
  });

  const [items, setItems] = useState<FormItem[]>([
    { id: '1', category: '', name: '', specification: '', quantity: '', unit: '', preferredBrand: '' }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', location: '' });
  const [addingProject, setAddingProject] = useState(false);

  const handleAddProject = async () => {
    if (!newProject.name.trim() || !newProject.location.trim()) {
      toast({ title: 'Error', description: 'Project name and location are required', variant: 'destructive' });
      return;
    }

    setAddingProject(true);
    try {
      const project = await createProject.mutateAsync({
        name: newProject.name,
        location: newProject.location,
      });
      
      setFormData({ ...formData, projectId: project.id });
      setShowAddProject(false);
      setNewProject({ name: '', location: '' });
      toast({ title: 'Project Added', description: `${project.name} has been created.` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to create project', variant: 'destructive' });
    } finally {
      setAddingProject(false);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), category: '', name: '', specification: '', quantity: '', unit: '', preferredBrand: '' }
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof FormItem, value: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const validateForm = () => {
    if (!formData.projectId) {
      toast({ title: 'Error', description: 'Please select a project', variant: 'destructive' });
      return false;
    }

    const validItems = items.filter(item => item.category && item.name && item.quantity && item.unit);
    if (validItems.length === 0) {
      toast({ title: 'Error', description: 'Please add at least one complete material item', variant: 'destructive' });
      return false;
    }

    return true;
  };

  const handleSubmit = async (asDraft: boolean) => {
    if (!asDraft && !validateForm()) return;

    setIsSubmitting(true);

    const validItems = items
      .filter(item => item.category && item.name && item.quantity && item.unit)
      .map(item => ({
        category: item.category as string,
        name: item.name,
        specification: item.specification || null,
        quantity: parseFloat(item.quantity),
        unit: item.unit as string,
        preferred_brand: item.preferredBrand || null,
      }));

    try {
      await createRequest.mutateAsync({
        projectId: formData.projectId,
        priority: formData.priority,
        requiredDate: formData.requiredDate || null,
        remarks: formData.remarks,
        items: validItems,
        status: asDraft ? 'draft' : 'submitted',
      });

      toast({
        title: asDraft ? "Draft saved" : "Request submitted",
        description: asDraft 
          ? "Your request has been saved as a draft." 
          : "Your request has been submitted for approval.",
      });
      navigate('/requests');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create request',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (projectsLoading || categoriesLoading) {
    return (
      <MainLayout title="New Material Request" subtitle="Create a new material request for your project">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout 
      title="New Material Request" 
      subtitle="Create a new material request for your project"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Section A: Request Details */}
        <div className="form-section animate-slide-up">
          <h2 className="form-section-title">Section A – Request Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project">Project / Site *</Label>
              <Select 
                value={formData.projectId} 
                onValueChange={(v) => {
                  if (v === '__add_new__') {
                    setShowAddProject(true);
                  } else {
                    setFormData({ ...formData, projectId: v });
                  }
                }}
              >
                <SelectTrigger id="project">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.filter(p => p.status === 'active').map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                  {isAdmin && (
                    <SelectItem value="__add_new__" className="text-primary font-medium">
                      <span className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add New Project
                      </span>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority *</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(v) => setFormData({ ...formData, priority: v as any })}
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="requiredDate">Required Date</Label>
              <Input
                id="requiredDate"
                type="date"
                value={formData.requiredDate}
                onChange={(e) => setFormData({ ...formData, requiredDate: e.target.value })}
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="remarks">Remarks / Reason</Label>
              <Textarea
                id="remarks"
                placeholder="Provide details about this request..."
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Section B: Requester Details */}
        <div className="form-section animate-slide-up" style={{ animationDelay: '100ms' }}>
          <h2 className="form-section-title">Section B – Requester Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={profile?.full_name || ''} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Designation</Label>
              <Input value={profile?.designation || ''} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Contact Number</Label>
              <Input value={profile?.phone || 'Not set'} disabled className="bg-muted" />
            </div>
          </div>
        </div>

        {/* Section C: Material Details */}
        <div className="form-section animate-slide-up" style={{ animationDelay: '200ms' }}>
          <h2 className="form-section-title">Section C – Material Details</h2>
          
          <div className="space-y-4">
            {items.map((item, index) => (
              <div 
                key={item.id} 
                className="p-4 rounded-lg bg-muted/50 border border-border space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-muted-foreground">
                    Item #{index + 1}
                  </span>
                  {items.length > 1 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeItem(item.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select 
                      value={item.category} 
                      onValueChange={(v) => updateItem(item.id, 'category', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.slug} value={cat.slug}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Material Name *</Label>
                    <Input
                      placeholder="e.g., Portland Cement"
                      value={item.name}
                      onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Specification</Label>
                    <Input
                      placeholder="Grade, size, standard..."
                      value={item.specification}
                      onChange={(e) => updateItem(item.id, 'specification', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="0"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Unit *</Label>
                    <Select 
                      value={item.unit} 
                      onValueChange={(v) => updateItem(item.id, 'unit', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map(unit => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Preferred Brand</Label>
                    <Input
                      placeholder="Optional"
                      value={item.preferredBrand}
                      onChange={(e) => updateItem(item.id, 'preferredBrand', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button 
              type="button" 
              variant="outline" 
              onClick={addItem}
              className="w-full border-dashed"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Item
            </Button>
          </div>
        </div>

        {/* Section D: Attachments */}
        <div className="form-section animate-slide-up" style={{ animationDelay: '300ms' }}>
          <h2 className="form-section-title">Section D – Attachments</h2>
          
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-2">
              Drag and drop files here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Site photos, drawings, BOQ extracts (Max 10MB each)
            </p>
            <Button variant="outline" className="mt-4">
              Choose Files
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4">
          <Button variant="outline" onClick={() => navigate('/requests')} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={() => handleSubmit(true)} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save as Draft
          </Button>
          <Button variant="accent" onClick={() => handleSubmit(false)} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Submit Request
          </Button>
        </div>
      </div>

      {/* Add Project Dialog */}
      <Dialog open={showAddProject} onOpenChange={setShowAddProject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Project</DialogTitle>
            <DialogDescription>
              Create a new project/site for material requests.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name *</Label>
              <Input
                id="projectName"
                placeholder="e.g., Marina Bay Tower"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectLocation">Location *</Label>
              <Input
                id="projectLocation"
                placeholder="e.g., Downtown District"
                value={newProject.location}
                onChange={(e) => setNewProject({ ...newProject, location: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddProject(false)} disabled={addingProject}>
              Cancel
            </Button>
            <Button variant="accent" onClick={handleAddProject} disabled={addingProject}>
              {addingProject ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Project
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

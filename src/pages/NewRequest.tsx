import { useMemo, useState, useEffect } from 'react';
import { isLocalMode } from '@/lib/api';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Upload, Save, Send, Loader2, Search } from 'lucide-react';
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
  const [stockItems, setStockItems] = useState<Array<{ item: string; description: string; qty: number; unit: string; category: string }>>([]);
  const [loadingStock, setLoadingStock] = useState(false);

  const [formData, setFormData] = useState({
    projectId: '',
    priority: 'normal' as 'urgent' | 'normal',
    requiredDate: '',
    remarks: '',
  });

  // Added items list
  const [items, setItems] = useState<FormItem[]>([]);

  // Current item being built (search + select flow)
  const [currentItem, setCurrentItem] = useState<FormItem>({
    id: '', category: '', name: '', specification: '', quantity: '', unit: '', preferredBrand: '',
  });
  const [searchQuery, setSearchQuery] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', location: '' });
  const [addingProject, setAddingProject] = useState(false);

  useEffect(() => {
    const loadStock = async () => {
      setLoadingStock(true);
      try {
        let data: any;
        if (isLocalMode) {
          const items = await (await import('@/lib/api')).stockApi.list();
          data = { items };
        } else {
          const { supabase } = await import('@/integrations/supabase/client');
          const res = await supabase.functions.invoke('stock-api', { method: 'GET' });
          if (res.error) throw new Error(res.error.message);
          data = res.data;
        }
        if (Array.isArray(data.items)) {
          setStockItems(
            data.items.map((i: any) => ({
              item: String(i.item || '').trim(),
              description: String(i.description || '').trim(),
              qty: Number(i.qty || 0),
              unit: String(i.unit || '').trim(),
              category: String(i.category || '').trim(),
            })),
          );
        }
      } catch (error) {
        toast({
          title: 'Stock unavailable',
          description: 'Unable to load stock items.',
          variant: 'destructive',
        });
      } finally {
        setLoadingStock(false);
      }
    };

    void loadStock();
  }, [toast]);

  const stockBalances = useMemo(() => {
    const balances = new Map<string, { item: string; description: string; unit: string; qty: number; category: string }>();
    for (const si of stockItems) {
      const name = si.item || si.description;
      if (!name) continue;
      const key = `${name}__${si.unit}`;
      const current = balances.get(key);
      if (current) {
        current.qty += si.qty;
      } else {
        balances.set(key, { item: si.item, description: si.description, unit: si.unit, qty: si.qty, category: si.category });
      }
    }
    return Array.from(balances.values()).sort((a, b) => (a.item || a.description).localeCompare(b.item || b.description));
  }, [stockItems]);

  const getBalance = (description: string, unit: string) => {
    const match = stockBalances.find(
      (entry) => entry.description === description && entry.unit === unit,
    );
    return match?.qty ?? 0;
  };

  const filteredStock = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return stockBalances
      .filter((entry) => entry.item.toLowerCase().includes(q) || entry.description.toLowerCase().includes(q))
      .slice(0, 8);
  }, [searchQuery, stockBalances]);

  const handleSelectStockItem = (entry: { item: string; description: string; unit: string; qty: number; category: string }) => {
    setCurrentItem((prev) => ({
      ...prev,
      name: entry.item || entry.description,
      specification: entry.description,
      unit: entry.unit as Unit | '',
      category: entry.category || prev.category,
    }));
    setSearchQuery(entry.item || entry.description);
  };

  const canAddItem = currentItem.category && currentItem.name && currentItem.quantity && currentItem.unit;

  const handleAddItem = () => {
    if (!canAddItem) return;
    setItems((prev) => [...prev, { ...currentItem, id: Date.now().toString() }]);
    setCurrentItem({ id: '', category: '', name: '', specification: '', quantity: '', unit: '', preferredBrand: '' });
    setSearchQuery('');
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

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

  const validateForm = () => {
    if (!formData.projectId) {
      toast({ title: 'Error', description: 'Please select a project', variant: 'destructive' });
      return false;
    }

    if (items.length === 0) {
      toast({ title: 'Error', description: 'Please add at least one material item', variant: 'destructive' });
      return false;
    }

    return true;
  };

  const handleSubmit = async (asDraft: boolean) => {
    if (!asDraft && !validateForm()) return;

    setIsSubmitting(true);

    const allowedUnits = ['nos', 'bags', 'kg', 'ton', 'm3'];
    const validItems = items.map((item) => {
      const normalizedUnit = item.unit.toLowerCase().trim();
      return {
        category: item.category as string,
        name: item.name,
        specification: item.specification || null,
        quantity: parseFloat(item.quantity),
        unit: allowedUnits.includes(normalizedUnit) ? normalizedUnit : 'nos',
        preferred_brand: item.preferredBrand || null,
      };
    });

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
        title: asDraft ? 'Draft saved' : 'Request submitted',
        description: asDraft
          ? 'Your request has been saved as a draft.'
          : 'Your request has been submitted for approval.',
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
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Section A & B combined: Request & Requester Info */}
        <div className="form-section animate-slide-up">
          <h2 className="form-section-title">Request Information</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="project" className="text-xs">Project / Site *</Label>
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
                <SelectTrigger id="project" className="h-9">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.filter((p) => p.status === 'active').map((project) => (
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

            <div className="space-y-1">
              <Label htmlFor="priority" className="text-xs">Priority *</Label>
              <Select
                value={formData.priority}
                onValueChange={(v) => setFormData({ ...formData, priority: v as any })}
              >
                <SelectTrigger id="priority" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="requiredDate" className="text-xs">Required Date</Label>
              <Input
                id="requiredDate"
                type="date"
                className="h-9"
                value={formData.requiredDate}
                onChange={(e) => setFormData({ ...formData, requiredDate: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Requester</Label>
              <Input value={profile?.full_name || ''} disabled className="bg-muted h-9 text-sm" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Designation</Label>
              <Input value={profile?.designation || ''} disabled className="bg-muted h-9 text-sm" />
            </div>

            <div className="col-span-2 space-y-1">
              <Label htmlFor="remarks" className="text-xs">Remarks</Label>
              <Input
                id="remarks"
                placeholder="Reason or notes..."
                className="h-9"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Section C: Add Materials */}
        <div className="form-section animate-slide-up" style={{ animationDelay: '100ms' }}>
          <h2 className="form-section-title">Add Materials</h2>

          {/* Search & Add Item Flow */}
          <div className="space-y-3">
            {/* Row 1: Search + Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1 relative">
                <Label className="text-xs">Search Material *</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Type to search stock items..."
                    className="h-9 pl-9"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentItem((prev) => ({ ...prev, name: e.target.value }));
                    }}
                  />
                </div>
                {searchQuery.trim() && filteredStock.length > 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 rounded-lg border border-border bg-popover shadow-md max-h-48 overflow-y-auto">
                    {filteredStock.map((entry) => (
                      <button
                        type="button"
                        key={`${entry.item}_${entry.description}_${entry.unit}`}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex justify-between items-center"
                        onClick={() => handleSelectStockItem(entry)}
                      >
                        <div className="truncate">
                          <span className="font-medium">{entry.item || entry.description}</span>
                          {entry.item && entry.description && (
                            <span className="text-muted-foreground ml-1 text-xs">({entry.description})</span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground ml-2 shrink-0">
                          {entry.qty} {entry.unit}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {searchQuery.trim() && filteredStock.length === 0 && !loadingStock && (
                  <p className="text-xs text-muted-foreground mt-1">No matching stock. You can still type a custom name.</p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Category *</Label>
                <Select
                  value={currentItem.category}
                  onValueChange={(v) => setCurrentItem((prev) => ({ ...prev, category: v }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.slug} value={cat.slug}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Qty, Unit, Spec, Brand + Add button */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
              <div className="space-y-1">
                <Label className="text-xs">Qty *</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="0"
                  className="h-9"
                  value={currentItem.quantity}
                  onChange={(e) => setCurrentItem((prev) => ({ ...prev, quantity: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Unit *</Label>
                <Select
                  value={currentItem.unit}
                  onValueChange={(v) => setCurrentItem((prev) => ({ ...prev, unit: v as Unit }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Specification</Label>
                <Input
                  placeholder="Grade, size..."
                  className="h-9"
                  value={currentItem.specification}
                  onChange={(e) => setCurrentItem((prev) => ({ ...prev, specification: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Brand</Label>
                <Input
                  placeholder="Optional"
                  className="h-9"
                  value={currentItem.preferredBrand}
                  onChange={(e) => setCurrentItem((prev) => ({ ...prev, preferredBrand: e.target.value }))}
                />
              </div>

              {canAddItem && (
                <Button
                  type="button"
                  variant="accent"
                  className="h-9"
                  onClick={handleAddItem}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              )}
            </div>

            {currentItem.name && currentItem.unit && (
              <p className="text-xs text-muted-foreground">
                Stock balance: {getBalance(currentItem.name, currentItem.unit)} {currentItem.unit}
              </p>
            )}
          </div>

          {/* Added Items Table */}
          {items.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Added Items ({items.length})
              </h3>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">#</TableHead>
                      <TableHead className="text-xs">Material</TableHead>
                      <TableHead className="text-xs">Category</TableHead>
                      <TableHead className="text-xs">Qty</TableHead>
                      <TableHead className="text-xs">Unit</TableHead>
                      <TableHead className="text-xs">Spec</TableHead>
                      <TableHead className="text-xs w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-xs py-2">{index + 1}</TableCell>
                        <TableCell className="text-xs py-2 font-medium">{item.name}</TableCell>
                        <TableCell className="text-xs py-2">{item.category}</TableCell>
                        <TableCell className="text-xs py-2">{item.quantity}</TableCell>
                        <TableCell className="text-xs py-2">{item.unit}</TableCell>
                        <TableCell className="text-xs py-2 text-muted-foreground">{item.specification || '—'}</TableCell>
                        <TableCell className="py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        {/* Section D: Attachments */}
        <div className="form-section animate-slide-up" style={{ animationDelay: '200ms' }}>
          <h2 className="form-section-title">Attachments</h2>

          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-1">
              Drag and drop files here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Site photos, drawings, BOQ extracts (Max 10MB each)
            </p>
            <Button variant="outline" size="sm" className="mt-3">
              Choose Files
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2 pb-4">
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

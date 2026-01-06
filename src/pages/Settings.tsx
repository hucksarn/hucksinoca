import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  User, 
  Bell, 
  Shield, 
  Building2, 
  Users,
  Save,
  Mail,
  Phone,
  Lock,
  Globe,
  Plus,
  Loader2,
  Trash2,
  Pencil,
  Tag
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { useMaterialCategories, useCreateMaterialCategory, useDeleteMaterialCategory, MaterialCategory, useUsers, useInvalidateUsers, UserWithProfile } from '@/hooks/useDatabase';

const emailSchema = z.string().email('Please enter a valid email');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

// Map designations to roles
const designationRoleMap: Record<string, 'admin' | 'user'> = {
  'System Admin': 'admin',
  'Procurement Manager': 'admin',
  'Project Manager': 'admin',
  'Site Supervisor': 'user',
  'Foreman': 'user',
};

export default function Settings() {
  const { toast } = useToast();
  const { profile, isAdmin, user } = useAuth();
  const [notifications, setNotifications] = useState({
    emailApprovals: true,
    emailUpdates: true,
    smsUrgent: false,
    inAppAll: true,
  });

  // User management state - now using React Query with caching
  const { data: users = [], isLoading: loadingUsers } = useUsers();
  const invalidateUsers = useInvalidateUsers();
  const [showAddUser, setShowAddUser] = useState(false);
  const [addingUser, setAddingUser] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    fullName: '',
    designation: 'Site Supervisor',
  });

  // Edit user state
  const [showEditUser, setShowEditUser] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithProfile | null>(null);
  const [editUserData, setEditUserData] = useState({
    email: '',
    password: '',
    fullName: '',
    designation: '',
  });
  const [updatingUser, setUpdatingUser] = useState(false);

  // Categories state
  const { data: categories = [], isLoading: categoriesLoading } = useMaterialCategories();
  const createCategory = useCreateMaterialCategory();
  const deleteCategory = useDeleteMaterialCategory();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);

  // Delete confirmation dialogs
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<MaterialCategory | null>(null);

  const designations = [
    'System Admin',
    'Procurement Manager',
    'Project Manager',
    'Site Supervisor',
    'Foreman',
  ];

  const handleAddUser = async () => {
    try {
      emailSchema.parse(newUser.email);
      passwordSchema.parse(newUser.password);
      if (!newUser.fullName.trim()) throw new Error('Full name is required');
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({ title: 'Validation Error', description: err.errors[0].message, variant: 'destructive' });
        return;
      }
      if (err instanceof Error) {
        toast({ title: 'Validation Error', description: err.message, variant: 'destructive' });
        return;
      }
    }

    setAddingUser(true);
    try {
      const role = designationRoleMap[newUser.designation] || 'user';
      
      // Call edge function to create user
      const response = await supabase.functions.invoke('create-user', {
        body: {
          email: newUser.email,
          password: newUser.password,
          fullName: newUser.fullName,
          designation: newUser.designation,
          role: role,
        },
      });

      if (response.error) throw response.error;

      toast({
        title: 'User Created',
        description: `${newUser.fullName} has been added successfully.`,
      });

      setShowAddUser(false);
      setNewUser({
        email: '',
        password: '',
        fullName: '',
        designation: 'Site Supervisor',
      });
      invalidateUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user',
        variant: 'destructive',
      });
    } finally {
      setAddingUser(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setDeletingUserId(userToDelete.id);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: userToDelete.id },
      });

      if (error) {
        console.error('Delete user error:', error);
        throw new Error(error.message || 'Failed to delete user');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: 'User Deleted',
        description: `${userToDelete.name} has been removed.`,
      });
      invalidateUsers();
    } catch (error: any) {
      console.error('Delete user catch:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user',
        variant: 'destructive',
      });
    } finally {
      setDeletingUserId(null);
      setUserToDelete(null);
    }
  };

  const handleEditUser = (userToEdit: UserWithProfile) => {
    setEditingUser(userToEdit);
    setEditUserData({
      email: userToEdit.email || '',
      password: '',
      fullName: userToEdit.full_name,
      designation: userToEdit.designation,
    });
    setShowEditUser(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    // Validate inputs
    try {
      if (editUserData.email) {
        emailSchema.parse(editUserData.email);
      }
      if (editUserData.password) {
        passwordSchema.parse(editUserData.password);
      }
      if (!editUserData.fullName.trim()) {
        throw new Error('Full name is required');
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({ title: 'Validation Error', description: err.errors[0].message, variant: 'destructive' });
        return;
      }
      if (err instanceof Error) {
        toast({ title: 'Validation Error', description: err.message, variant: 'destructive' });
        return;
      }
    }

    setUpdatingUser(true);
    try {
      const role = designationRoleMap[editUserData.designation] || 'user';
      
      const { data, error } = await supabase.functions.invoke('update-user', {
        body: {
          userId: editingUser.id,
          email: editUserData.email || undefined,
          password: editUserData.password || undefined,
          fullName: editUserData.fullName,
          designation: editUserData.designation,
          role: role,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'User Updated',
        description: editUserData.password 
          ? `${editUserData.fullName} updated. They must change password on next login.`
          : `${editUserData.fullName} has been updated.`,
      });

      setShowEditUser(false);
      setEditingUser(null);
      invalidateUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user',
        variant: 'destructive',
      });
    } finally {
      setUpdatingUser(false);
    }
  };

  const handleSave = () => {
    toast({
      title: 'Settings saved',
      description: 'Your preferences have been updated successfully.',
    });
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({ title: 'Error', description: 'Category name is required', variant: 'destructive' });
      return;
    }

    setAddingCategory(true);
    try {
      await createCategory.mutateAsync({ name: newCategoryName.trim() });
      toast({ title: 'Category Added', description: `${newCategoryName} has been added.` });
      setNewCategoryName('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add category',
        variant: 'destructive',
      });
    } finally {
      setAddingCategory(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    setDeletingCategoryId(categoryToDelete.id);
    try {
      await deleteCategory.mutateAsync(categoryToDelete.id);
      toast({ title: 'Category Deleted', description: `${categoryToDelete.name} has been removed.` });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete category',
        variant: 'destructive',
      });
    } finally {
      setDeletingCategoryId(null);
      setCategoryToDelete(null);
    }
  };

  return (
    <MainLayout 
      title="Settings" 
      subtitle="Manage your account and system preferences"
    >
      <Tabs defaultValue={isAdmin ? "users" : "profile"} className="space-y-4 md:space-y-6">
        <TabsList className="bg-muted/50 p-1 flex flex-wrap h-auto gap-1">
          {isAdmin && (
            <TabsTrigger value="users" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3 py-1.5">
              <Users className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">User Management</span>
              <span className="sm:hidden">Users</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="profile" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3 py-1.5">
            <User className="h-3 w-3 md:h-4 md:w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3 py-1.5">
            <Bell className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Notifications</span>
            <span className="sm:hidden">Alerts</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3 py-1.5">
            <Shield className="h-3 w-3 md:h-4 md:w-4" />
            Security
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="categories" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3 py-1.5">
              <Tag className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Categories</span>
              <span className="sm:hidden">Tags</span>
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="organization" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3 py-1.5">
              <Building2 className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Organization</span>
              <span className="sm:hidden">Org</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* User Management Tab (Admin Only) */}
        {isAdmin && (
          <TabsContent value="users" className="space-y-3 md:space-y-6">
            <div className="bg-card rounded-xl border border-border p-2 md:p-6">
              <div className="flex items-center justify-between gap-2 mb-3 md:mb-6">
                <div>
                  <h3 className="text-sm md:text-lg font-semibold text-foreground">User Management</h3>
                  <p className="text-xs text-muted-foreground hidden md:block">Create and manage system users</p>
                </div>
                <Button variant="accent" size="sm" className="h-7 md:h-9 text-xs md:text-sm px-2 md:px-3" onClick={() => setShowAddUser(true)}>
                  <Plus className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Add User</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>

              {loadingUsers ? (
                <div className="flex items-center justify-center py-6 md:py-12">
                  <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin text-muted-foreground" />
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-6 md:py-12 text-muted-foreground">
                  <Users className="h-8 w-8 md:h-12 md:w-12 mx-auto mb-2 md:mb-4 opacity-50" />
                  <p className="text-xs md:text-sm">No users found. Add your first user.</p>
                </div>
              ) : (
                <div className="space-y-1.5 md:space-y-3">
                {users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-2 md:p-4 rounded-lg bg-muted/50 gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="h-7 w-7 md:h-10 md:w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-[10px] md:text-sm shrink-0">
                          {u.full_name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground text-xs md:text-base truncate">{u.full_name}</p>
                          <p className="text-[10px] md:text-sm text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 md:gap-2 shrink-0">
                        <span className={`px-1.5 md:px-2 py-0.5 rounded-full text-[10px] md:text-xs font-medium ${
                          u.role === 'admin' 
                            ? 'bg-primary/10 text-primary' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {u.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                        
                        {(u.designation !== 'System Admin' || profile?.designation === 'System Admin') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleEditUser(u)}
                          >
                            <Pencil className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                        )}
                        
                        {u.id !== user?.id && u.designation !== 'System Admin' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 md:h-8 md:w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setUserToDelete({ id: u.id, name: u.full_name })}
                            disabled={deletingUserId === u.id}
                          >
                            {deletingUserId === u.id ? (
                              <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                            )}
                          </Button>
                        )}
                        
                        {u.designation === 'System Admin' && u.id !== user?.id && profile?.designation !== 'System Admin' && (
                          <span className="text-[10px] text-muted-foreground">Protected</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        )}

        {/* Categories Tab (Admin Only) */}
        {isAdmin && (
          <TabsContent value="categories" className="space-y-4 md:space-y-6">
            <div className="bg-card rounded-xl border border-border p-3 md:p-6">
              <div className="mb-4 md:mb-6">
                <h3 className="text-base md:text-lg font-semibold text-foreground">Material Categories</h3>
                <p className="text-xs md:text-sm text-muted-foreground">Manage categories for material requests</p>
              </div>

              {/* Add new category */}
              <div className="flex flex-col sm:flex-row gap-2 md:gap-3 mb-4 md:mb-6">
                <Input
                  placeholder="Enter new category name..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                  className="flex-1 text-sm"
                />
                <Button 
                  variant="accent"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={handleAddCategory}
                  disabled={addingCategory || !newCategoryName.trim()}
                >
                  {addingCategory ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Add Category
                </Button>
              </div>

              {/* Categories list */}
              {categoriesLoading ? (
                <div className="flex items-center justify-center py-8 md:py-12">
                  <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin text-muted-foreground" />
                </div>
              ) : categories.length === 0 ? (
                <div className="text-center py-8 md:py-12 text-muted-foreground">
                  <Tag className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 opacity-50" />
                  <p className="text-sm">No categories found. Add your first category above.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div 
                      key={category.id} 
                      className="flex items-center justify-between p-2.5 md:p-3 rounded-lg bg-muted/50 gap-2"
                    >
                      <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                        <Tag className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-foreground text-sm truncate">{category.name}</span>
                        <span className="text-xs text-muted-foreground hidden sm:inline">({category.slug})</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 md:h-8 md:w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => setCategoryToDelete(category)}
                        disabled={deletingCategoryId === category.id}
                      >
                        {deletingCategoryId === category.id ? (
                          <Loader2 className="h-3.5 w-3.5 md:h-4 md:w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        )}

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4 md:space-y-6">
          <div className="bg-card rounded-xl border border-border p-3 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-foreground mb-4 md:mb-6">Personal Information</h3>
            
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 md:gap-6 mb-4 md:mb-6">
              <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-accent flex items-center justify-center text-accent-foreground text-xl md:text-2xl font-bold shrink-0">
                {profile?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
              </div>
              <div className="space-y-2 text-center sm:text-left">
                <Button variant="outline" size="sm">Change Photo</Button>
                <p className="text-xs text-muted-foreground">JPG, PNG or GIF. Max 2MB.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="fullName" className="text-sm">Full Name</Label>
                <Input id="fullName" defaultValue={profile?.full_name || ''} className="text-sm" />
              </div>
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="phone" className="text-sm">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="phone" defaultValue={profile?.phone || ''} className="pl-10 text-sm" />
                </div>
              </div>
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="designation" className="text-sm">Designation</Label>
                <Input id="designation" defaultValue={profile?.designation || ''} disabled className="bg-muted text-sm" />
              </div>
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="role" className="text-sm">Role</Label>
                <Input id="role" defaultValue={isAdmin ? 'Admin' : 'User'} disabled className="bg-muted text-sm" />
              </div>
            </div>

            <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-border flex justify-end">
              <Button variant="accent" size="sm" className="w-full sm:w-auto" onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4 md:space-y-6">
          <div className="bg-card rounded-xl border border-border p-3 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-foreground mb-4 md:mb-6">Notification Preferences</h3>
            
            <div className="space-y-4 md:space-y-6">
              <div className="space-y-3 md:space-y-4">
                <h4 className="font-medium text-foreground text-sm md:text-base">Email Notifications</h4>
                
                <div className="flex items-center justify-between py-2.5 md:py-3 border-b border-border gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-sm">Approval Requests</p>
                    <p className="text-xs md:text-sm text-muted-foreground">Receive emails when requests need your approval</p>
                  </div>
                  <Switch 
                    checked={notifications.emailApprovals}
                    onCheckedChange={(v) => setNotifications({ ...notifications, emailApprovals: v })}
                  />
                </div>

                <div className="flex items-center justify-between py-2.5 md:py-3 border-b border-border gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-sm">Status Updates</p>
                    <p className="text-xs md:text-sm text-muted-foreground">Get notified when your requests are updated</p>
                  </div>
                  <Switch 
                    checked={notifications.emailUpdates}
                    onCheckedChange={(v) => setNotifications({ ...notifications, emailUpdates: v })}
                  />
                </div>
              </div>

              <div className="space-y-3 md:space-y-4">
                <h4 className="font-medium text-foreground text-sm md:text-base">SMS Notifications</h4>
                
                <div className="flex items-center justify-between py-2.5 md:py-3 border-b border-border gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-sm">Urgent Requests Only</p>
                    <p className="text-xs md:text-sm text-muted-foreground">SMS alerts for urgent material requests</p>
                  </div>
                  <Switch 
                    checked={notifications.smsUrgent}
                    onCheckedChange={(v) => setNotifications({ ...notifications, smsUrgent: v })}
                  />
                </div>
              </div>

              <div className="space-y-3 md:space-y-4">
                <h4 className="font-medium text-foreground text-sm md:text-base">In-App Notifications</h4>
                
                <div className="flex items-center justify-between py-2.5 md:py-3 border-b border-border gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-sm">All Activity</p>
                    <p className="text-xs md:text-sm text-muted-foreground">Show notifications for all procurement activity</p>
                  </div>
                  <Switch 
                    checked={notifications.inAppAll}
                    onCheckedChange={(v) => setNotifications({ ...notifications, inAppAll: v })}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-border flex justify-end">
              <Button variant="accent" size="sm" className="w-full sm:w-auto" onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Preferences
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4 md:space-y-6">
          <div className="bg-card rounded-xl border border-border p-3 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-foreground mb-4 md:mb-6">Security Settings</h3>
            
            <div className="space-y-4 md:space-y-6">
              <div className="space-y-3 md:space-y-4">
                <h4 className="font-medium text-foreground flex items-center gap-2 text-sm md:text-base">
                  <Lock className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  Change Password
                </h4>
                
                <div className="grid grid-cols-1 gap-3 md:gap-4 max-w-xl">
                  <div className="space-y-1.5 md:space-y-2">
                    <Label htmlFor="newPassword" className="text-sm">New Password</Label>
                    <Input id="newPassword" type="password" className="text-sm" />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm">Confirm Password</Label>
                    <Input id="confirmPassword" type="password" className="text-sm" />
                  </div>
                </div>

                <Button variant="outline" size="sm">Update Password</Button>
              </div>

              <div className="pt-4 md:pt-6 border-t border-border space-y-3 md:space-y-4">
                <h4 className="font-medium text-foreground text-sm md:text-base">Active Sessions</h4>
                <div className="p-3 md:p-4 rounded-lg bg-muted/50 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    <div className="p-1.5 md:p-2 rounded-lg bg-success/10 shrink-0">
                      <Globe className="h-3.5 w-3.5 md:h-4 md:w-4 text-success" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm">Current Session</p>
                      <p className="text-xs text-muted-foreground">Active now</p>
                    </div>
                  </div>
                  <span className="text-xs text-success shrink-0">Active</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Organization Tab */}
        {isAdmin && (
          <TabsContent value="organization" className="space-y-4 md:space-y-6">
            <div className="bg-card rounded-xl border border-border p-3 md:p-6">
              <h3 className="text-base md:text-lg font-semibold text-foreground mb-4 md:mb-6">Organization Settings</h3>
              
              <div className="grid grid-cols-1 gap-3 md:gap-6">
                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="companyName" className="text-sm">Company Name</Label>
                  <Input id="companyName" defaultValue="" placeholder="Your Company Name" className="text-sm" />
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="industry" className="text-sm">Industry</Label>
                  <Select defaultValue="construction">
                    <SelectTrigger id="industry" className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="construction">Construction</SelectItem>
                      <SelectItem value="infrastructure">Infrastructure</SelectItem>
                      <SelectItem value="realestate">Real Estate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="address" className="text-sm">Business Address</Label>
                  <Textarea 
                    id="address" 
                    placeholder="Enter your business address"
                    rows={3}
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-border flex justify-end">
                <Button variant="accent" size="sm" className="w-full sm:w-auto" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Add User Dialog */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">Add New User</DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Create a new user account. They will receive login credentials.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 md:space-y-4 py-2 md:py-4">
            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor="newUserName" className="text-sm">Full Name *</Label>
              <Input
                id="newUserName"
                placeholder="John Doe"
                value={newUser.fullName}
                onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor="newUserEmail" className="text-sm">Email *</Label>
              <Input
                id="newUserEmail"
                type="email"
                placeholder="user@example.com"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor="newUserPassword" className="text-sm">Password *</Label>
              <Input
                id="newUserPassword"
                type="password"
                placeholder="Minimum 6 characters"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor="newUserDesignation" className="text-sm">Designation</Label>
              <Select 
                value={newUser.designation} 
                onValueChange={(v) => setNewUser({ ...newUser, designation: v })}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {designations.map((d) => (
                    <SelectItem key={d} value={d} className="text-sm">
                      {d} {designationRoleMap[d] === 'admin' ? '(Admin)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Procurement Manager & Project Manager get Admin access
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setShowAddUser(false)} disabled={addingUser}>
              Cancel
            </Button>
            <Button variant="accent" size="sm" className="w-full sm:w-auto" onClick={handleAddUser} disabled={addingUser}>
              {addingUser ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create User
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditUser} onOpenChange={setShowEditUser}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">Edit User</DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Update user details. Leave password empty to keep current password.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 md:space-y-4 py-2 md:py-4">
            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor="editUserName" className="text-sm">Full Name *</Label>
              <Input
                id="editUserName"
                value={editUserData.fullName}
                onChange={(e) => setEditUserData({ ...editUserData, fullName: e.target.value })}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor="editUserEmail" className="text-sm">Email</Label>
              <Input
                id="editUserEmail"
                type="email"
                placeholder="Leave empty to keep current"
                value={editUserData.email}
                onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor="editUserPassword" className="text-sm">New Password</Label>
              <Input
                id="editUserPassword"
                type="password"
                placeholder="Leave empty to keep current"
                value={editUserData.password}
                onChange={(e) => setEditUserData({ ...editUserData, password: e.target.value })}
                className="text-sm"
              />
              {editUserData.password && (
                <p className="text-xs text-warning">User will be required to change password on next login</p>
              )}
            </div>
            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor="editUserDesignation" className="text-sm">Designation</Label>
              <Select 
                value={editUserData.designation} 
                onValueChange={(v) => setEditUserData({ ...editUserData, designation: v })}
                disabled={editingUser?.designation === 'System Admin'}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {designations.map((d) => (
                    <SelectItem key={d} value={d} className="text-sm">
                      {d} {designationRoleMap[d] === 'admin' ? '(Admin)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setShowEditUser(false)} disabled={updatingUser}>
              Cancel
            </Button>
            <Button variant="accent" size="sm" className="w-full sm:w-auto" onClick={handleUpdateUser} disabled={updatingUser}>
              {updatingUser ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base md:text-lg">Delete User</AlertDialogTitle>
            <AlertDialogDescription className="text-xs md:text-sm">
              Are you sure you want to delete <span className="font-medium">{userToDelete?.name}</span>? This action cannot be undone. All data associated with this user will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto" disabled={!!deletingUserId}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={!!deletingUserId}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingUserId ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete User
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Category Confirmation Dialog */}
      <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base md:text-lg">Delete Category</AlertDialogTitle>
            <AlertDialogDescription className="text-xs md:text-sm">
              Are you sure you want to delete <span className="font-medium">"{categoryToDelete?.name}"</span>? This action cannot be undone. Material requests using this category may be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto" disabled={!!deletingCategoryId}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              disabled={!!deletingCategoryId}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingCategoryId ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Category
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}

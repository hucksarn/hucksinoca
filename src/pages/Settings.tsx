import { useState, useEffect } from 'react';
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
  UserCog
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

interface UserWithProfile {
  id: string;
  email: string;
  full_name: string;
  designation: string;
  role: 'admin' | 'user';
}

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

  // User management state
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [addingUser, setAddingUser] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    fullName: '',
    designation: 'Site Supervisor',
  });

  const designations = [
    'System Admin',
    'Procurement Manager',
    'Project Manager',
    'Site Supervisor',
    'Foreman',
  ];

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      // Get all profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, designation');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // We need to get emails from a different approach since we can't query auth.users directly
      // For now, we'll show what we have from profiles
      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
      
      const userList: UserWithProfile[] = (profiles || []).map(p => ({
        id: p.user_id,
        email: '', // Will be fetched separately or shown as "Hidden"
        full_name: p.full_name,
        designation: p.designation,
        role: (roleMap.get(p.user_id) || 'user') as 'admin' | 'user',
      }));

      setUsers(userList);
    } catch (error: any) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

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
      fetchUsers();
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

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      return;
    }

    setDeletingUserId(userId);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
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
        description: `${userName} has been removed.`,
      });
      fetchUsers();
    } catch (error: any) {
      console.error('Delete user catch:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user',
        variant: 'destructive',
      });
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleSave = () => {
    toast({
      title: 'Settings saved',
      description: 'Your preferences have been updated successfully.',
    });
  };

  return (
    <MainLayout 
      title="Settings" 
      subtitle="Manage your account and system preferences"
    >
      <Tabs defaultValue={isAdmin ? "users" : "profile"} className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          {isAdmin && (
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              User Management
            </TabsTrigger>
          )}
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="organization" className="gap-2">
              <Building2 className="h-4 w-4" />
              Organization
            </TabsTrigger>
          )}
        </TabsList>

        {/* User Management Tab (Admin Only) */}
        {isAdmin && (
          <TabsContent value="users" className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">User Management</h3>
                  <p className="text-sm text-muted-foreground">Create and manage system users</p>
                </div>
                <Button variant="accent" onClick={() => setShowAddUser(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>

              {loadingUsers ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No users found. Add your first user to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                {users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                          {u.full_name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{u.full_name}</p>
                          <p className="text-sm text-muted-foreground">{u.designation}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          u.role === 'admin' 
                            ? 'bg-primary/10 text-primary' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {u.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                        {u.id !== user?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteUser(u.id, u.full_name)}
                            disabled={deletingUserId === u.id}
                          >
                            {deletingUserId === u.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        )}

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6">Personal Information</h3>
            
            <div className="flex items-start gap-6 mb-6">
              <div className="h-20 w-20 rounded-full bg-accent flex items-center justify-center text-accent-foreground text-2xl font-bold">
                {profile?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
              </div>
              <div className="space-y-2">
                <Button variant="outline" size="sm">Change Photo</Button>
                <p className="text-xs text-muted-foreground">JPG, PNG or GIF. Max 2MB.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" defaultValue={profile?.full_name || ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="phone" defaultValue={profile?.phone || ''} className="pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="designation">Designation</Label>
                <Input id="designation" defaultValue={profile?.designation || ''} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input id="role" defaultValue={isAdmin ? 'Admin' : 'User'} disabled className="bg-muted" />
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-border flex justify-end">
              <Button variant="accent" onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6">Notification Preferences</h3>
            
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium text-foreground">Email Notifications</h4>
                
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div>
                    <p className="font-medium text-foreground">Approval Requests</p>
                    <p className="text-sm text-muted-foreground">Receive emails when requests need your approval</p>
                  </div>
                  <Switch 
                    checked={notifications.emailApprovals}
                    onCheckedChange={(v) => setNotifications({ ...notifications, emailApprovals: v })}
                  />
                </div>

                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div>
                    <p className="font-medium text-foreground">Status Updates</p>
                    <p className="text-sm text-muted-foreground">Get notified when your requests are updated</p>
                  </div>
                  <Switch 
                    checked={notifications.emailUpdates}
                    onCheckedChange={(v) => setNotifications({ ...notifications, emailUpdates: v })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-foreground">SMS Notifications</h4>
                
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div>
                    <p className="font-medium text-foreground">Urgent Requests Only</p>
                    <p className="text-sm text-muted-foreground">SMS alerts for urgent material requests</p>
                  </div>
                  <Switch 
                    checked={notifications.smsUrgent}
                    onCheckedChange={(v) => setNotifications({ ...notifications, smsUrgent: v })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-foreground">In-App Notifications</h4>
                
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div>
                    <p className="font-medium text-foreground">All Activity</p>
                    <p className="text-sm text-muted-foreground">Show notifications for all procurement activity</p>
                  </div>
                  <Switch 
                    checked={notifications.inAppAll}
                    onCheckedChange={(v) => setNotifications({ ...notifications, inAppAll: v })}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-border flex justify-end">
              <Button variant="accent" onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Preferences
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6">Security Settings</h3>
            
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Change Password
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input id="newPassword" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input id="confirmPassword" type="password" />
                  </div>
                </div>

                <Button variant="outline">Update Password</Button>
              </div>

              <div className="pt-6 border-t border-border space-y-4">
                <h4 className="font-medium text-foreground">Active Sessions</h4>
                <div className="p-4 rounded-lg bg-muted/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-success/10">
                      <Globe className="h-4 w-4 text-success" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Current Session</p>
                      <p className="text-xs text-muted-foreground">Active now</p>
                    </div>
                  </div>
                  <span className="text-xs text-success">Active</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Organization Tab */}
        {isAdmin && (
          <TabsContent value="organization" className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-6">Organization Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input id="companyName" defaultValue="" placeholder="Your Company Name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select defaultValue="construction">
                    <SelectTrigger id="industry">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="construction">Construction</SelectItem>
                      <SelectItem value="infrastructure">Infrastructure</SelectItem>
                      <SelectItem value="realestate">Real Estate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="address">Business Address</Label>
                  <Textarea 
                    id="address" 
                    placeholder="Enter your business address"
                    rows={3}
                  />
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border flex justify-end">
                <Button variant="accent" onClick={handleSave}>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account. They will receive login credentials.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newUserName">Full Name *</Label>
              <Input
                id="newUserName"
                placeholder="John Doe"
                value={newUser.fullName}
                onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newUserEmail">Email *</Label>
              <Input
                id="newUserEmail"
                type="email"
                placeholder="user@example.com"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newUserPassword">Password *</Label>
              <Input
                id="newUserPassword"
                type="password"
                placeholder="Minimum 6 characters"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newUserDesignation">Designation</Label>
              <Select 
                value={newUser.designation} 
                onValueChange={(v) => setNewUser({ ...newUser, designation: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {designations.map((d) => (
                    <SelectItem key={d} value={d}>
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUser(false)} disabled={addingUser}>
              Cancel
            </Button>
            <Button variant="accent" onClick={handleAddUser} disabled={addingUser}>
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
    </MainLayout>
  );
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { isLocalMode, projectsApi, categoriesApi, requestsApi, approvalsApi, dashboardApi, usersApi, stockApi as stockApiLocal } from '@/lib/api';

export interface Project {
  id: string;
  name: string;
  location: string;
  status: string;
}

export interface MaterialCategory {
  id: string;
  name: string;
  slug: string;
}

export interface MaterialRequest {
  id: string;
  request_number: string;
  project_id: string;
  request_type: string;
  priority: string;
  required_date: string | null;
  remarks: string | null;
  requester_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  project_name?: string;
  requester_name?: string;
  requester_designation?: string;
  items_count?: number;
}

export interface MaterialRequestItem {
  id: string;
  request_id: string;
  category: string;
  name: string;
  specification: string | null;
  quantity: number;
  unit: string;
  preferred_brand: string | null;
}

// Helper to get supabase lazily (only in cloud mode)
async function getSupabase() {
  const { supabase } = await import('@/integrations/supabase/client');
  return supabase;
}

// ──────────── PROJECTS ────────────

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      if (isLocalMode) {
        return projectsApi.list() as Promise<Project[]>;
      }
      const supabase = await getSupabase();
      const { data, error } = await supabase.from('projects').select('*').order('name');
      if (error) throw error;
      return data as Project[];
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, location }: { name: string; location: string }) => {
      if (isLocalMode) {
        return projectsApi.create({ name, location }) as Promise<Project>;
      }
      const supabase = await getSupabase();
      const { data, error } = await supabase.from('projects').insert({ name, location, status: 'active' }).select().single();
      if (error) throw error;
      return data as Project;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['projects'] }); },
  });
}

// ──────────── MATERIAL REQUESTS ────────────

export function useMaterialRequests() {
  const { user, isAdmin } = useAuth();
  return useQuery({
    queryKey: ['material_requests', (user as any)?.id, isAdmin],
    queryFn: async () => {
      if (isLocalMode) {
        return requestsApi.list() as Promise<MaterialRequest[]>;
      }
      const supabase = await getSupabase();
      let query = supabase.from('material_requests').select('*').order('created_at', { ascending: false });
      if (!isAdmin) query = query.eq('requester_id', (user as any)!.id);
      const { data: requests, error } = await query;
      if (error) throw error;

      const { data: projects } = await supabase.from('projects').select('id, name');
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, designation');
      const { data: items } = await supabase.from('material_request_items').select('request_id');

      const projectMap = new Map(projects?.map(p => [p.id, p]) || []);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const itemsCountMap = new Map<string, number>();
      items?.forEach(item => {
        itemsCountMap.set(item.request_id, (itemsCountMap.get(item.request_id) || 0) + 1);
      });

      return requests.map(req => ({
        ...req,
        project_name: projectMap.get(req.project_id)?.name || 'Unknown Project',
        requester_name: profileMap.get(req.requester_id)?.full_name || 'Unknown',
        requester_designation: profileMap.get(req.requester_id)?.designation || '',
        items_count: itemsCountMap.get(req.id) || 0,
      })) as MaterialRequest[];
    },
    enabled: !!user,
  });
}

export function usePendingApprovals() {
  const { user, isAdmin } = useAuth();
  return useQuery({
    queryKey: ['pending_approvals', (user as any)?.id],
    queryFn: async () => {
      if (isLocalMode) {
        return approvalsApi.pending() as Promise<MaterialRequest[]>;
      }
      const supabase = await getSupabase();
      const { data: requests, error } = await supabase.from('material_requests').select('*').eq('status', 'submitted').order('created_at', { ascending: false });
      if (error) throw error;

      const { data: projects } = await supabase.from('projects').select('id, name');
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, designation');

      const projectMap = new Map(projects?.map(p => [p.id, p]) || []);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return requests.map(req => ({
        ...req,
        project_name: projectMap.get(req.project_id)?.name || 'Unknown Project',
        requester_name: profileMap.get(req.requester_id)?.full_name || 'Unknown',
        requester_designation: profileMap.get(req.requester_id)?.designation || '',
      })) as MaterialRequest[];
    },
    enabled: !!user && isAdmin,
  });
}

export function useMaterialRequestItems(requestId: string) {
  return useQuery({
    queryKey: ['material_request_items', requestId],
    queryFn: async () => {
      if (isLocalMode) {
        const detail = await requestsApi.get(requestId);
        return (detail.items || []) as MaterialRequestItem[];
      }
      const supabase = await getSupabase();
      const { data, error } = await supabase.from('material_request_items').select('*').eq('request_id', requestId);
      if (error) throw error;
      return data as MaterialRequestItem[];
    },
    enabled: !!requestId,
  });
}

export function useCreateMaterialRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      projectId, priority, requiredDate, remarks, items, status,
    }: {
      projectId: string; priority: string; requiredDate: string | null; remarks: string;
      items: Omit<MaterialRequestItem, 'id' | 'request_id'>[]; status: 'draft' | 'submitted';
    }) => {
      if (!user) throw new Error('You must be logged in');

      if (isLocalMode) {
        return requestsApi.create({
          project_id: projectId, priority, required_date: requiredDate, remarks, items, status,
        });
      }

      const supabase = await getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session expired. Please log in again.');

      const { data: request, error: requestError } = await supabase
        .from('material_requests')
        .insert({
          project_id: projectId, request_type: 'stock_request', priority,
          required_date: requiredDate || null, remarks, requester_id: session.user.id,
          request_number: 'TEMP', status: 'draft',
        })
        .select().single();
      if (requestError) throw requestError;

      if (items.length > 0) {
        for (const item of items) {
          const { error } = await supabase.from('material_request_items').insert({
            request_id: request.id, category: item.category, name: item.name,
            specification: item.specification, quantity: item.quantity,
            unit: item.unit, preferred_brand: item.preferred_brand,
          });
          if (error) throw error;
        }
      }

      if (status === 'submitted') {
        const { data: updated, error: updateError } = await supabase
          .from('material_requests').update({ status: 'submitted' }).eq('id', request.id).select().single();
        if (updateError) throw updateError;
        return updated;
      }
      return request;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['material_requests'] }); },
  });
}

export function useApproveRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ requestId, comment, requestType }: { requestId: string; comment?: string; requestType: string }) => {
      if (isLocalMode) {
        return approvalsApi.create({ request_id: requestId, action: 'approved', comment, request_type: requestType });
      }
      const supabase = await getSupabase();
      const { error: updateError } = await supabase.from('material_requests').update({ status: 'approved', request_type: requestType }).eq('id', requestId);
      if (updateError) throw updateError;
      const { error: approvalError } = await supabase.from('approvals').insert({
        request_id: requestId, user_id: (user as any)!.id, action: 'approved', comment,
      });
      if (approvalError) throw approvalError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material_requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending_approvals'] });
      queryClient.invalidateQueries({ queryKey: ['pending_count'] });
    },
  });
}

export function useRejectRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ requestId, comment }: { requestId: string; comment: string }) => {
      if (isLocalMode) {
        return approvalsApi.create({ request_id: requestId, action: 'rejected', comment });
      }
      const supabase = await getSupabase();
      const { error: updateError } = await supabase.from('material_requests').update({ status: 'pm_rejected' }).eq('id', requestId);
      if (updateError) throw updateError;
      const { error: approvalError } = await supabase.from('approvals').insert({
        request_id: requestId, user_id: (user as any)!.id, action: 'rejected', comment,
      });
      if (approvalError) throw approvalError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material_requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending_approvals'] });
    },
  });
}

export function useDeleteMaterialRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      if (isLocalMode) {
        return requestsApi.remove(requestId);
      }
      const supabase = await getSupabase();
      const { error: itemsError } = await supabase.from('material_request_items').delete().eq('request_id', requestId);
      if (itemsError) throw itemsError;
      const { error } = await supabase.from('material_requests').delete().eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material_requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending_approvals'] });
      queryClient.invalidateQueries({ queryKey: ['pending_count'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_metrics'] });
    },
  });
}

export function usePendingRequestsCount() {
  const { user, isAdmin } = useAuth();
  return useQuery({
    queryKey: ['pending_count', (user as any)?.id],
    queryFn: async () => {
      if (isLocalMode) {
        return approvalsApi.pendingCount();
      }
      const supabase = await getSupabase();
      const { count, error } = await supabase.from('material_requests').select('*', { count: 'exact', head: true }).eq('status', 'submitted');
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user && isAdmin,
  });
}

export function useDashboardMetrics() {
  const { user, isAdmin } = useAuth();
  return useQuery({
    queryKey: ['dashboard_metrics', (user as any)?.id, isAdmin],
    queryFn: async () => {
      if (isLocalMode) {
        return dashboardApi.metrics();
      }
      const supabase = await getSupabase();
      const { data: requests, error } = await supabase.from('material_requests').select('status, priority');
      if (error) throw error;
      const total = requests?.length || 0;
      const pending = requests?.filter(r => r.status === 'submitted').length || 0;
      const approved = requests?.filter(r => r.status === 'pm_approved').length || 0;
      const urgent = requests?.filter(r => r.priority === 'urgent').length || 0;
      return [
        { label: 'Total Requests', value: total, trend: 'up' as const, change: 12 },
        { label: 'Pending Approval', value: pending, trend: 'neutral' as const },
        { label: 'Approved', value: approved, trend: 'up' as const, change: 8 },
        { label: 'Urgent', value: urgent, trend: 'down' as const, change: -3 },
      ];
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

// ──────────── MATERIAL CATEGORIES ────────────

export function useMaterialCategories() {
  return useQuery({
    queryKey: ['material_categories'],
    queryFn: async () => {
      if (isLocalMode) {
        return categoriesApi.list() as Promise<MaterialCategory[]>;
      }
      const supabase = await getSupabase();
      const { data, error } = await supabase.from('material_categories').select('*').order('name');
      if (error) throw error;
      return data as MaterialCategory[];
    },
  });
}

export function useCreateMaterialCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      if (isLocalMode) {
        return categoriesApi.create({ name }) as Promise<MaterialCategory>;
      }
      const supabase = await getSupabase();
      const slug = name.toLowerCase().replace(/\s+/g, '_');
      const { data, error } = await supabase.from('material_categories').insert({ name, slug }).select().single();
      if (error) throw error;
      return data as MaterialCategory;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['material_categories'] }); },
  });
}

export function useDeleteMaterialCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (categoryId: string) => {
      if (isLocalMode) {
        return categoriesApi.remove(categoryId);
      }
      const supabase = await getSupabase();
      const { error } = await supabase.from('material_categories').delete().eq('id', categoryId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['material_categories'] }); },
  });
}

// ──────────── USERS ────────────

export interface UserWithProfile {
  id: string;
  email: string;
  full_name: string;
  designation: string;
  role: 'admin' | 'user';
}

export function useUsers() {
  const { isAdmin } = useAuth();
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      if (isLocalMode) {
        return usersApi.list() as Promise<UserWithProfile[]>;
      }
      const supabase = await getSupabase();
      const { data, error } = await supabase.functions.invoke('list-users');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return (data?.users || []) as UserWithProfile[];
    },
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['users'] });
}

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { isLocalMode, getAuthToken } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function ProjectApprovedItems() {
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        if (isLocalMode) {
          const token = getAuthToken();
          const res = await fetch(`/api/projects/${id}/approved-items`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          if (!res.ok) throw new Error('Failed to load approved items');
          const data = await res.json();
          setItems(Array.isArray(data.items) ? data.items : []);
        } else {
          const { supabase } = await import('@/integrations/supabase/client');
          const { data, error } = await supabase
            .from('material_requests')
            .select('id, request_number, created_at, approvals(created_at, action), material_request_items(*)')
            .eq('project_id', id)
            .eq('status', 'approved');
          if (error) throw error;
          const flat = (data || []).flatMap((r: any) =>
            (r.material_request_items || []).map((it: any) => ({
              ...it,
              request_number: r.request_number,
              created_at: r.created_at,
              approved_at: (r.approvals || []).filter((a: any) => a.action === 'approved')
                .map((a: any) => a.created_at)
                .sort()
                .slice(-1)[0],
            })),
          );
          setItems(flat);
        }
      } catch (error: any) {
        toast({ title: 'Error', description: error.message || 'Failed to load approved items', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id, toast]);

  return (
    <MainLayout title="Approved Items" subtitle="Approved material requests for this project">
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border p-3 md:p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Approved</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Category</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No approved items for this project.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs">{item.request_number || '-'}</TableCell>
                    <TableCell className="text-xs">{item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}</TableCell>
                    <TableCell className="text-xs">{item.approved_at ? new Date(item.approved_at).toLocaleDateString() : '-'}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.specification || '-'}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-xs">{item.category || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </MainLayout>
  );
}

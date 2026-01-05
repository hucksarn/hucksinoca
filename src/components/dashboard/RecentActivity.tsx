import { CheckCircle, XCircle, Clock, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'approved' | 'rejected' | 'submitted' | 'updated';
  message: string;
  time: string;
}

const activityIcons = {
  approved: { icon: CheckCircle, className: 'text-success' },
  rejected: { icon: XCircle, className: 'text-destructive' },
  submitted: { icon: Clock, className: 'text-info' },
  updated: { icon: FileText, className: 'text-warning' },
};

export function RecentActivity() {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const items: ActivityItem[] = [];

      // Fetch recent approvals
      const { data: approvals } = await supabase
        .from('approvals')
        .select(`
          id,
          action,
          created_at,
          request:material_requests(request_number),
          profile:profiles!approvals_user_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (approvals) {
        approvals.forEach((approval: any) => {
          const requestNum = approval.request?.request_number || 'Unknown';
          const approverName = approval.profile?.full_name || 'Unknown';
          items.push({
            id: `approval-${approval.id}`,
            type: approval.action === 'approve' ? 'approved' : 'rejected',
            message: `${requestNum} ${approval.action === 'approve' ? 'approved' : 'rejected'} by ${approverName}`,
            time: formatDistanceToNow(new Date(approval.created_at), { addSuffix: true }),
          });
        });
      }

      // Fetch recent requests
      const { data: requests } = await supabase
        .from('material_requests')
        .select(`
          id,
          request_number,
          status,
          created_at,
          updated_at,
          profile:profiles!material_requests_requester_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (requests) {
        requests.forEach((req: any) => {
          const requesterName = req.profile?.full_name || 'Unknown';
          items.push({
            id: `request-${req.id}`,
            type: req.status === 'submitted' ? 'submitted' : 'updated',
            message: `${req.request_number} ${req.status === 'draft' ? 'created as draft' : 'submitted'} by ${requesterName}`,
            time: formatDistanceToNow(new Date(req.created_at), { addSuffix: true }),
          });
        });
      }

      // Sort by time and return top 5
      return items.slice(0, 5);
    },
  });

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
      
      <div className="space-y-4">
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
        ) : (
          activities.map((activity, index) => {
            const { icon: Icon, className } = activityIcons[activity.type];
            return (
              <div 
                key={activity.id} 
                className="flex items-start gap-3 animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={cn("p-2 rounded-lg bg-muted", className)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{activity.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

import { MaterialRequest, useDeleteMaterialRequest } from '@/hooks/useDatabase';
import { StatusBadge } from './StatusBadge';
import { Button } from '@/components/ui/button';
import { Eye, Clock, AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface RequestsTableProps {
  requests: MaterialRequest[];
  showActions?: boolean;
}

export function RequestsTable({ requests, showActions = true }: RequestsTableProps) {
  const { user, isAdmin, profile } = useAuth();
  const deleteMutation = useDeleteMaterialRequest();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canDeleteRequest = (request: MaterialRequest) => {
    // System Admin can delete any request
    if (isAdmin && profile?.designation === 'System Admin') return true;
    // Users can delete their own draft/submitted requests
    return request.requester_id === user?.id && ['draft', 'submitted'].includes(request.status);
  };

  const handleDelete = async (request: MaterialRequest) => {
    setDeletingId(request.id);
    try {
      await deleteMutation.mutateAsync(request.id);
      toast({
        title: 'Request Deleted',
        description: `${request.request_number} has been deleted.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete request',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <table className="data-table">
        <thead>
          <tr>
            <th>Request #</th>
            <th>Project</th>
            <th>Type</th>
            <th>Priority</th>
            <th>Requester</th>
            <th>Status</th>
            <th>Date</th>
            {showActions && <th className="text-right">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.id} className="animate-fade-in">
              <td>
                <span className="font-medium text-foreground">{request.request_number}</span>
              </td>
              <td>
                <div>
                  <p className="font-medium text-foreground">{request.project_name}</p>
                  <p className="text-xs text-muted-foreground">{request.items_count || 0} items</p>
                </div>
              </td>
              <td>
                <span className="capitalize text-sm">
                  {request.request_type === 'pending' ? '-' : request.request_type.replace('_', ' ')}
                </span>
              </td>
              <td>
                {request.priority === 'urgent' ? (
                  <span className="inline-flex items-center gap-1 text-sm text-warning font-medium">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Urgent
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">Normal</span>
                )}
              </td>
              <td>
                <div>
                  <p className="text-sm font-medium">{request.requester_name}</p>
                  <p className="text-xs text-muted-foreground">{request.requester_designation}</p>
                </div>
              </td>
              <td>
                <StatusBadge status={request.status as any} />
              </td>
              <td>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {format(new Date(request.created_at), 'MMM d, yyyy')}
                </div>
              </td>
              {showActions && (
                <td className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link to={`/requests/${request.id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </Link>
                    {canDeleteRequest(request) && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={deletingId === request.id}
                          >
                            {deletingId === request.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Request</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {request.request_number}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(request)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      
      {requests.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          No requests found
        </div>
      )}
    </div>
  );
}

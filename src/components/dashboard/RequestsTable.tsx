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

  // Mobile card view - compact
  const MobileCard = ({ request }: { request: MaterialRequest }) => (
    <div className="bg-card rounded-lg border border-border p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{request.request_number}</p>
          <p className="text-xs text-muted-foreground truncate">{request.project_name}</p>
        </div>
        <StatusBadge status={request.status as any} />
      </div>
      
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {request.priority === 'urgent' && (
            <span className="inline-flex items-center gap-0.5 text-warning font-medium">
              <AlertTriangle className="h-3 w-3" />
              Urgent
            </span>
          )}
          <span className="text-muted-foreground">{request.items_count || 0} items</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" />
          {format(new Date(request.created_at), 'MMM d')}
        </div>
      </div>

      <div className="text-xs">
        <span className="text-muted-foreground">By: </span>
        <span className="text-foreground">{request.requester_name}</span>
      </div>

      {showActions && (
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Link to={`/requests/${request.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full h-7 text-xs">
              <Eye className="h-3.5 w-3.5 mr-1" />
              View
            </Button>
          </Link>
          {canDeleteRequest(request) && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive border-destructive/30 hover:bg-destructive/10"
                  disabled={deletingId === request.id}
                >
                  {deletingId === request.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="mx-3 max-w-[calc(100vw-24px)]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-base">Delete Request</AlertDialogTitle>
                  <AlertDialogDescription className="text-sm">
                    Delete {request.request_number}? This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2">
                  <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => handleDelete(request)}
                    className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile view - cards */}
      <div className="md:hidden space-y-3">
        {requests.map((request) => (
          <MobileCard key={request.id} request={request} />
        ))}
        {requests.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No requests found
          </div>
        )}
      </div>

      {/* Desktop view - table */}
      <div className="hidden md:block bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th className="whitespace-nowrap">Request #</th>
                <th className="whitespace-nowrap">Project</th>
                <th className="whitespace-nowrap">Type</th>
                <th className="whitespace-nowrap">Priority</th>
                <th className="whitespace-nowrap">Requester</th>
                <th className="whitespace-nowrap">Status</th>
                <th className="whitespace-nowrap">Date</th>
                {showActions && <th className="text-right whitespace-nowrap">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id} className="animate-fade-in">
                  <td>
                    <span className="font-medium text-foreground whitespace-nowrap">{request.request_number}</span>
                  </td>
                  <td>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate max-w-[150px]">{request.project_name}</p>
                      <p className="text-xs text-muted-foreground">{request.items_count || 0} items</p>
                    </div>
                  </td>
                  <td>
                    <span className="capitalize text-sm whitespace-nowrap">
                      {request.request_type === 'pending' ? '-' : request.request_type.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    {request.priority === 'urgent' ? (
                      <span className="inline-flex items-center gap-1 text-sm text-warning font-medium whitespace-nowrap">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Urgent
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Normal</span>
                    )}
                  </td>
                  <td>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate max-w-[120px]">{request.requester_name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[120px]">{request.requester_designation}</p>
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={request.status as any} />
                  </td>
                  <td>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground whitespace-nowrap">
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
        </div>
        
        {requests.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No requests found
          </div>
        )}
      </div>
    </>
  );
}
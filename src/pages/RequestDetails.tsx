import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, ArrowLeft, Trash2, Check } from 'lucide-react';
import { useMaterialRequests, useMaterialRequestItems, useDeleteMaterialRequest, useApproveRequest } from '@/hooks/useDatabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
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

const RequestDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, profile, user } = useAuth();
  const { toast } = useToast();
  const { data: requests, isLoading: requestsLoading } = useMaterialRequests();
  const { data: items, isLoading: itemsLoading } = useMaterialRequestItems(id || '');
  const deleteMutation = useDeleteMaterialRequest();
  const approveRequest = useApproveRequest();

  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [approveComment, setApproveComment] = useState('');
  const [requestType, setRequestType] = useState<'stock_request' | 'purchase_request'>('stock_request');
  const [isApproving, setIsApproving] = useState(false);

  const request = requests?.find(r => r.id === id);
  
  // System Admin can delete any request
  // Regular users can delete their own draft/submitted requests
  const canDelete = request && (
    (isAdmin && profile?.designation === 'System Admin') ||
    (request.requester_id === user?.id && ['draft', 'submitted'].includes(request.status))
  );

  // Admin can approve submitted requests
  const canApprove = request && isAdmin && request.status === 'submitted';

  const handleDelete = async () => {
    if (!id) return;
    await deleteMutation.mutateAsync(id);
    navigate('/requests');
  };

  const handleApprove = async () => {
    if (!id) return;
    setIsApproving(true);
    try {
      await approveRequest.mutateAsync({
        requestId: id,
        comment: approveComment || undefined,
        requestType: requestType,
      });
      toast({
        title: 'Request Approved',
        description: `${request?.request_number} has been approved.`,
      });
      setShowApproveDialog(false);
      navigate('/requests');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve request',
        variant: 'destructive',
      });
    } finally {
      setIsApproving(false);
    }
  };

  if (requestsLoading || itemsLoading) {
    return (
      <MainLayout title="Request Details">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!request) {
    return (
      <MainLayout title="Request Details">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-foreground mb-2">Request Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested material request could not be found.</p>
          <Button onClick={() => navigate('/requests')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Requests
          </Button>
        </div>
      </MainLayout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'submitted': return 'default';
      case 'pm_approved': return 'default';
      case 'pm_rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'normal': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <MainLayout 
      title={`Request ${request.request_number}`}
      subtitle="Material request details"
    >
      <div className="space-y-4 lg:space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/requests')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          
          <div className="flex items-center gap-2">
            {canApprove && (
              <Button variant="success" size="sm" onClick={() => setShowApproveDialog(true)}>
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
            )}
            {canDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Material Request</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete request {request.request_number}? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Approve Dialog */}
        <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <DialogContent className="max-w-[90vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Approve Request</DialogTitle>
              <DialogDescription>
                Select whether this is a stock request or purchase request.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="requestType">Request Type *</Label>
                <Select 
                  value={requestType} 
                  onValueChange={(v) => setRequestType(v as 'stock_request' | 'purchase_request')}
                >
                  <SelectTrigger id="requestType">
                    <SelectValue placeholder="Select request type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stock_request">Stock Request</SelectItem>
                    <SelectItem value="purchase_request">Purchase Request</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="comment">Comment (optional)</Label>
                <Textarea
                  id="comment"
                  placeholder="Add a comment..."
                  value={approveComment}
                  onChange={(e) => setApproveComment(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowApproveDialog(false)} disabled={isApproving}>
                Cancel
              </Button>
              <Button variant="success" onClick={handleApprove} disabled={isApproving}>
                {isApproving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Request Info */}
        <Card>
          <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-base sm:text-lg">
              <span>Request Information</span>
              <div className="flex gap-1.5">
                <Badge variant={getStatusColor(request.status)} className="text-xs">
                  {request.status.replace('_', ' ').toUpperCase()}
                </Badge>
                <Badge variant={getPriorityColor(request.priority)} className="text-xs">
                  {request.priority.toUpperCase()}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Request #</p>
                <p className="text-sm font-medium truncate">{request.request_number}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Project</p>
                <p className="text-sm font-medium truncate">{request.project_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="text-sm font-medium capitalize">{request.request_type}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Requester</p>
                <p className="text-sm font-medium truncate">{request.requester_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Required Date</p>
                <p className="text-sm font-medium">
                  {request.required_date 
                    ? format(new Date(request.required_date), 'PP')
                    : 'Not specified'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-sm font-medium">{format(new Date(request.created_at), 'PP')}</p>
              </div>
              {request.remarks && (
                <div className="col-span-2 lg:col-span-3">
                  <p className="text-xs text-muted-foreground">Remarks</p>
                  <p className="text-sm font-medium">{request.remarks}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Requested Items ({items?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            {items && items.length > 0 ? (
              <div className="space-y-2 lg:hidden">
                {/* Mobile: Card layout */}
                {items.map((item, index) => (
                  <div key={item.id} className="p-2 rounded-lg bg-muted/50 text-sm">
                    <div className="flex justify-between items-start">
                      <p className="font-medium">{index + 1}. {item.name}</p>
                      <span className="text-xs text-muted-foreground">{item.category}</span>
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{item.quantity} {item.unit}</span>
                      {item.specification && <span>• {item.specification}</span>}
                      {item.preferred_brand && <span>• {item.preferred_brand}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {items && items.length > 0 ? (
              <div className="hidden lg:block">
                {/* Desktop: Table layout */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Specification</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Preferred Brand</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.specification || '-'}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>{item.preferred_brand || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4 text-sm">No items in this request</p>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default RequestDetails;

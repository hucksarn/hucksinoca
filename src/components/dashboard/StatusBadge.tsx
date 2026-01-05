import { RequestStatus } from '@/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: RequestStatus;
  className?: string;
}

const statusConfig: Record<RequestStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'status-draft' },
  submitted: { label: 'Pending PM Approval', className: 'status-submitted' },
  pm_approved: { label: 'Pending Procurement', className: 'status-processing' },
  pm_rejected: { label: 'PM Rejected', className: 'status-rejected' },
  procurement_approved: { label: 'Approved', className: 'status-approved' },
  stock_issued: { label: 'Stock Issued', className: 'status-approved' },
  po_raised: { label: 'PO Raised', className: 'status-processing' },
  partially_delivered: { label: 'Partially Delivered', className: 'status-processing' },
  fully_delivered: { label: 'Delivered', className: 'status-approved' },
  closed: { label: 'Closed', className: 'status-draft' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span className={cn("status-badge", config.className, className)}>
      {config.label}
    </span>
  );
}

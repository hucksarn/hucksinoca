export type UserRole = 
  | 'site_engineer'
  | 'site_supervisor'
  | 'foreman'
  | 'project_manager'
  | 'procurement_manager'
  | 'warehouse'
  | 'management';

export type RequestStatus = 
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'closed';

export type RequestType = 'stock_request' | 'purchase_request';

export type Priority = 'urgent' | 'normal';

export type MaterialCategory = 
  | 'cement'
  | 'steel'
  | 'block'
  | 'electrical'
  | 'plumbing'
  | 'finishing'
  | 'other';

export type Unit = 'nos' | 'bags' | 'kg' | 'ton' | 'm3';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  designation: string;
  phone: string;
  projectIds: string[];
}

export interface Project {
  id: string;
  name: string;
  location: string;
  status: 'active' | 'completed' | 'on_hold';
}

export interface MaterialItem {
  id: string;
  category: MaterialCategory;
  name: string;
  specification: string;
  quantity: number;
  unit: Unit;
  preferredBrand?: string;
}

export interface Approval {
  id: string;
  userId: string;
  userName: string;
  role: UserRole;
  action: 'approved' | 'rejected';
  comment?: string;
  timestamp: Date;
}

export interface MaterialRequest {
  id: string;
  requestNumber: string;
  projectId: string;
  projectName: string;
  requestType: RequestType;
  priority: Priority;
  requiredDate?: Date;
  remarks: string;
  requesterId: string;
  requesterName: string;
  requesterDesignation: string;
  requesterPhone: string;
  items: MaterialItem[];
  attachments: string[];
  status: RequestStatus;
  approvals: Approval[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardMetric {
  label: string;
  value: number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
}

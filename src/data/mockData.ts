import { User, Project, MaterialRequest, DashboardMetric } from '@/types';

export const currentUser: User = {
  id: 'user-1',
  name: 'John Mitchell',
  email: 'john.mitchell@buildcorp.com',
  role: 'project_manager',
  designation: 'Senior Project Manager',
  phone: '+1 555-0123',
  projectIds: ['proj-1', 'proj-2'],
};

export const projects: Project[] = [
  { id: 'proj-1', name: 'Marina Bay Tower', location: 'Downtown District', status: 'active' },
  { id: 'proj-2', name: 'Riverside Complex', location: 'East Side', status: 'active' },
  { id: 'proj-3', name: 'Tech Park Phase 2', location: 'Innovation Hub', status: 'active' },
  { id: 'proj-4', name: 'Heritage Plaza', location: 'Old Town', status: 'on_hold' },
];

export const materialRequests: MaterialRequest[] = [
  {
    id: 'req-001',
    requestNumber: 'MR-2024-001',
    projectId: 'proj-1',
    projectName: 'Marina Bay Tower',
    requestType: 'purchase_request',
    priority: 'urgent',
    requiredDate: new Date('2024-01-20'),
    remarks: 'Required for foundation work - Phase 2',
    requesterId: 'user-2',
    requesterName: 'Mike Chen',
    requesterDesignation: 'Site Engineer',
    requesterPhone: '+1 555-0124',
    items: [
      { id: 'item-1', category: 'cement', name: 'Portland Cement', specification: 'Grade 53, OPC', quantity: 500, unit: 'bags', preferredBrand: 'UltraTech' },
      { id: 'item-2', category: 'steel', name: 'TMT Bars', specification: 'Fe500D, 12mm', quantity: 5, unit: 'ton' },
    ],
    attachments: [],
    status: 'submitted',
    approvals: [],
    createdAt: new Date('2024-01-15T09:30:00'),
    updatedAt: new Date('2024-01-15T09:30:00'),
  },
  {
    id: 'req-002',
    requestNumber: 'MR-2024-002',
    projectId: 'proj-2',
    projectName: 'Riverside Complex',
    requestType: 'stock_request',
    priority: 'normal',
    remarks: 'Regular stock replenishment',
    requesterId: 'user-3',
    requesterName: 'Sarah Johnson',
    requesterDesignation: 'Foreman',
    requesterPhone: '+1 555-0125',
    items: [
      { id: 'item-3', category: 'electrical', name: 'Cable Wire', specification: '2.5mm, FR Grade', quantity: 1000, unit: 'nos' },
    ],
    attachments: [],
    status: 'approved',
    approvals: [
      { id: 'appr-1', userId: 'user-1', userName: 'John Mitchell', role: 'project_manager', action: 'approved', comment: 'Approved for procurement', timestamp: new Date('2024-01-16T10:00:00') },
    ],
    createdAt: new Date('2024-01-14T14:00:00'),
    updatedAt: new Date('2024-01-16T10:00:00'),
  },
  {
    id: 'req-003',
    requestNumber: 'MR-2024-003',
    projectId: 'proj-1',
    projectName: 'Marina Bay Tower',
    requestType: 'purchase_request',
    priority: 'normal',
    requiredDate: new Date('2024-01-25'),
    remarks: 'For interior finishing work',
    requesterId: 'user-4',
    requesterName: 'David Park',
    requesterDesignation: 'Site Supervisor',
    requesterPhone: '+1 555-0126',
    items: [
      { id: 'item-4', category: 'finishing', name: 'Wall Putty', specification: 'White, Interior Grade', quantity: 200, unit: 'bags' },
      { id: 'item-5', category: 'finishing', name: 'Primer', specification: 'Water-based, White', quantity: 50, unit: 'nos' },
    ],
    attachments: [],
    status: 'approved',
    approvals: [
      { id: 'appr-2', userId: 'user-1', userName: 'John Mitchell', role: 'project_manager', action: 'approved', timestamp: new Date('2024-01-13T11:00:00') },
      { id: 'appr-3', userId: 'user-5', userName: 'Emily Torres', role: 'procurement_manager', action: 'approved', comment: 'PO to be raised', timestamp: new Date('2024-01-14T09:00:00') },
    ],
    createdAt: new Date('2024-01-12T08:00:00'),
    updatedAt: new Date('2024-01-14T09:00:00'),
  },
  {
    id: 'req-004',
    requestNumber: 'MR-2024-004',
    projectId: 'proj-3',
    projectName: 'Tech Park Phase 2',
    requestType: 'stock_request',
    priority: 'urgent',
    remarks: 'Urgent plumbing repair needed',
    requesterId: 'user-2',
    requesterName: 'Mike Chen',
    requesterDesignation: 'Site Engineer',
    requesterPhone: '+1 555-0124',
    items: [
      { id: 'item-6', category: 'plumbing', name: 'PVC Pipes', specification: '4 inch, Schedule 40', quantity: 100, unit: 'nos' },
    ],
    attachments: [],
    status: 'approved',
    approvals: [
      { id: 'appr-4', userId: 'user-1', userName: 'John Mitchell', role: 'project_manager', action: 'approved', timestamp: new Date('2024-01-11T15:00:00') },
    ],
    createdAt: new Date('2024-01-11T12:00:00'),
    updatedAt: new Date('2024-01-12T08:00:00'),
  },
];

export const dashboardMetrics: DashboardMetric[] = [
  { label: 'Pending Approvals', value: 5, trend: 'up', change: 2 },
  { label: 'Active Requests', value: 12, trend: 'neutral' },
  { label: 'Completed This Month', value: 28, trend: 'up', change: 15 },
  { label: 'Urgent Items', value: 3, trend: 'down', change: -1 },
];

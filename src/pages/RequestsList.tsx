import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { RequestsTable } from '@/components/dashboard/RequestsTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Filter, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMaterialRequests, useProjects } from '@/hooks/useDatabase';
import { useAuth } from '@/hooks/useAuth';

type StatusFilter = 'all' | 'draft' | 'submitted' | 'pm_approved' | 'pm_rejected' | 'closed';

export default function RequestsList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');

  const { isAdmin } = useAuth();
  const { data: requests = [], isLoading: requestsLoading } = useMaterialRequests();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.request_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (request.project_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (request.requester_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesProject = projectFilter === 'all' || request.project_id === projectFilter;
    
    return matchesSearch && matchesStatus && matchesProject;
  });

  if (requestsLoading || projectsLoading) {
    return (
      <MainLayout title={isAdmin ? "All Requests" : "My Requests"} subtitle="View and manage material requests">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout 
      title={isAdmin ? "All Requests" : "My Requests"}
      subtitle="View and manage material requests"
    >
      {/* Header Actions */}
      <div className="space-y-2 mb-3 md:mb-6">
        {/* New Request Button */}
        {!isAdmin && (
          <Link to="/requests/new">
            <Button variant="accent" size="sm" className="gap-1.5 h-8 text-xs md:h-10 md:text-sm">
              <Plus className="h-3.5 w-3.5 md:h-4 md:w-4" />
              New Request
            </Button>
          </Link>
        )}
        
        {/* Search and Filters */}
        <div className="flex flex-col gap-2">
          {/* Search */}
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs md:h-10 md:text-sm md:pl-10 w-full"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="flex-1 h-8 text-xs md:h-10 md:text-sm">
                <Filter className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="pm_approved">Approved</SelectItem>
                <SelectItem value="pm_rejected">Rejected</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="flex-1 h-8 text-xs md:h-10 md:text-sm">
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <p className="text-[10px] md:text-sm text-muted-foreground mb-2 md:mb-4">
        {filteredRequests.length} of {requests.length} requests
      </p>

      {/* Table */}
      <RequestsTable requests={filteredRequests} />
    </MainLayout>
  );
}

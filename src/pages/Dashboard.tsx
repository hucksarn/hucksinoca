import { MainLayout } from '@/components/layout/MainLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { RequestsTable } from '@/components/dashboard/RequestsTable';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { ProjectOverview } from '@/components/dashboard/ProjectOverview';
import { Button } from '@/components/ui/button';
import { Plus, ClipboardList, CheckSquare, Package, AlertTriangle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMaterialRequests, useDashboardMetrics } from '@/hooks/useDatabase';
import { useAuth } from '@/hooks/useAuth';

const metricIcons = [ClipboardList, CheckSquare, Package, AlertTriangle];

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const { data: requests = [], isLoading: requestsLoading } = useMaterialRequests();
  const { data: metrics = [], isLoading: metricsLoading } = useDashboardMetrics();

  const pendingRequests = requests.filter(
    r => r.status === 'submitted' || r.status === 'pm_approved'
  );

  const pendingCount = requests.filter(r => r.status === 'submitted').length;

  if (requestsLoading || metricsLoading) {
    return (
      <MainLayout title="Dashboard" subtitle="Overview of your procurement activities">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout 
      title="Dashboard" 
      subtitle="Overview of your procurement activities"
    >
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        {!isAdmin && (
          <Link to="/requests/new">
            <Button variant="accent" className="gap-2">
              <Plus className="h-4 w-4" />
              New Request
            </Button>
          </Link>
        )}
        {isAdmin && (
          <Link to="/approvals">
            <Button variant="outline" className="gap-2">
              <CheckSquare className="h-4 w-4" />
              Pending Approvals
              {pendingCount > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-xs font-medium">
                  {pendingCount}
                </span>
              )}
            </Button>
          </Link>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metrics.map((metric, index) => (
          <MetricCard
            key={metric.label}
            {...metric}
            icon={metricIcons[index]}
          />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Requests Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              {isAdmin ? 'All Requests' : 'My Requests'}
            </h2>
            <Link to="/requests">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>
          <RequestsTable requests={requests.slice(0, 5)} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <RecentActivity />
          <ProjectOverview />
        </div>
      </div>
    </MainLayout>
  );
}

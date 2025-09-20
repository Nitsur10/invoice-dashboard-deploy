'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  DollarSign,
  Upload,
  Loader2
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchDashboardStats } from '@/lib/api/stats';
import { formatDistanceToNow } from 'date-fns';

interface RecentActivityProps {
  dateFrom?: string;
  dateTo?: string;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'invoice_processed':
    case 'processed':
      return { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/20' };
    case 'payment_overdue':
    case 'overdue':
      return { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/20' };
    case 'new_invoice':
    case 'received':
      return { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/20' };
    case 'payment_pending':
    case 'pending':
      return { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/20' };
    case 'payment_made':
    case 'paid':
      return { icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/20' };
    default:
      return { icon: FileText, color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-950/20' };
  }
};

export function RecentActivity({ dateFrom, dateTo }: RecentActivityProps) {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats', { dateFrom, dateTo }],
    queryFn: () => fetchDashboardStats({ dateFrom, dateTo }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const activities = stats?.recentActivity || [];
  return (
    <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          Recent Activity
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        </CardTitle>
        <CardDescription className="text-slate-600 dark:text-slate-400">
          Latest updates and notifications
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-3 animate-pulse">
                <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">Failed to load recent activity</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity, index) => {
              const { icon: Icon, color, bg } = getActivityIcon(activity.type);
              const relativeTime = activity.timestamp ? 
                formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true }) : 
                'Unknown time';
              
              return (
                <div key={activity.id} className="flex items-start space-x-3 group hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg p-2 -m-2 transition-colors cursor-pointer">
                  <div className={`p-2 rounded-full ${bg} group-hover:scale-110 transition-transform`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {activity.description}
                    </p>
                    {activity.amount && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                        ${activity.amount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                      </p>
                    )}
                    {activity.status && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {activity.status}
                      </Badge>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      {relativeTime}
                    </p>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <div className="h-2 w-2 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors">
            View all activity
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
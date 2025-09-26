'use client';

import { DollarSign, FileText, Clock, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDashboardStats } from '@/components/dashboard/dashboard-stats-provider';
import { useInvoiceFilters, InvoiceStatusFilter } from '@/hooks/use-invoices-filters';

export function StatsCards() {
  const { data: stats, isLoading, error } = useDashboardStats();
  const { filters, toggleStatus } = useInvoiceFilters();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
              <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="col-span-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">Failed to load dashboard statistics</p>
            <p className="text-sm text-slate-500 mt-1">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;
  const cards = [
    {
      id: 'total-invoices',
      title: 'Total Invoices',
      value: stats.overview.totalInvoices.toLocaleString(),
      icon: FileText,
      trend: `${stats.overview.trends.invoices > 0 ? '+' : ''}${stats.overview.trends.invoices.toFixed(1)}%`,
      trendUp: stats.overview.trends.invoices > 0,
      type: 'primary' as const,
      status: null as InvoiceStatusFilter | null,
      clickable: false,
      testId: 'summary-card-total',
    },
    {
      id: 'total-amount',
      title: 'Total Amount',
      value: `$${stats.overview.totalAmount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      trend: `${stats.overview.trends.amount > 0 ? '+' : ''}${stats.overview.trends.amount.toFixed(1)}%`,
      trendUp: stats.overview.trends.amount > 0,
      type: 'success' as const,
      status: null as InvoiceStatusFilter | null,
      clickable: false,
      testId: 'summary-card-amount',
    },
    {
      id: 'pending-payments',
      title: 'Pending',
      value: stats.overview.pendingPayments.toLocaleString(),
      icon: Clock,
      trend: `$${stats.overview.pendingAmount.toLocaleString('en-AU', { minimumFractionDigits: 0 })}`,
      trendUp: false,
      type: 'warning' as const,
      status: 'pending',
      clickable: true,
      testId: 'status-card-pending',
    },
    {
      id: 'paid-items',
      title: 'Paid',
      value: (stats.overview.totalInvoices - stats.overview.pendingPayments - stats.overview.overduePayments).toLocaleString(),
      icon: DollarSign,
      trend: `$${(stats.overview.totalAmount - stats.overview.pendingAmount - stats.overview.overdueAmount).toLocaleString('en-AU', { minimumFractionDigits: 0 })}`,
      trendUp: true,
      type: 'success' as const,
      status: 'paid',
      clickable: true,
      testId: 'status-card-paid',
    },
    {
      id: 'overdue-items',
      title: 'Overdue',
      value: stats.overview.overduePayments.toLocaleString(),
      icon: AlertTriangle,
      trend: `$${stats.overview.overdueAmount.toLocaleString('en-AU', { minimumFractionDigits: 0 })}`,
      trendUp: stats.overview.overduePayments > 0,
      type: 'danger' as const,
      status: 'overdue',
      clickable: true,
      testId: 'status-card-overdue',
    },
  ];

  return (
    <div className="rpd-grid-responsive">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const TrendIcon = card.trendUp ? TrendingUp : TrendingDown;
        
        const cardStyle = {
          primary: {
            background: 'linear-gradient(135deg, hsl(var(--rpd-navy-secondary)) 0%, hsl(var(--rpd-navy-tertiary)) 100%)',
            borderColor: 'hsl(var(--border))',
            iconBg: 'linear-gradient(135deg, hsl(220, 25%, 25%) 0%, hsl(220, 30%, 20%) 100%)',
            titleColor: 'hsl(var(--rpd-gold-secondary))',
            valueColor: 'hsl(var(--rpd-gold-primary))',
            metaColor: 'hsla(var(--rpd-gold-primary) / 0.8)',
          },
          success: {
            background: 'linear-gradient(135deg, hsl(var(--rpd-navy-secondary)) 0%, hsl(142, 25%, 8%) 100%)',
            borderColor: 'hsl(142, 50%, 20%)', 
            iconBg: 'linear-gradient(135deg, hsl(142, 76%, 36%) 0%, hsl(142, 84%, 29%) 100%)',
            titleColor: 'hsl(var(--rpd-gold-secondary))',
            valueColor: 'hsl(var(--rpd-gold-primary))',
            metaColor: 'hsla(var(--rpd-gold-primary) / 0.8)',
          },
          warning: {
            background: 'linear-gradient(135deg, hsl(var(--rpd-navy-secondary)) 0%, hsl(38, 25%, 8%) 100%)',
            borderColor: 'hsl(38, 50%, 20%)',
            iconBg: 'linear-gradient(135deg, hsl(var(--rpd-gold-primary)) 0%, hsl(var(--rpd-gold-secondary)) 100%)',
            titleColor: 'hsl(var(--rpd-gold-secondary))',
            valueColor: 'hsl(var(--rpd-gold-primary))',
            metaColor: 'hsla(var(--rpd-gold-primary) / 0.8)',
          },
          danger: {
            background: 'linear-gradient(135deg, hsl(var(--rpd-navy-secondary)) 0%, hsl(0, 25%, 8%) 100%)',
            borderColor: 'hsl(0, 50%, 20%)',
            iconBg: 'linear-gradient(135deg, hsl(0, 84%, 60%) 0%, hsl(0, 76%, 50%) 100%)',
            titleColor: 'hsl(var(--rpd-gold-secondary))',
            valueColor: 'hsl(var(--rpd-gold-primary))',
            metaColor: 'hsla(var(--rpd-gold-primary) / 0.8)',
          }
        };

        const isActive = card.status && filters.statuses.includes(card.status as InvoiceStatusFilter);
        const isClickable = card.clickable;

        const handleClick = () => {
          if (card.status && isClickable) {
            toggleStatus(card.status as InvoiceStatusFilter);
          }
        };

        const handleKeyDown = (event: React.KeyboardEvent) => {
          if ((event.key === 'Enter' || event.key === ' ') && card.status && isClickable) {
            event.preventDefault();
            toggleStatus(card.status as InvoiceStatusFilter);
          }
        };

        const getAriaLabel = () => {
          if (!card.status || !isClickable) return undefined;
          const statusName = card.status.charAt(0).toUpperCase() + card.status.slice(1);
          const filterState = isActive ? 'Currently filtered' : 'Currently not filtered';
          return `Filter by ${statusName.toLowerCase()} status. ${filterState}.`;
        };

        return (
          <Card
            key={card.id}
            data-testid={card.testId}
            className={`rpd-card-elevated group relative overflow-hidden border hover:shadow-premium-lg transition-all duration-300 ease-out animate-fade-in ${
              isClickable ? 'cursor-pointer hover:scale-105 hover:-translate-y-1' : ''
            } ${
              isActive ?
                card.status === 'pending' ? 'ring-2 ring-amber-500 bg-amber-50 dark:bg-amber-900/20' :
                card.status === 'paid' ? 'ring-2 ring-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' :
                card.status === 'overdue' ? 'ring-2 ring-rose-500 bg-rose-50 dark:bg-rose-900/20' :
                '' : ''
            } ${
              isClickable ? 'hover:bg-slate-50 hover:dark:bg-slate-800 transition-colors focus:outline-none focus:ring-2' : ''
            } ${
              card.status === 'pending' ? 'focus:ring-amber-500' :
              card.status === 'paid' ? 'focus:ring-emerald-500' :
              card.status === 'overdue' ? 'focus:ring-rose-500' :
              'focus:ring-blue-500'
            }`}
            style={{
              background: isActive ? undefined : cardStyle[card.type].background,
              borderColor: cardStyle[card.type].borderColor,
              animationDelay: `${index * 0.1}s`
            }}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            aria-pressed={isClickable ? (isActive ? 'true' : 'false') : undefined}
            aria-label={getAriaLabel()}
          >
            {/* Animated background gradient */}
            <div className="absolute inset-0 animated-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out" />
            
            {/* Ripple effect */}
            <div className="absolute inset-0 scale-0 bg-white/10 dark:bg-black/10 rounded-lg group-active:scale-100 transition-transform duration-200 ease-out" />
            
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle
                className="text-sm font-semibold"
                style={{ color: cardStyle[card.type].titleColor }}
              >
                {card.title}
              </CardTitle>
              <div className="p-2 rounded-lg shadow-md group-hover:scale-110 transition-all duration-300 ease-out floating"
                   style={{
                     background: cardStyle[card.type].iconBg
                   }}>
                <Icon className="h-4 w-4 text-white group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="space-y-3">
                <div
                  className="text-3xl font-bold group-hover:scale-105 transition-transform duration-300 ease-out tabular-nums"
                  style={{ color: cardStyle[card.type].valueColor }}
                >
                  {card.value}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant="outline" 
                    className={`flex items-center space-x-1 px-2 py-1 group-hover:pulse-glow transition-all duration-300 ${
                      card.trendUp 
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/30 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30' 
                        : 'text-red-700 bg-red-50 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800/30 group-hover:bg-red-100 dark:group-hover:bg-red-900/30'
                    }`}
                  >
                    <TrendIcon className={`h-3 w-3 transition-all duration-300 ${card.trendUp ? 'group-hover:animate-bounce' : 'group-hover:animate-pulse'}`} />
                    <span
                      className="text-xs font-medium"
                      style={{ color: cardStyle[card.type].valueColor }}
                    >
                      {card.trend}
                    </span>
                  </Badge>
                  <span
                    className="text-xs font-medium"
                    style={{ color: cardStyle[card.type].metaColor }}
                  >
                    vs last month
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

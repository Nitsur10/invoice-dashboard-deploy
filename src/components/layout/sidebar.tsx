'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { RPDLogo } from '@/components/ui/rpd-logo';
import { useInvoiceCount } from '@/hooks/useInvoiceCount';
import {
  LayoutDashboard,
  FileText,
  Kanban,
  BarChart3,
  Settings,
  TrendingUp,
} from 'lucide-react';

interface SidebarProps {
  className?: string;
}

const getNavigation = (invoiceCount?: number) => [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    badge: null,
  },
  {
    name: 'Invoices',
    href: '/invoices',
    icon: FileText,
    badge: invoiceCount && invoiceCount > 0 ? invoiceCount.toString() : null,
  },
  {
    name: 'Kanban Board',
    href: '/kanban',
    icon: Kanban,
    badge: null,
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    badge: null,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    badge: null,
  },
];

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { data: invoiceCount } = useInvoiceCount();
  const navigation = getNavigation(invoiceCount);

  return (
    <div className={cn('pb-12 min-h-screen w-full bg-card border-r border/50', className)}>
      <div className="space-y-6 py-6">
        <div className="px-6">
          <div className="flex items-center space-x-3">
            <RPDLogo size="lg" className="flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-primary">
                Invoice Management
              </h2>
              <p className="text-xs text-muted-foreground">
                The Powerhouse of Real Estate
              </p>
            </div>
          </div>
        </div>
        
        <div className="px-3">
          <nav className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'group flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium',
                    'relative overflow-hidden transition-all duration-300 ease-out',
                    'hover:scale-[1.02] hover:-translate-y-0.5 focus-premium',
                    isActive
                      ? 'text-primary-foreground bg-primary shadow-premium hover:shadow-premium-lg'
                      : 'text-foreground hover:bg-accent/50 hover:text-accent-foreground'
                  )}
                >
                  <div className="flex items-center">
                    <Icon className={cn(
                      "mr-3 h-5 w-5 transition-all duration-300 ease-out relative z-10",
                      "group-hover:scale-110 group-hover:rotate-3",
                      isActive 
                        ? "text-primary-foreground" 
                        : "text-muted-foreground group-hover:text-primary"
                    )} />
                  
                    <span className="truncate relative z-10 group-hover:font-semibold transition-all duration-300 ease-out">{item.name}</span>
                  </div>
                  
                  {item.badge && (
                    <div className={cn(
                      "ml-auto rounded-full px-2.5 py-1 text-xs font-medium relative z-10",
                      "transition-all duration-300 ease-out group-hover:scale-110",
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    )}>
                      {item.badge}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
        
        <div className="px-6">
          <div className="rounded-xl p-4 border bg-accent/20 border/50 hover:bg-accent/30 transition-colors duration-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Monthly Growth
                </p>
                <p className="text-xs text-muted-foreground">
                  +23.5% from last month
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

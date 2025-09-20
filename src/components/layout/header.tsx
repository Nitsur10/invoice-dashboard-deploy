'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Bell, Search, Settings, LogOut } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

interface ProfileState {
  email: string;
}

export function Header() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (mounted) {
        if (data.user) {
          setProfile({ email: data.user.email ?? 'User' });
        } else {
          setProfile(null);
        }
      }
    };

    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setProfile(null);
      } else {
        setProfile({ email: session.user.email ?? 'User' });
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    await fetch('/api/auth/signout', {
      method: 'POST',
      credentials: 'include',
    });
    setSigningOut(false);
    router.replace('/auth/login');
  };

  return (
    <header className="h-16 border-b border-slate-200/20 dark:border-slate-700/20">
      <div className="flex h-full items-center justify-between px-6">
        {/* Left side intentionally minimal to keep spacing consistent */}
        <div className="flex items-center space-x-4" />

        {/* Center - Status Indicator */}
        <div className="hidden md:flex items-center space-x-2">
          <Badge 
            variant="outline" 
            className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800/30"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
            System Online
          </Badge>
        </div>
        
        {/* Right side - User Actions */}
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="sm"
            className="h-9 w-9 p-0 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
          >
            <Search className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </Button>

          <Button 
            variant="ghost" 
            size="sm"
            className="h-9 w-9 p-0 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors relative"
          >
            <Bell className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-medium">3</span>
            </div>
          </Button>

          <Button 
            variant="ghost" 
            size="sm"
            className="h-9 w-9 p-0 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
          >
            <Settings className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </Button>

          <div className="flex items-center space-x-2 ml-2">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {profile?.email ?? 'Guest'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {profile ? 'Authenticated' : 'Not signed in'}
              </p>
            </div>
            <Button 
              variant="ghost" 
              className="h-9 px-3 space-x-2 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="h-6 w-6 rounded-full bg-gradient-to-r from-brand-navy to-brand-navy-light flex items-center justify-center">
                <User className="h-3 w-3 text-white" />
              </div>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
              onClick={handleSignOut}
              disabled={signingOut}
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

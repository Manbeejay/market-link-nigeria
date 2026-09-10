import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useSubscription = () => {
  const { user, loading: authLoading } = useAuth();
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    if (!user) {
      setIsActive(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('subscriptions')
      .select('id, status, expires_at')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (error) {
      console.error('Could not check subscription', error);
      setIsActive(false);
    } else {
      const now = Date.now();
      setIsActive(
        (data ?? []).some((s) => !s.expires_at || new Date(s.expires_at).getTime() > now),
      );
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    check();
  }, [authLoading, check]);

  return { isActive, loading: loading || authLoading, refresh: check };
};

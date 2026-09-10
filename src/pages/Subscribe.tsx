import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Loader2 } from 'lucide-react';
import Logo from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';

const benefits = [
  'Browse every verified farmer listing across Nigeria',
  'Message farmers and buyers directly about an order',
  'Full access for 12 months from the day you pay',
];

const Subscribe = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isActive, loading: subLoading, refresh } = useSubscription();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [returnedFromPayment, setReturnedFromPayment] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (isActive) navigate('/');
  }, [isActive, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reference') || params.get('trxref')) {
      setReturnedFromPayment(true);
      const id = window.setInterval(refresh, 3000);
      const stop = window.setTimeout(() => window.clearInterval(id), 30000);
      return () => {
        window.clearInterval(id);
        window.clearTimeout(stop);
      };
    }
  }, [refresh]);

  const startPayment = async () => {
    setError('');
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-subscription-payment', {
        body: { callback_url: `${window.location.origin}/subscribe` },
      });
      if (error) throw error;
      if (data?.already_active) {
        await refresh();
        return;
      }
      if (data?.authorization_url) {
        window.location.href = data.authorization_url;
        return;
      }
      throw new Error(data?.error ?? 'Payment could not be started.');
    } catch (err: any) {
      setError(err?.message ?? 'Payment could not be started. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-6">
        <Logo size="lg" showText className="justify-center" />
        <Card>
          <CardHeader>
            <CardTitle>Activate your membership</CardTitle>
            <CardDescription>
              A yearly membership of ₦5,000 unlocks the MarketLink Nigeria marketplace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ul className="space-y-2">
              {benefits.map((b) => (
                <li key={b} className="flex gap-2 text-sm text-gray-700">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            {returnedFromPayment && !isActive && (
              <Alert>
                <AlertDescription className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Confirming your payment. This usually takes a few seconds.
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={startPayment}
              disabled={starting || subLoading}
            >
              {starting ? 'Opening secure checkout...' : 'Pay ₦5,000 with Paystack'}
            </Button>

            <Button variant="link" className="w-full text-gray-500" onClick={() => signOut()}>
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Subscribe;

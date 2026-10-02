import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUBSCRIPTION_AMOUNT_NGN = 5000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    const paystackKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackKey) return json({ error: 'Payment provider is not configured yet.' }, 500);

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await anon.auth.getUser();
    if (userError || !userData?.user) return json({ error: 'Unauthorized' }, 401);
    const user = userData.user;

    let body: { reference?: unknown } = {};
    try {
      body = await req.json();
    } catch (_) {
      body = {};
    }
    const reference = typeof body.reference === 'string' ? body.reference.trim() : '';
    if (!/^sub_[A-Za-z0-9_]{1,100}$/.test(reference)) {
      return json({ error: 'Invalid payment reference.' }, 400);
    }

    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // The reference must belong to one of this user's subscriptions.
    const { data: sub } = await admin
      .from('subscriptions')
      .select('id, user_id, status')
      .eq('payment_reference', reference)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!sub) return json({ error: 'Payment not found.' }, 404);
    if (sub.status === 'active') return json({ active: true });

    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${paystackKey}` } },
    );
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.status) {
      console.error('paystack verify failed', payload);
      return json({ active: false, status: 'unverified' });
    }

    const data = payload.data ?? {};
    const metaUser = data.metadata?.user_id;
    if (data.status !== 'success') return json({ active: false, status: data.status ?? 'pending' });
    if (
      data.reference !== reference ||
      data.currency !== 'NGN' ||
      typeof data.amount !== 'number' ||
      data.amount < SUBSCRIPTION_AMOUNT_NGN * 100 ||
      (metaUser && metaUser !== user.id)
    ) {
      console.warn('verify mismatch', { reference, user: user.id });
      return json({ error: 'Payment details did not match.' }, 400);
    }

    const startedAt = new Date();
    const expiresAt = new Date(startedAt);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // Only activate if still not active (webhook may have won the race).
    const { error: subError } = await admin
      .from('subscriptions')
      .update({
        status: 'active',
        started_at: startedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        amount: data.amount / 100,
      })
      .eq('id', sub.id)
      .neq('status', 'active');
    if (subError) {
      console.error('activation failed', subError);
      return json({ error: 'Could not activate membership.' }, 500);
    }

    const { data: tx } = await admin
      .from('transactions')
      .select('id')
      .eq('provider_reference', reference)
      .maybeSingle();
    if (tx) {
      await admin.from('transactions').update({ status: 'success' }).eq('id', tx.id);
    } else {
      await admin.from('transactions').insert({
        user_id: user.id,
        type: 'subscription',
        amount: data.amount / 100,
        provider: 'paystack',
        provider_reference: reference,
        status: 'success',
      });
    }

    return json({ active: true });
  } catch (err) {
    console.error('verify-subscription-payment error', err);
    return json({ error: 'Unexpected error' }, 500);
  }
});

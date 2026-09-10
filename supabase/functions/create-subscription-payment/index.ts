import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUBSCRIPTION_AMOUNT_NGN = 5000; // annual access fee in Naira

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
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

    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Already subscribed? Nothing to pay for.
    const { data: active } = await admin
      .from('subscriptions')
      .select('id, expires_at')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .maybeSingle();
    if (active) return json({ already_active: true });

    let body: { callback_url?: string } = {};
    try {
      body = await req.json();
    } catch (_) {
      body = {};
    }
    const callbackUrl =
      typeof body.callback_url === 'string' && body.callback_url.startsWith('http')
        ? body.callback_url.slice(0, 500)
        : undefined;

    const reference = `sub_${user.id.replace(/-/g, '').slice(0, 12)}_${Date.now()}`;

    const { data: subscription, error: insertError } = await admin
      .from('subscriptions')
      .insert({
        user_id: user.id,
        status: 'pending',
        amount: SUBSCRIPTION_AMOUNT_NGN,
        payment_reference: reference,
      })
      .select('id')
      .single();
    if (insertError) {
      console.error('subscription insert failed', insertError);
      return json({ error: 'Could not start the payment. Please try again.' }, 500);
    }

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        amount: SUBSCRIPTION_AMOUNT_NGN * 100, // kobo
        reference,
        currency: 'NGN',
        callback_url: callbackUrl,
        metadata: {
          user_id: user.id,
          subscription_id: subscription.id,
          purpose: 'annual_subscription',
        },
      }),
    });

    const paystackJson = await paystackRes.json();
    if (!paystackRes.ok || !paystackJson?.status) {
      console.error('paystack initialize failed', paystackJson);
      return json({ error: paystackJson?.message ?? 'Payment could not be started.' }, 502);
    }

    await admin.from('transactions').insert({
      user_id: user.id,
      type: 'subscription',
      amount: SUBSCRIPTION_AMOUNT_NGN,
      provider: 'paystack',
      provider_reference: reference,
      status: 'pending',
    });

    return json({
      authorization_url: paystackJson.data.authorization_url,
      reference,
      amount: SUBSCRIPTION_AMOUNT_NGN,
    });
  } catch (err) {
    console.error('create-subscription-payment error', err);
    return json({ error: 'Unexpected error' }, 500);
  }
});

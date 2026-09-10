import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createHmac, timingSafeEqual } from 'node:crypto';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const paystackKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackKey) return new Response('not configured', { status: 500, headers: corsHeaders });

    const raw = await req.text();
    const signature = req.headers.get('x-paystack-signature') ?? '';
    const expected = createHmac('sha512', paystackKey).update(raw).digest('hex');
    const sigBuf = Buffer.from(signature, 'utf8');
    const expBuf = Buffer.from(expected, 'utf8');
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      console.warn('invalid paystack signature');
      return new Response('invalid signature', { status: 401, headers: corsHeaders });
    }

    const event = JSON.parse(raw);
    if (event?.event !== 'charge.success') {
      return new Response('ignored', { status: 200, headers: corsHeaders });
    }

    const data = event.data ?? {};
    const reference: string | undefined = data.reference;
    const metadata = data.metadata ?? {};
    const userId: string | undefined = metadata.user_id;
    const subscriptionId: string | undefined = metadata.subscription_id;
    if (!reference || !userId) {
      return new Response('missing reference', { status: 400, headers: corsHeaders });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const startedAt = new Date();
    const expiresAt = new Date(startedAt);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const update = {
      status: 'active',
      started_at: startedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      payment_reference: reference,
      amount: typeof data.amount === 'number' ? data.amount / 100 : undefined,
    };

    let query = admin.from('subscriptions').update(update);
    query = subscriptionId
      ? query.eq('id', subscriptionId)
      : query.eq('user_id', userId).eq('payment_reference', reference);
    const { error: subError } = await query;
    if (subError) {
      console.error('subscription activation failed', subError);
      return new Response('activation failed', { status: 500, headers: corsHeaders });
    }

    const { data: existingTx } = await admin
      .from('transactions')
      .select('id')
      .eq('provider_reference', reference)
      .maybeSingle();

    if (existingTx) {
      await admin.from('transactions').update({ status: 'success' }).eq('id', existingTx.id);
    } else {
      await admin.from('transactions').insert({
        user_id: userId,
        type: 'subscription',
        amount: typeof data.amount === 'number' ? data.amount / 100 : 0,
        provider: 'paystack',
        provider_reference: reference,
        status: 'success',
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('paystack-subscription-webhook error', err);
    return new Response('error', { status: 500, headers: corsHeaders });
  }
});

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const COMMISSION_PERCENT = 5; // platform commission on every order

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

    let body: { order_id?: string; callback_url?: string } = {};
    try {
      body = await req.json();
    } catch (_) {
      body = {};
    }
    const orderId = typeof body.order_id === 'string' ? body.order_id.trim() : '';
    if (!/^[0-9a-f-]{36}$/i.test(orderId)) return json({ error: 'A valid order is required.' }, 400);

    const callbackUrl =
      typeof body.callback_url === 'string' && body.callback_url.startsWith('http')
        ? body.callback_url.slice(0, 500)
        : undefined;

    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('id, buyer_id, farmer_id, status, total_amount')
      .eq('id', orderId)
      .maybeSingle();
    if (orderError || !order) return json({ error: 'Order not found.' }, 404);
    if (order.buyer_id !== user.id) return json({ error: 'Only the buyer can pay for this order.' }, 403);
    if (order.status === 'paid' || order.status === 'completed') {
      return json({ error: 'This order has already been paid for.' }, 400);
    }
    if (order.status !== 'accepted') {
      return json({ error: 'The farmer has not accepted this order yet.' }, 400);
    }

    const total = Number(order.total_amount);
    if (!(total > 0)) return json({ error: 'This order has no payable amount.' }, 400);

    const commission = Math.round(total * (COMMISSION_PERCENT / 100) * 100) / 100;
    const payout = Math.round((total - commission) * 100) / 100;

    // Farmer subaccount enables an automatic split at Paystack.
    const { data: bank } = await admin
      .from('bank_accounts')
      .select('paystack_subaccount_code')
      .eq('user_id', order.farmer_id)
      .not('paystack_subaccount_code', 'is', null)
      .maybeSingle();

    const reference = `ord_${orderId.replace(/-/g, '').slice(0, 12)}_${Date.now()}`;

    const payload: Record<string, unknown> = {
      email: user.email,
      amount: Math.round(total * 100), // kobo
      reference,
      currency: 'NGN',
      callback_url: callbackUrl,
      metadata: {
        purpose: 'order_payment',
        order_id: order.id,
        buyer_id: order.buyer_id,
        farmer_id: order.farmer_id,
        commission_amount: commission,
        farmer_payout_amount: payout,
      },
    };

    if (bank?.paystack_subaccount_code) {
      payload.subaccount = bank.paystack_subaccount_code;
      payload.transaction_charge = Math.round(commission * 100); // platform share, kobo
      payload.bearer = 'account'; // platform bears Paystack fees
    }

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${paystackKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const paystackJson = await paystackRes.json();
    if (!paystackRes.ok || !paystackJson?.status) {
      console.error('paystack initialize failed', paystackJson);
      return json({ error: paystackJson?.message ?? 'Payment could not be started.' }, 502);
    }

    await admin
      .from('orders')
      .update({
        payment_reference: reference,
        commission_amount: commission,
        farmer_payout_amount: payout,
      })
      .eq('id', order.id);

    return json({
      authorization_url: paystackJson.data.authorization_url,
      reference,
      amount: total,
      commission_amount: commission,
      split_applied: Boolean(bank?.paystack_subaccount_code),
    });
  } catch (err) {
    console.error('create-order-payment error', err);
    return json({ error: 'Unexpected error' }, 500);
  }
});

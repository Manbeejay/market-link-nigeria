import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';

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
    const metadata = data.metadata ?? {};
    if (metadata.purpose !== 'order_payment') {
      return new Response('not an order payment', { status: 200, headers: corsHeaders });
    }

    const reference: string | undefined = data.reference;
    const orderId: string | undefined = metadata.order_id;
    if (!reference || !orderId) {
      return new Response('missing reference', { status: 400, headers: corsHeaders });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('id, buyer_id, farmer_id, status, total_amount, commission_amount, farmer_payout_amount')
      .eq('id', orderId)
      .maybeSingle();
    if (orderError || !order) return new Response('order not found', { status: 404, headers: corsHeaders });

    const paidAmount = typeof data.amount === 'number' ? data.amount / 100 : Number(order.total_amount);
    const commission =
      Number(metadata.commission_amount ?? order.commission_amount ?? 0) ||
      Math.round(paidAmount * 0.05 * 100) / 100;
    const payout = Number(metadata.farmer_payout_amount ?? order.farmer_payout_amount ?? paidAmount - commission);

    if (order.status !== 'paid' && order.status !== 'completed') {
      const { error: updateError } = await admin
        .from('orders')
        .update({
          status: 'paid',
          payment_reference: reference,
          commission_amount: commission,
          farmer_payout_amount: payout,
        })
        .eq('id', order.id);
      if (updateError) {
        console.error('order payment update failed', updateError);
        return new Response('update failed', { status: 500, headers: corsHeaders });
      }
    }

    // Ledger: buyer payment + platform commission, both idempotent on reference.
    const { data: existing } = await admin
      .from('transactions')
      .select('id, type')
      .eq('provider_reference', reference);
    const seen = new Set((existing ?? []).map((t) => t.type));

    const rows: Record<string, unknown>[] = [];
    if (!seen.has('order_payment')) {
      rows.push({
        user_id: order.buyer_id,
        type: 'order_payment',
        amount: paidAmount,
        provider: 'paystack',
        provider_reference: reference,
        status: 'success',
      });
    }
    if (!seen.has('commission')) {
      rows.push({
        user_id: order.farmer_id,
        type: 'commission',
        amount: commission,
        provider: 'paystack',
        provider_reference: reference,
        status: 'success',
      });
    }
    if (rows.length) {
      const { error: txError } = await admin.from('transactions').insert(rows);
      if (txError) console.error('transaction log failed', txError);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('paystack-order-webhook error', err);
    return new Response('error', { status: 500, headers: corsHeaders });
  }
});

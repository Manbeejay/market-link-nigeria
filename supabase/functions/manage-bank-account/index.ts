import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const PLATFORM_COMMISSION_PERCENT = 5; // matches create-order-payment

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

    let body: {
      action?: string;
      bank_code?: string;
      account_number?: string;
      business_name?: string;
    } = {};
    try {
      body = await req.json();
    } catch (_) {
      body = {};
    }
    const action = typeof body.action === 'string' ? body.action : '';

    const paystackFetch = async (path: string, init?: RequestInit) => {
      const res = await fetch(`https://api.paystack.co${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${paystackKey}`,
          'Content-Type': 'application/json',
          ...(init?.headers ?? {}),
        },
      });
      return res.json();
    };

    if (action === 'list_banks') {
      const data = await paystackFetch('/bank?country=nigeria&perPage=200');
      if (!data?.status) return json({ error: data?.message ?? 'Could not load banks.' }, 502);
      const banks = (data.data ?? [])
        .map((b: { name: string; code: string }) => ({ name: b.name, code: b.code }))
        .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));
      return json({ banks });
    }

    const bankCode = typeof body.bank_code === 'string' ? body.bank_code.trim() : '';
    const accountNumber = typeof body.account_number === 'string' ? body.account_number.trim() : '';
    if (!/^\d{10}$/.test(accountNumber)) {
      return json({ error: 'Account number must be exactly 10 digits.' }, 400);
    }
    if (!bankCode) return json({ error: 'Please choose a bank.' }, 400);

    if (action === 'resolve_account') {
      const data = await paystackFetch(
        `/bank/resolve?account_number=${accountNumber}&bank_code=${encodeURIComponent(bankCode)}`,
      );
      if (!data?.status) {
        return json({ error: data?.message ?? 'Could not verify that account number.' }, 502);
      }
      return json({ account_name: data.data.account_name });
    }

    if (action === 'save_account') {
      // Verify the account first so we store a confirmed account name.
      const resolved = await paystackFetch(
        `/bank/resolve?account_number=${accountNumber}&bank_code=${encodeURIComponent(bankCode)}`,
      );
      if (!resolved?.status) {
        return json({ error: resolved?.message ?? 'Could not verify that account number.' }, 502);
      }
      const accountName: string = resolved.data.account_name;

      const bankNameRes = await paystackFetch('/bank?country=nigeria&perPage=200');
      const bankEntry = (bankNameRes?.data ?? []).find(
        (b: { code: string }) => b.code === bankCode,
      );
      const bankName: string = bankEntry?.name ?? 'Bank';

      const businessName =
        typeof body.business_name === 'string' && body.business_name.trim()
          ? body.business_name.trim().slice(0, 120)
          : (user.user_metadata?.full_name as string | undefined) ?? accountName;

      const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

      const { data: existing } = await admin
        .from('bank_accounts')
        .select('id, paystack_subaccount_code')
        .eq('user_id', user.id)
        .maybeSingle();

      let subaccountCode: string | null = existing?.paystack_subaccount_code ?? null;

      if (subaccountCode) {
        // Update the existing Paystack subaccount.
        const upd = await paystackFetch(`/subaccount/${subaccountCode}`, {
          method: 'PUT',
          body: JSON.stringify({
            business_name: businessName,
            settlement_bank: bankCode,
            account_number: accountNumber,
            percentage_charge: 100 - PLATFORM_COMMISSION_PERCENT,
          }),
        });
        if (!upd?.status) {
          console.error('subaccount update failed', upd);
          return json({ error: upd?.message ?? 'Could not update payout account.' }, 502);
        }
      } else {
        const created = await paystackFetch('/subaccount', {
          method: 'POST',
          body: JSON.stringify({
            business_name: businessName,
            settlement_bank: bankCode,
            account_number: accountNumber,
            percentage_charge: 100 - PLATFORM_COMMISSION_PERCENT,
          }),
        });
        if (!created?.status) {
          console.error('subaccount create failed', created);
          return json({ error: created?.message ?? 'Could not create payout account.' }, 502);
        }
        subaccountCode = created.data.subaccount_code;
      }

      if (existing) {
        await admin
          .from('bank_accounts')
          .update({
            bank_name: bankName,
            account_number: accountNumber,
            account_name: accountName,
            paystack_subaccount_code: subaccountCode,
          })
          .eq('id', existing.id);
      } else {
        await admin.from('bank_accounts').insert({
          user_id: user.id,
          bank_name: bankName,
          account_number: accountNumber,
          account_name: accountName,
          paystack_subaccount_code: subaccountCode,
        });
      }

      return json({
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
      });
    }

    return json({ error: 'Unknown action.' }, 400);
  } catch (err) {
    console.error('manage-bank-account error', err);
    return json({ error: 'Unexpected error' }, 500);
  }
});

import { createClient } from "npm:@supabase/supabase-js@2";
import { createResponsesCall } from "../_shared/responses.ts";
import { withLovableAiGatewayRunIdHeader } from "../_shared/run-id.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-lovable-aig-run-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "The AI feature is not configured yet." }, 500);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Please sign in." }, 401);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) return json({ error: "Please sign in." }, 401);
  const user = userData.user;

  let body: { from?: string; to?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  if (!isDate(body.from) || !isDate(body.to) || body.from > body.to) {
    return json({ error: "Please choose a valid date range." }, 400);
  }
  const fromIso = `${body.from}T00:00:00+01:00`;
  const toIso = `${body.to}T23:59:59.999+01:00`;

  const [tx, po, orders] = await Promise.all([
    supabase
      .from("transactions")
      .select("type, amount, provider, status, created_at")
      .eq("user_id", user.id)
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at", { ascending: true })
      .limit(500),
    supabase
      .from("payouts")
      .select("amount, status, requested_at, processed_at")
      .eq("farmer_id", user.id)
      .gte("requested_at", fromIso)
      .lte("requested_at", toIso)
      .order("requested_at", { ascending: true })
      .limit(300),
    supabase
      .from("orders")
      .select("status, quantity, unit_price, total_amount, commission_amount, farmer_payout_amount, created_at, products(title)")
      .eq("farmer_id", user.id)
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at", { ascending: true })
      .limit(300),
  ]);

  const txRows = tx.data ?? [];
  const poRows = po.data ?? [];
  const orderRows = orders.data ?? [];

  const system = `You are the MarketLink Nigeria wallet analyst. Explain a Nigerian farmer's earnings and payout trends for the period ${body.from} to ${body.to} (Lagos time).
Amounts are Nigerian Naira; write them as ₦ with thousands separators.
Rules:
- Use ONLY the data provided. Never invent numbers, dates or orders. If there is little or no data, say so kindly and suggest what would help.
- The platform keeps 5% commission on each paid order; the farmer receives 95%, settled by Paystack to their bank.
- Write in simple, friendly English for a non-technical farmer. Keep it under about 250 words.
- Structure: a one-line headline, "Key numbers" (bullets: total earned, commission, paid out, pending payouts, number of orders), "Trends" (how things changed over the period, best-selling products, busiest weeks), and "Tips" (1–3 practical suggestions).`;

  const userPrompt = `TRANSACTIONS
${JSON.stringify(txRows)}

PAYOUTS
${JSON.stringify(poRows)}

ORDERS ON THEIR LISTINGS
${JSON.stringify(orderRows)}`;

  const { result, runIdFetch } = createResponsesCall(
    req,
    { baseURL: "https://ai.gateway.lovable.dev", apiKey, model: "openai/gpt-6-astra", system },
    [{ role: "user", content: userPrompt }],
  );

  const response = result.toTextStreamResponse({ headers: corsHeaders });
  return withLovableAiGatewayRunIdHeader(response, runIdFetch, corsHeaders);
});

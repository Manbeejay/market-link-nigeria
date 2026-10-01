import { createClient } from "npm:@supabase/supabase-js@2";
import { convertToModelMessages, type UIMessage } from "npm:ai@7";
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

const naira = (n: number) => `NGN ${Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "The AI assistant is not configured yet." }, 500);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Please sign in." }, 401);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) return json({ error: "Please sign in." }, 401);
  const user = userData.user;

  let body: { threadId?: string; messages?: UIMessage[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const threadId = typeof body.threadId === "string" ? body.threadId : "";
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!threadId || messages.length === 0) return json({ error: "Invalid request." }, 400);

  const { data: thread, error: threadError } = await supabase
    .from("wallet_threads")
    .select("id, title")
    .eq("id", threadId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (threadError || !thread) return json({ error: "Conversation not found." }, 404);

  // Load the farmer's own financial data (RLS scopes these to the caller).
  const [tx, po, orders, bank] = await Promise.all([
    supabase
      .from("transactions")
      .select("type, amount, provider, provider_reference, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("payouts")
      .select("amount, status, requested_at, processed_at")
      .eq("farmer_id", user.id)
      .order("requested_at", { ascending: false })
      .limit(100),
    supabase
      .from("orders")
      .select("id, status, quantity, unit_price, total_amount, commission_amount, farmer_payout_amount, payment_reference, created_at, products(title)")
      .eq("farmer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("bank_accounts").select("bank_name, account_name").eq("user_id", user.id).maybeSingle(),
  ]);

  const txRows = tx.data ?? [];
  const poRows = po.data ?? [];
  const orderRows = orders.data ?? [];
  const ok = (s: string) => ["success", "successful", "paid"].includes(s);
  const earned = txRows.filter((t) => t.type === "order_payment" && ok(t.status)).reduce((s, t) => s + Number(t.amount), 0);
  const commission = txRows.filter((t) => t.type === "commission").reduce((s, t) => s + Number(t.amount), 0);
  const paidOut = poRows.filter((p) => ["processed", "paid", "successful"].includes(p.status)).reduce((s, p) => s + Number(p.amount), 0);

  const system = `You are the MarketLink Nigeria wallet assistant. You help a farmer understand their earnings, payments, platform commission, and payouts.
Today is ${new Date().toISOString().slice(0, 10)}. Amounts are Nigerian Naira (show as ₦).
Rules:
- Answer ONLY from the data below. If the data doesn't contain the answer, say so plainly and suggest checking the Wallet page or contacting support.
- Never invent transactions, amounts, dates, or references.
- The platform keeps a 5% commission on each paid order; the farmer receives 95%, settled by Paystack to their saved bank account.
- Keep answers short, friendly and clear for someone who may not be technical. Use simple tables or bullet lists when listing items.
- You cannot move money, change bank details, or request payouts.

FARMER SUMMARY
- Payout bank: ${bank.data ? `${bank.data.bank_name} (${bank.data.account_name})` : "not set up yet"}
- Total earned from paid orders: ${naira(earned)}
- Platform commission recorded: ${naira(commission)}
- Paid out to bank: ${naira(paidOut)}

TRANSACTIONS (newest first, max 200)
${JSON.stringify(txRows)}

PAYOUTS (newest first)
${JSON.stringify(poRows)}

ORDERS ON THEIR LISTINGS (newest first)
${JSON.stringify(orderRows)}`;

  const { result, runIdFetch } = createResponsesCall(
    req,
    { baseURL: "https://ai.gateway.lovable.dev", apiKey, model: "openai/gpt-6-astra", system },
    await convertToModelMessages(messages),
  );

  const firstUserText =
    messages.find((m) => m.role === "user")?.parts.find((p) => p.type === "text")?.text ?? "";

  const response = result.toUIMessageStreamResponse({
    originalMessages: messages,
    sendReasoning: true,
    headers: corsHeaders,
    onFinish: async ({ messages: finalMessages }) => {
      const update: Record<string, unknown> = {
        messages: finalMessages,
        updated_at: new Date().toISOString(),
      };
      if (thread.title === "New question" && firstUserText) {
        update.title = firstUserText.slice(0, 60);
      }
      const { error } = await supabase.from("wallet_threads").update(update).eq("id", threadId);
      if (error) console.error("Failed to save wallet thread", error);
    },
    onError: (error) => {
      console.error("wallet-assistant stream error", error);
      const status = (error as { statusCode?: number })?.statusCode;
      if (status === 429) return "Too many requests right now. Please wait a moment and try again.";
      if (status === 402) return "AI credits have run out. Please add credits to keep using the assistant.";
      return "Sorry, the assistant couldn't answer just now. Please try again.";
    },
  });

  return withLovableAiGatewayRunIdHeader(response, runIdFetch, corsHeaders);
});

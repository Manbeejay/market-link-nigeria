import { createClient } from "npm:@supabase/supabase-js@2";
import { createResponsesCall, textStreamResponse } from "../_shared/responses.ts";
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "The intent summary helper is not configured yet." }, 500);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Please sign in." }, 401);
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) return json({ error: "Please sign in." }, 401);

  let body: { inquiryId?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid request." }, 400); }
  const inquiryId = typeof body.inquiryId === "string" ? body.inquiryId : "";
  if (!/^[0-9a-f-]{36}$/i.test(inquiryId)) return json({ error: "Invalid request." }, 400);

  const userId = userData.user.id;
  // Participant-safe: only the buyer or farmer on this inquiry may read or build the summary.
  const { data: inquiry } = await supabase
    .from("inquiries")
    .select("id, buyer_id, farmer_id, product_id, inquiry_summary_msg_count")
    .eq("id", inquiryId)
    .maybeSingle();
  if (!inquiry || (inquiry.buyer_id !== userId && inquiry.farmer_id !== userId)) {
    return json({ error: "You are not part of this inquiry." }, 403);
  }

  const [{ data: product }, { data: msgs }, { count }] = await Promise.all([
    supabase
      .from("products")
      .select("title, description, unit, price_per_unit, quantity_available, state, lga, status, categories(name)")
      .eq("id", inquiry.product_id)
      .maybeSingle(),
    supabase
      .from("inquiry_messages")
      .select("sender_id, content")
      .eq("inquiry_id", inquiryId)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("inquiry_messages")
      .select("id", { count: "exact", head: true })
      .eq("inquiry_id", inquiryId),
  ]);
  if (!product) return json({ error: "Listing not found." }, 404);
  const p = product as any;

  const transcript = (msgs ?? [])
    .reverse()
    .map((m) => `${m.sender_id === inquiry.buyer_id ? "BUYER" : "FARMER"}: ${m.content}`)
    .join("\n");
  if (!transcript.includes("BUYER:")) {
    return json({ error: "The buyer hasn't sent a message yet." }, 400);
  }
  const messageCount = count ?? (msgs ?? []).length;

  const facts = {
    crop: p.title,
    category: p.categories?.name ?? null,
    price: `₦${Number(p.price_per_unit).toLocaleString("en-NG")} per ${p.unit}`,
    quantity_available: `${Number(p.quantity_available)} ${p.unit}`,
    location: [p.lga, p.state].filter(Boolean).join(", ") || null,
    availability: p.status,
    description_quality_delivery: p.description ?? null,
  };

  const system = `You summarize a buyer's intent on MarketLink Nigeria, a Nigerian farm produce marketplace. The summary is shown to BOTH the buyer and the farmer on this inquiry, so it must be neutral, factual and participant-safe: use ONLY the listing details and the conversation — never invent facts, prices, quantities, promises or assumptions.
Write 2–3 short sentences in plain English that capture: what the buyer wants to buy and roughly how much, any delivery or timing needs, any concerns raised, and how ready they seem to buy. Refer to people as "the buyer" and "the farmer". No markdown, no bullet points. Under 60 words. Output only the summary text.

LISTING
${JSON.stringify(facts, null, 2)}`;

  const { result, runIdFetch } = createResponsesCall(
    req,
    { baseURL: "https://ai.gateway.lovable.dev", apiKey, model: "openai/gpt-6-astra", system, maxOutputTokens: 800 },
    [{ role: "user", content: `Conversation so far:\n${transcript}\n\nSummarize the buyer's intent.` }],
  );

  // Persist the summary once the stream completes so it survives reloads.
  const serviceRole = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  result
    .text.then((text) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      return serviceRole
        .from("inquiries")
        .update({ inquiry_summary: trimmed.slice(0, 1000), inquiry_summary_msg_count: messageCount })
        .eq("id", inquiryId);
    })
    .catch(() => {});

  const response = textStreamResponse(
    result,
    "No summary was produced just now. Open this inquiry again or send a new message to refresh it.",
    corsHeaders,
  );
  return withLovableAiGatewayRunIdHeader(response, runIdFetch, corsHeaders);
});

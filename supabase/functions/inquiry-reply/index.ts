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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "The reply helper is not configured yet." }, 500);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Please sign in." }, 401);
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) return json({ error: "Please sign in." }, 401);

  let body: { inquiryId?: string; notes?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid request." }, 400); }
  const inquiryId = typeof body.inquiryId === "string" ? body.inquiryId : "";
  const notes = typeof body.notes === "string" ? body.notes.slice(0, 1000) : "";
  if (!/^[0-9a-f-]{36}$/i.test(inquiryId)) return json({ error: "Invalid request." }, 400);

  const { data: inquiry } = await supabase
    .from("inquiries")
    .select("id, farmer_id, buyer_id, product_id, buyer:profiles!inquiries_buyer_id_fkey(full_name)")
    .eq("id", inquiryId)
    .maybeSingle();
  if (!inquiry || inquiry.farmer_id !== userData.user.id) {
    return json({ error: "Only the farmer on this inquiry can draft a reply." }, 403);
  }

  const [{ data: product }, { data: msgs }] = await Promise.all([
    supabase
      .from("products")
      .select("title, description, unit, price_per_unit, quantity_available, state, lga, status, categories(name)")
      .eq("id", inquiry.product_id)
      .maybeSingle(),
    supabase
      .from("inquiry_messages")
      .select("sender_id, content, created_at")
      .eq("inquiry_id", inquiryId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  if (!product) return json({ error: "Listing not found." }, 404);
  const p = product as any;

  const transcript = (msgs ?? [])
    .reverse()
    .map((m) => `${m.sender_id === inquiry.buyer_id ? "BUYER" : "FARMER"}: ${m.content}`)
    .join("\n");
  if (!transcript.includes("BUYER:")) return json({ error: "The buyer hasn't sent a message yet." }, 400);

  const facts = {
    crop: p.title,
    category: p.categories?.name ?? null,
    price: `₦${Number(p.price_per_unit).toLocaleString("en-NG")} per ${p.unit}`,
    quantity_available: `${Number(p.quantity_available)} ${p.unit}`,
    location: [p.lga, p.state].filter(Boolean).join(", ") || null,
    availability: p.status,
    description_quality_delivery: p.description ?? null,
  };

  const system = `You draft a reply FROM a Nigerian farmer TO a buyer on MarketLink Nigeria.
Use ONLY the listing details, the conversation, and the farmer's extra notes. Never invent prices, discounts, quantities, harvest dates, certifications or delivery promises.
If the buyer asks something not covered, write a short placeholder in square brackets for the farmer to fill in, e.g. [confirm delivery fee].
You may calculate totals (quantity × price). If the buyer wants more than is available, say so politely.
To buy, the buyer taps "Request this order" on the listing and pays securely in the app after the farmer accepts — mention this when they seem ready to buy.
Write in plain, warm, professional English, first person as the farmer. No markdown, no greeting signature lines beyond a short sign-off. Under 120 words. Output only the reply text.

LISTING
${JSON.stringify(facts, null, 2)}

BUYER NAME: ${(inquiry as any).buyer?.full_name ?? "the buyer"}

FARMER'S EXTRA NOTES (may be empty)
${notes || "(none)"}`;

  const { result, runIdFetch } = createResponsesCall(
    req,
    { baseURL: "https://ai.gateway.lovable.dev", apiKey, model: "openai/gpt-6-astra", system },
    [{ role: "user", content: `Conversation so far:\n${transcript}\n\nDraft the farmer's next reply.` }],
  );

  const response = result.toTextStreamResponse({ headers: corsHeaders });
  return withLovableAiGatewayRunIdHeader(response, runIdFetch, corsHeaders);
});

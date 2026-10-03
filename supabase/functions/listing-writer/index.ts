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

const str = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "The AI writer is not configured yet." }, 500);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Please sign in." }, 401);
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) return json({ error: "Please sign in." }, 401);

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const crop = str(b.crop, 120);
  if (!crop) return json({ error: "Please enter the product name first." }, 400);

  const details = {
    crop,
    category: str(b.category, 80),
    quantity: str(b.quantity, 40),
    unit: str(b.unit, 20),
    price_per_unit_naira: str(b.price, 40),
    quality: str(b.quality, 600),
    delivery: str(b.delivery, 600),
    state: str(b.state, 60),
    lga: str(b.lga, 80),
    farmer_notes: str(b.notes, 1000),
  };

  const system = `You write produce listings for MarketLink Nigeria, a marketplace connecting Nigerian farmers directly to buyers.
Write a clear, honest, buyer-ready listing description from the farmer's details.
Rules:
- Use ONLY the facts given. Never invent certifications, harvest dates, prices, quantities or delivery promises. Skip anything not provided.
- Plain text only, no markdown symbols (no #, *, or bullet characters). Use short paragraphs and simple lines like "Quantity: ...".
- Prices in Naira written as ₦ with thousands separators.
- Friendly, professional Nigerian English; easy for traders and households to read.
- Structure: one opening sentence about the produce and where it's from; then lines for Quality, Quantity available, Price, Delivery/pickup; end with a short invitation to place an order.
- Under 150 words. Output only the description.`;

  const { result, runIdFetch } = createResponsesCall(
    req,
    { baseURL: "https://ai.gateway.lovable.dev", apiKey, model: "openai/gpt-6-astra", system },
    [{ role: "user", content: `Farmer's details:\n${JSON.stringify(details, null, 2)}` }],
  );

  const response = result.toTextStreamResponse({ headers: corsHeaders });
  return withLovableAiGatewayRunIdHeader(response, runIdFetch, corsHeaders);
});

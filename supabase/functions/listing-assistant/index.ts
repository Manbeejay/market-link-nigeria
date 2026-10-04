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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "The listing assistant is not configured yet." }, 500);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Please sign in." }, 401);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) return json({ error: "Please sign in." }, 401);
  const user = userData.user;

  let body: { productId?: string; messages?: UIMessage[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const productId = typeof body.productId === "string" ? body.productId : "";
  const messages = Array.isArray(body.messages) ? body.messages.slice(-40) : [];
  if (!/^[0-9a-f-]{36}$/i.test(productId) || messages.length === 0) {
    return json({ error: "Invalid request." }, 400);
  }

  // RLS: only active subscribers see available listings (or the owner).
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("title, description, unit, price_per_unit, quantity_available, state, lga, status, categories(name), profiles!products_farmer_id_fkey(full_name)")
    .eq("id", productId)
    .maybeSingle();
  if (productError || !product) return json({ error: "Listing not found." }, 404);

  const p = product as any;
  const facts = {
    crop: p.title,
    category: p.categories?.name ?? null,
    price_per_unit: `₦${Number(p.price_per_unit).toLocaleString("en-NG")} per ${p.unit}`,
    quantity_available: `${Number(p.quantity_available)} ${p.unit}`,
    location: [p.lga, p.state].filter(Boolean).join(", ") || null,
    availability: p.status,
    farmer: p.profiles?.full_name ?? "Verified farmer",
    farmer_description_quality_and_delivery: p.description ?? null,
  };

  const system = `You are the MarketLink Nigeria listing assistant. You help a buyer understand ONE produce listing.
Answer ONLY from the farmer's stated listing details below (crop, quantity, quality, price, delivery and location).
Rules:
- If the details don't answer the question (e.g. exact harvest date, discounts, delivery to a place not mentioned), say the farmer hasn't stated it and suggest using "Message farmer" on this page to ask directly.
- Never invent facts, certifications, discounts or delivery promises. Do not negotiate on the farmer's behalf.
- You may do simple maths, e.g. total cost = quantity × price per unit, and say whether a requested quantity is available.
- Show money as ₦ with thousands separators. Keep answers short, friendly and clear.

LISTING DETAILS
${JSON.stringify(facts, null, 2)}`;

  const { result, runIdFetch } = createResponsesCall(
    req,
    { baseURL: "https://ai.gateway.lovable.dev", apiKey, model: "openai/gpt-6-astra", system },
    await convertToModelMessages(messages),
  );

  const response = result.toUIMessageStreamResponse({
    originalMessages: messages,
    sendReasoning: true,
    headers: corsHeaders,
    onFinish: async ({ messages: finalMessages }) => {
      const { error } = await supabase
        .from("listing_assistant_chats")
        .upsert(
          { user_id: user.id, product_id: productId, messages: finalMessages },
          { onConflict: "user_id,product_id" },
        );
      if (error) console.error("Failed to save listing chat", error);
    },
    onError: (error) => {
      console.error("listing-assistant stream error", error);
      const status = (error as { statusCode?: number })?.statusCode;
      if (status === 429) return "Too many requests right now. Please wait a moment and try again.";
      if (status === 402) return "AI credits have run out. Please add credits to keep using the assistant.";
      if (status === 403) return "The assistant isn't available for this account right now.";
      return "Sorry, the assistant couldn't answer just now. Please try again.";
    },
  });

  return withLovableAiGatewayRunIdHeader(response, runIdFetch, corsHeaders);
});

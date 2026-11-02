import { createClient } from "npm:@supabase/supabase-js@2";
import { NoObjectGeneratedError } from "npm:ai@7";
import { z } from "npm:zod@3";

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

// Strict-compatible: single object root, every property required, optional
// values nullable, no bounds/patterns. Counts and clamps happen in code.
const FinderSchema = z
  .object({
    category: z.string().nullable(),
    keywords: z.array(z.string()),
    state: z.string().nullable(),
    max_price: z.number().nullable(),
    min_quantity: z.number().nullable(),
    summary: z.string(),
  })
  .strict();

type Criteria = z.infer<typeof FinderSchema>;

const NIGERIAN_STATES =
  "Abia, Adamawa, Akwa Ibom, Anambra, Bauchi, Bayelsa, Benue, Borno, Cross River, Delta, Ebonyi, Edo, Ekiti, Enugu, FCT - Abuja, Gombe, Imo, Jigawa, Kaduna, Kano, Katsina, Kebbi, Kogi, Kwara, Lagos, Nasarawa, Niger, Ogun, Ondo, Osun, Oyo, Plateau, Rivers, Sokoto, Taraba, Yobe, Zamfara";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "The produce finder is not configured yet." }, 500);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Please sign in." }, 401);
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) return json({ error: "Please sign in." }, 401);

  let body: { query?: unknown };
  try { body = await req.json(); } catch { return json({ error: "Invalid request." }, 400); }
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (query.length < 3 || query.length > 600) {
    return json({ error: "Describe what you need in a few words (3–600 characters)." }, 400);
  }

  const { data: categories } = await supabase.from("categories").select("name").order("name");
  const categoryNames = (categories ?? []).map((c) => c.name as string);

  const system = `You turn a Nigerian produce buyer's request into search filters for MarketLink Nigeria, a farm produce marketplace. Use ONLY what the buyer wrote — never invent requirements.
Return: category (one of the listed category names that best matches, or null), keywords (up to 4 short produce words from the request that could appear in a listing title or description, e.g. "dried maize"; empty array if none), state (one of the listed Nigerian states if the buyer named a location, else null), max_price (the highest price per unit the buyer accepts, in Naira as a number, or null), min_quantity (the smallest quantity the buyer needs, as a number, or null), and summary (one short sentence restating what the buyer needs, plain text, under 25 words).
If the request is vague, leave fields null rather than guessing. Never guess prices or quantities.

CATEGORY NAMES: ${categoryNames.join(", ")}

STATES: ${NIGERIAN_STATES}`;

  const { result, runIdFetch } = createResponsesCall(
    req,
    { baseURL: "https://ai.gateway.lovable.dev", apiKey, model: "openai/gpt-6-astra", system, output: Output.object({ schema: FinderSchema }) },
    [{ role: "user", content: `Buyer's request: ${query}\n\nExtract the search filters.` }],
  );

  let criteria: Criteria;
  try {
    for await (const _ of result.textStream) {
      // Drain the stream so the request completes.
    }
    const output = await result.output;
    if (!output) throw new Error("empty output");
    criteria = output;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      return withLovableAiGatewayRunIdHeader(
        json({ error: "The finder could not read that request. Try rephrasing it." }, 502),
        runIdFetch,
        corsHeaders,
      );
    }
    return withLovableAiGatewayRunIdHeader(
      json({ error: "The produce finder is unavailable right now." }, 500),
      runIdFetch,
      corsHeaders,
    );
  }

  // Normalize and clamp model output; never trust it blindly.
  const keywords = criteria.keywords
    .map((k) => String(k).trim().toLowerCase())
    .filter((k) => k.length > 1)
    .slice(0, 4);
  const state = criteria.state?.trim() || null;
  const maxPrice = criteria.max_price !== null && Number.isFinite(criteria.max_price) && criteria.max_price > 0
    ? Number(criteria.max_price)
    : null;
  const minQuantity = criteria.min_quantity !== null && Number.isFinite(criteria.min_quantity) && criteria.min_quantity > 0
    ? Number(criteria.min_quantity)
    : null;
  const matchedCategory = criteria.category
    ? categoryNames.find((n) => n.toLowerCase() === criteria.category!.trim().toLowerCase())
    : null;
  const categoryId = matchedCategory
    ? (categories ?? []).find((c) => c.name === matchedCategory)?.name && (await supabase.from("categories").select("id, name").eq("name", matchedCategory).maybeSingle()).data?.id
    : null;

  let productQuery = supabase
    .from("products")
    .select(
      "id, title, description, category_id, unit, price_per_unit, quantity_available, state, lga, farmer_id, product_images(id, url, position), profiles!products_farmer_id_fkey(full_name)",
    )
    .eq("status", "available")
    .order("created_at", { ascending: false })
    .limit(60);
  if (categoryId) productQuery = productQuery.eq("category_id", categoryId);
  if (state) productQuery = productQuery.eq("state", state);
  if (maxPrice !== null) productQuery = productQuery.lte("price_per_unit", maxPrice);
  if (minQuantity !== null) productQuery = productQuery.gte("quantity_available", minQuantity);

  const { data: products, error } = await productQuery;
  if (error) return json({ error: "Could not search listings." }, 500);

  let results = (products ?? []) as unknown as Array<Record<string, unknown>>;
  if (keywords.length > 0) {
    const scored = results
      .map((p) => {
        const haystack = `${p.title ?? ""} ${p.description ?? ""}`.toLowerCase();
        const hits = keywords.filter((k) => haystack.includes(k)).length;
        return { p, hits };
      })
      .filter((s) => s.hits > 0)
      .sort((a, b) => b.hits - a.hits);
    if (scored.length > 0) results = scored.map((s) => s.p);
  }
  results = results.slice(0, 12);

  return withLovableAiGatewayRunIdHeader(
    json({
      summary: String(criteria.summary ?? "").slice(0, 200),
      criteria: { category: matchedCategory, keywords, state, max_price: maxPrice, min_quantity: minQuantity },
      results,
    }),
    runIdFetch,
    corsHeaders,
  );
});

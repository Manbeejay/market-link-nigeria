import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ProductImage from "@/components/ProductImage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Wand2, X } from "lucide-react";
import { formatNaira } from "@/lib/nigeria";

interface FinderProduct {
  id: string;
  title: string;
  description: string | null;
  unit: string;
  price_per_unit: number;
  quantity_available: number;
  state: string | null;
  lga: string | null;
  product_images: { id: string; url: string; position: number }[];
}

interface FinderResponse {
  summary: string;
  criteria: {
    category: string | null;
    keywords: string[];
    state: string | null;
    max_price: number | null;
    min_quantity: number | null;
  };
  results: FinderProduct[];
}

const EXAMPLES = [
  "I need 20 bags of dried maize from Kaduna, under ₦40,000 per bag",
  "Looking for fresh tomatoes in bulk near Lagos",
  "Catfish, table size, delivered to Abuja",
];

const NaturalSearch = ({ onActiveChange }: { onActiveChange: (active: boolean) => void }) => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [response, setResponse] = useState<FinderResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const find = async () => {
    const text = query.trim();
    if (!text || !user) return;
    setSearching(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/listing-finder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${data.session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ query: text }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error ?? "The produce finder is unavailable right now.");
      setResponse(payload as FinderResponse);
      onActiveChange(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const clear = () => {
    setResponse(null);
    setError(null);
    onActiveChange(false);
  };

  return (
    <Card className="mb-8">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-green-600" />
          <h2 className="font-semibold text-gray-900">Describe what you need</h2>
        </div>
        <p className="text-sm text-gray-500">
          Write your produce need in plain words — crop, quantity, price, location — and we'll find
          matching listings.
        </p>
        <Textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={EXAMPLES[0]}
          maxLength={600}
          rows={2}
          className="resize-none"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={find} disabled={searching || query.trim().length < 3}>
            {searching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            {searching ? "Searching..." : "Find produce"}
          </Button>
          {response && (
            <Button variant="outline" size="sm" onClick={clear}>
              <X className="mr-1 h-3.5 w-3.5" /> Clear results
            </Button>
          )}
          <span className="text-xs text-gray-400">Try: “{EXAMPLES[1]}”</span>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
};

export const FinderResults = ({ response, onClear }: { response: FinderResponse; onClear: () => void }) => {
  const criteriaBits = [
    response.criteria.category,
    response.criteria.state,
    response.criteria.max_price !== null ? `under ${formatNaira(response.criteria.max_price)}` : null,
  ].filter(Boolean);

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h2 className="text-lg font-semibold text-gray-900">Matched to your description</h2>
        <Button variant="outline" size="sm" onClick={onClear}>
          <X className="mr-1 h-3.5 w-3.5" /> Clear
        </Button>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        {response.summary}
        {criteriaBits.length > 0 && <> · Searching: {criteriaBits.join(", ")}</>}
      </p>
      {response.results.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <h3 className="font-semibold text-gray-900">No listings matched</h3>
            <p className="text-sm text-gray-600 max-w-md">
              Try removing a price limit or location, or describe the produce differently.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {response.results.map((product) => {
            const cover = (product.product_images ?? [])
              .slice()
              .sort((a, b) => a.position - b.position)[0];
            return (
              <Card key={product.id} className="overflow-hidden flex flex-col">
                <Link to={`/product/${product.id}`} className="flex flex-col flex-1">
                  <ProductImage path={cover?.url} alt={product.title} className="h-44 w-full" />
                  <CardContent className="p-4 flex flex-col gap-2 flex-1">
                    <h3 className="font-semibold text-gray-900">{product.title}</h3>
                    <p className="text-green-700 font-semibold">
                      {formatNaira(Number(product.price_per_unit))} / {product.unit}
                    </p>
                    <p className="text-sm text-gray-600">
                      {[product.lga, product.state].filter(Boolean).join(", ") || "Location not stated"}
                    </p>
                    <p className="text-sm text-gray-500 mt-auto pt-2">
                      {Number(product.quantity_available)} {product.unit} available
                    </p>
                  </CardContent>
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
};

export type { FinderResponse };
export default NaturalSearch;

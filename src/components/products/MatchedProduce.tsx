import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ProductImage from "@/components/ProductImage";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { formatNaira } from "@/lib/nigeria";

interface BrowseProduct {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  unit: string;
  price_per_unit: number;
  quantity_available: number;
  state: string | null;
  lga: string | null;
  farmer_id: string;
  product_images: { id: string; url: string; position: number }[];
  profiles: { full_name: string | null; location: string | null } | null;
}

interface InquiryProduct {
  product_id: string;
  products: { title: string; category_id: string | null; state: string | null } | null;
}

const MatchedProduce = ({
  products,
  categories,
}: {
  products: BrowseProduct[];
  categories: { id: string; name: string }[];
}) => {
  const { user } = useAuth();
  const [inquired, setInquired] = useState<InquiryProduct[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("inquiries")
      .select("product_id, products(title, category_id, state)")
      .eq("buyer_id", user.id)
      .then(({ data }) => setInquired((data ?? []) as unknown as InquiryProduct[]));
  }, [user]);

  const matches = useMemo(() => {
    if (!user || inquired.length === 0) return [];
    const categoryName = (id: string | null) =>
      categories.find((c) => c.id === id)?.name ?? "Uncategorised";
    const inquiredIds = new Set(inquired.map((i) => i.product_id));
    const seen = new Set<string>();
    const scored: { product: BrowseProduct; score: number; reasons: string[] }[] = [];

    for (const inq of inquired) {
      const src = inq.products;
      if (!src) continue;
      for (const p of products) {
        if (p.id === inq.product_id || inquiredIds.has(p.id) || seen.has(p.id)) continue;
        if (p.farmer_id === user.id) continue;
        const reasons: string[] = [];
        let score = 0;
        if (src.category_id && p.category_id === src.category_id) {
          score += 2;
          reasons.push(`Same category as your ${src.title} inquiry`);
        }
        if (src.state && p.state === src.state) {
          score += 1;
          reasons.push(`Also in ${p.state}`);
        }
        if (score === 0) continue;
        seen.add(p.id);
        scored.push({ product: p, score, reasons });
      }
    }
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((s) => ({ ...s, reason: s.reasons[0] }));
  }, [inquired, products, categories, user]);

  if (matches.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-4 w-4 text-green-600" />
        <h2 className="text-lg font-semibold text-gray-900">Matched to your inquiries</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Produce similar to listings you've already asked about.
      </p>
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {matches.map(({ product, reason }) => {
          const cover = (product.product_images ?? [])
            .slice()
            .sort((a, b) => a.position - b.position)[0];
          return (
            <Card key={product.id} className="overflow-hidden flex flex-col">
              <Link to={`/product/${product.id}`} className="flex flex-col flex-1">
                <ProductImage path={cover?.url} alt={product.title} className="h-40 w-full" />
                <CardContent className="p-4 flex flex-col gap-2 flex-1">
                  <Badge variant="secondary" className="w-fit max-w-full">
                    <span className="truncate">{reason}</span>
                  </Badge>
                  <h3 className="font-semibold text-gray-900">{product.title}</h3>
                  <p className="text-green-700 font-semibold">
                    {formatNaira(Number(product.price_per_unit))} / {product.unit}
                  </p>
                  <p className="text-sm text-gray-600">
                    {[product.lga, product.state].filter(Boolean).join(", ") || "Location not stated"}
                  </p>
                  <p className="text-sm text-gray-500 mt-auto pt-1">
                    {Number(product.quantity_available)} {product.unit} available
                  </p>
                </CardContent>
              </Link>
            </Card>
          );
        })}
      </div>
    </section>
  );
};

export default MatchedProduce;

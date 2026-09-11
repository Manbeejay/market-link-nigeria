import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductImage from "@/components/ProductImage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, SearchX } from "lucide-react";
import { NIGERIAN_STATES, formatNaira } from "@/lib/nigeria";

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

const ANY = "any";

const Browse = () => {
  const { user, loading: authLoading } = useAuth();
  const { isActive, loading: subLoading } = useSubscription();
  const navigate = useNavigate();

  const [products, setProducts] = useState<BrowseProduct[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState(ANY);
  const [state, setState] = useState(ANY);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (authLoading || subLoading) return;
    if (!user) navigate("/auth");
    else if (isActive === false) navigate("/subscribe");
  }, [authLoading, subLoading, user, isActive, navigate]);

  useEffect(() => {
    supabase
      .from("categories")
      .select("id, name")
      .order("name")
      .then(({ data }) => setCategories(data ?? []));
  }, []);

  const load = useCallback(async () => {
    if (!user || isActive !== true) return;
    setLoading(true);

    let query = supabase
      .from("products")
      .select(
        "id, title, description, category_id, unit, price_per_unit, quantity_available, state, lga, farmer_id, product_images(id, url, position), profiles!products_farmer_id_fkey(full_name, location)",
      )
      .eq("status", "available")
      .order("created_at", { ascending: false });

    if (category !== ANY) query = query.eq("category_id", category);
    if (state !== ANY) query = query.eq("state", state);
    if (minPrice !== "") query = query.gte("price_per_unit", Number(minPrice));
    if (maxPrice !== "") query = query.lte("price_per_unit", Number(maxPrice));
    if (search.trim()) query = query.ilike("title", `%${search.trim()}%`);

    const { data, error } = await query;
    if (error) console.error("Could not load products", error);
    setProducts((data ?? []) as unknown as BrowseProduct[]);
    setLoading(false);
  }, [user, isActive, category, state, minPrice, maxPrice, search]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const resetFilters = () => {
    setCategory(ANY);
    setState(ANY);
    setMinPrice("");
    setMaxPrice("");
    setSearch("");
  };

  const categoryName = useMemo(
    () => (id: string | null) => categories.find((c) => c.id === id)?.name ?? "Uncategorised",
    [categories],
  );

  const gate = authLoading || subLoading || isActive !== true;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900">Browse Products</h1>
        <p className="text-gray-600 mt-1 mb-8">
          Fresh produce listed directly by verified farmers across Nigeria.
        </p>

        {gate ? (
          <Skeleton className="h-64 w-full rounded-lg" />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
            <aside className="space-y-5 bg-white rounded-lg border p-5 h-fit">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Maize, yam, catfish..."
                />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>All categories</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>State</Label>
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>All states</SelectItem>
                    {NIGERIAN_STATES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Price range (₦ per unit)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    aria-label="Minimum price"
                  />
                  <span className="text-gray-400">–</span>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    aria-label="Maximum price"
                  />
                </div>
              </div>

              <Button variant="outline" className="w-full" onClick={resetFilters}>
                Clear filters
              </Button>
            </aside>

            <section>
              {loading ? (
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-72 w-full rounded-lg" />
                  ))}
                </div>
              ) : products.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                    <SearchX className="h-10 w-10 text-green-600" />
                    <h2 className="text-lg font-semibold text-gray-900">No products match</h2>
                    <p className="text-gray-600 max-w-sm">
                      Try widening your price range or choosing another state.
                    </p>
                    <Button variant="outline" onClick={resetFilters}>
                      Clear filters
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <p className="text-sm text-gray-500 mb-4">
                    {products.length} product{products.length === 1 ? "" : "s"} found
                  </p>
                  <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {products.map((product) => {
                      const cover = (product.product_images ?? [])
                        .slice()
                        .sort((a, b) => a.position - b.position)[0];
                      return (
                        <Card key={product.id} className="overflow-hidden flex flex-col">
                          <ProductImage path={cover?.url} alt={product.title} className="h-44 w-full" />
                          <CardContent className="p-4 flex flex-col gap-2 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-semibold text-gray-900">{product.title}</h3>
                              <Badge variant="secondary">{categoryName(product.category_id)}</Badge>
                            </div>
                            <p className="text-green-700 font-semibold">
                              {formatNaira(Number(product.price_per_unit))} / {product.unit}
                            </p>
                            {product.description && (
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {product.description}
                              </p>
                            )}
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-green-600" />
                              {[product.lga, product.state].filter(Boolean).join(", ") ||
                                "Location not stated"}
                            </p>
                            <p className="text-sm text-gray-500 mt-auto pt-2">
                              {Number(product.quantity_available)} {product.unit} available · by{" "}
                              {product.profiles?.full_name ?? "Verified farmer"}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Browse;

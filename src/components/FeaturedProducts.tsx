import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/lib/nigeria";

interface FeaturedProduct {
  id: string;
  title: string;
  category_name: string | null;
  unit: string;
  price_per_unit: number;
  quantity_available: number;
  state: string | null;
}

const FeaturedProducts = () => {
  const [products, setProducts] = useState<FeaturedProduct[]>([]);

  useEffect(() => {
    const load = async () => {
      // New database function, so the generated types don't list it yet.
      const { data, error } = await (supabase as any).rpc("get_featured_products");
      if (!error && data) setProducts(data as FeaturedProduct[]);
    };
    load();
  }, []);

  if (products.length === 0) return null;

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Latest Listings</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Fresh produce listed by farmers across Nigeria. Become a member to see full details and order.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {products.map((product) => (
            <Link key={product.id} to={`/product/${product.id}`}>
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">{product.title}</h3>
                    {product.category_name && <Badge variant="secondary">{product.category_name}</Badge>}
                  </div>
                  <p className="text-xl font-bold text-green-600">
                    {formatNaira(Number(product.price_per_unit))} / {product.unit}
                  </p>
                  <p className="text-sm text-gray-600">
                    {Number(product.quantity_available)} {product.unit} available
                  </p>
                  {product.state && (
                    <p className="flex items-center gap-1 text-sm text-gray-500">
                      <MapPin className="h-4 w-4" /> {product.state}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Link to="/browse">
            <Button size="lg" variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">
              View All Products
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;

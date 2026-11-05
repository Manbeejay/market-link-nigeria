import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Package, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  delivery_option?: string | null;
}

const CATEGORY_ICONS: Record<string, string> = {
  Grains: "🌾",
  Tubers: "🍠",
  Vegetables: "🍅",
  Fruits: "🍌",
  Livestock: "🐄",
  Poultry: "🐔",
  "Fish & Seafood": "🐟",
  "Cash Crops": "🌴",
  Legumes: "🫘",
  Others: "🧺",
};

const DELIVERY_LABELS: Record<string, string> = {
  delivery: "Delivery available",
  both: "Delivery or pickup",
  pickup: "Pickup only",
};

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
          {products.map((product) => {
            const icon = (product.category_name && CATEGORY_ICONS[product.category_name]) || "🌱";
            const deliveryLabel = product.delivery_option ? DELIVERY_LABELS[product.delivery_option] : null;
            return (
              <Link key={product.id} to={`/product/${product.id}`}>
                <Card className="h-full hover:shadow-lg transition-shadow duration-300 border-2 border-gray-100 hover:border-green-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="text-4xl mb-2">{icon}</div>
                      {product.category_name && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          {product.category_name}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg font-bold text-gray-900">{product.title}</CardTitle>
                    <div className="text-2xl font-bold text-green-600">
                      {formatNaira(Number(product.price_per_unit))} / {product.unit}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      {Number(product.quantity_available)} {product.unit} available
                    </div>
                    {product.state && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {product.state}
                      </div>
                    )}
                    {deliveryLabel && (
                      <div
                        className={`flex items-center gap-2 ${
                          product.delivery_option === "pickup" ? "text-gray-600" : "text-green-700"
                        }`}
                      >
                        <Truck className="h-4 w-4" />
                        {deliveryLabel}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
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

import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductImage from "@/components/ProductImage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, User } from "lucide-react";
import { formatNaira } from "@/lib/nigeria";

interface DetailProduct {
  id: string;
  title: string;
  description: string | null;
  unit: string;
  price_per_unit: number;
  quantity_available: number;
  state: string | null;
  lga: string | null;
  farmer_id: string;
  status: string;
  product_images: { id: string; url: string; position: number }[];
  profiles: { full_name: string | null; location: string | null; phone_number: string | null } | null;
}

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { isActive, loading: subLoading } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [product, setProduct] = useState<DetailProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState("1");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading || subLoading) return;
    if (!user) navigate("/auth");
    else if (isActive === false) navigate("/subscribe");
  }, [authLoading, subLoading, user, isActive, navigate]);

  useEffect(() => {
    if (!id || !user || isActive !== true) return;
    setLoading(true);
    supabase
      .from("products")
      .select(
        "id, title, description, unit, price_per_unit, quantity_available, state, lga, farmer_id, status, product_images(id, url, position), profiles!products_farmer_id_fkey(full_name, location, phone_number)",
      )
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error("Could not load product", error);
        setProduct((data as unknown as DetailProduct) ?? null);
        setLoading(false);
      });
  }, [id, user, isActive]);

  const qty = Number(quantity);
  const total = product ? qty * Number(product.price_per_unit) : 0;
  const isOwnProduct = product?.farmer_id === user?.id;

  const requestOrder = async () => {
    if (!product || !user) return;
    if (!(qty > 0)) {
      toast({ title: "Enter a quantity", variant: "destructive" });
      return;
    }
    if (qty > Number(product.quantity_available)) {
      toast({
        title: "Not enough available",
        description: `Only ${product.quantity_available} ${product.unit} left.`,
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("orders").insert({
      buyer_id: user.id,
      farmer_id: product.farmer_id,
      product_id: product.id,
      quantity: qty,
      unit_price: Number(product.price_per_unit),
      total_amount: total,
      status: "requested",
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Could not send request", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Request sent",
        description: "The farmer will accept or decline shortly. Track it under My Orders.",
      });
      navigate("/orders");
    }
  };

  const gate = authLoading || subLoading || isActive !== true;
  const images = (product?.product_images ?? []).slice().sort((a, b) => a.position - b.position);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {gate || loading ? (
          <Skeleton className="h-96 w-full rounded-lg" />
        ) : !product ? (
          <Card>
            <CardContent className="py-16 text-center space-y-3">
              <h1 className="text-xl font-semibold text-gray-900">Product not found</h1>
              <Link to="/browse" className="text-green-700 underline">
                Back to browse
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-3">
              <ProductImage
                path={images[0]?.url}
                alt={product.title}
                className="h-80 w-full rounded-lg"
              />
              {images.length > 1 && (
                <div className="grid grid-cols-4 gap-3">
                  {images.slice(1, 5).map((img) => (
                    <ProductImage
                      key={img.id}
                      path={img.url}
                      alt={product.title}
                      className="h-20 w-full rounded-md"
                    />
                  ))}
                </div>
              )}
            </div>

            <div>
              <h1 className="text-3xl font-bold text-gray-900">{product.title}</h1>
              <p className="text-2xl text-green-700 font-semibold mt-2">
                {formatNaira(Number(product.price_per_unit))} / {product.unit}
              </p>
              <p className="text-gray-600 mt-1">
                {Number(product.quantity_available)} {product.unit} available
              </p>
              {product.description && <p className="text-gray-700 mt-4">{product.description}</p>}

              <div className="mt-4 space-y-1 text-gray-600">
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-green-600" />
                  {[product.lga, product.state].filter(Boolean).join(", ") || "Location not stated"}
                </p>
                <p className="flex items-center gap-2">
                  <User className="h-4 w-4 text-green-600" />
                  {product.profiles?.full_name ?? "Verified farmer"}
                </p>
              </div>

              <Card className="mt-6">
                <CardContent className="p-5 space-y-4">
                  {isOwnProduct ? (
                    <p className="text-gray-600">
                      This is your own listing. Manage it from{" "}
                      <Link to="/my-listings" className="text-green-700 underline">
                        My Listings
                      </Link>
                      .
                    </p>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="qty">Quantity ({product.unit})</Label>
                        <Input
                          id="qty"
                          type="number"
                          min="1"
                          max={Number(product.quantity_available)}
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                        />
                      </div>
                      <p className="text-lg font-semibold text-gray-900">
                        Total: {formatNaira(total)}
                      </p>
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={requestOrder}
                        disabled={submitting || product.status !== "available"}
                      >
                        {submitting ? "Sending request..." : "Request this order"}
                      </Button>
                      <p className="text-sm text-gray-500">
                        You pay only after the farmer accepts your request.
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ProductDetail;

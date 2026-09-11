import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductImage from "@/components/ProductImage";
import ProductFormDialog, { ProductRow } from "@/components/products/ProductFormDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, PackageSearch } from "lucide-react";
import { formatNaira } from "@/lib/nigeria";
import { PRODUCT_BUCKET } from "@/hooks/useProductImageUrl";

const statusLabels: Record<string, string> = {
  available: "Available",
  sold_out: "Sold out",
  inactive: "Hidden",
};

const MyListings = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [deleting, setDeleting] = useState<ProductRow | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [productsRes, categoriesRes] = await Promise.all([
      supabase
        .from("products")
        .select("*, product_images(id, url, position)")
        .eq("farmer_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("categories").select("id, name").order("name"),
    ]);

    if (productsRes.error) {
      toast({
        title: "Could not load your listings",
        description: productsRes.error.message,
        variant: "destructive",
      });
    } else {
      setProducts((productsRes.data ?? []) as unknown as ProductRow[]);
    }
    setCategories(categoriesRes.data ?? []);
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!deleting) return;
    const paths = (deleting.product_images ?? []).map((i) => i.url).filter(Boolean);
    const { error } = await supabase.from("products").delete().eq("id", deleting.id);
    if (error) {
      toast({ title: "Could not delete listing", description: error.message, variant: "destructive" });
    } else {
      if (paths.length) await supabase.storage.from(PRODUCT_BUCKET).remove(paths);
      toast({ title: "Listing deleted" });
      setProducts((p) => p.filter((x) => x.id !== deleting.id));
    }
    setDeleting(null);
  };

  const categoryName = (id: string | null) =>
    categories.find((c) => c.id === id)?.name ?? "Uncategorised";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Listings</h1>
            <p className="text-gray-600 mt-1">
              Add your produce, keep prices current and manage availability.
            </p>
          </div>
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Add listing
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-64 w-full rounded-lg" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <PackageSearch className="h-10 w-10 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">No listings yet</h2>
              <p className="text-gray-600 max-w-sm">
                Publish your first product so buyers across Nigeria can find you.
              </p>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Add your first listing
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const cover = (product.product_images ?? [])
                .slice()
                .sort((a, b) => a.position - b.position)[0];
              return (
                <Card key={product.id} className="overflow-hidden flex flex-col">
                  <ProductImage
                    path={cover?.url}
                    alt={product.title}
                    className="h-40 w-full"
                  />
                  <CardContent className="p-4 flex-1 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-gray-900">{product.title}</h3>
                      <Badge
                        variant={product.status === "available" ? "default" : "secondary"}
                        className={product.status === "available" ? "bg-green-600" : ""}
                      >
                        {statusLabels[product.status] ?? product.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">{categoryName(product.category_id)}</p>
                    <p className="text-green-700 font-semibold">
                      {formatNaira(Number(product.price_per_unit))} / {product.unit}
                    </p>
                    <p className="text-sm text-gray-600">
                      {Number(product.quantity_available)} {product.unit} available
                      {product.state ? ` · ${product.state}` : ""}
                    </p>
                    <div className="mt-auto flex gap-2 pt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setEditing(product);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => setDeleting(product)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete {product.title}</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <p className="mt-8 text-sm text-gray-500">
          Looking to buy instead?{" "}
          <Link to="/browse" className="text-green-700 underline">
            Browse products
          </Link>
        </p>
      </main>
      <Footer />

      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editing}
        categories={categories}
        onSaved={load}
      />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.title}” and its photos will be removed permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MyListings;

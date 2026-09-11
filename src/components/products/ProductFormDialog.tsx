import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, X } from "lucide-react";
import { NIGERIAN_STATES, PRODUCT_UNITS } from "@/lib/nigeria";
import { PRODUCT_BUCKET } from "@/hooks/useProductImageUrl";
import ProductImage from "@/components/ProductImage";

export interface ProductRow {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  unit: string;
  price_per_unit: number;
  quantity_available: number;
  state: string | null;
  lga: string | null;
  status: string;
  product_images?: { id: string; url: string; position: number }[];
}

interface Category {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductRow | null;
  categories: Category[];
  onSaved: () => void;
}

const emptyForm = {
  title: "",
  description: "",
  category_id: "",
  unit: "kg",
  price_per_unit: "",
  quantity_available: "",
  state: "",
  lga: "",
  status: "available",
};

const ProductFormDialog = ({ open, onOpenChange, product, categories, onSaved }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [existingImages, setExistingImages] = useState<{ id: string; url: string }[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!open) return;
    setNewFiles([]);
    if (product) {
      setForm({
        title: product.title ?? "",
        description: product.description ?? "",
        category_id: product.category_id ?? "",
        unit: product.unit ?? "kg",
        price_per_unit: String(product.price_per_unit ?? ""),
        quantity_available: String(product.quantity_available ?? ""),
        state: product.state ?? "",
        lga: product.lga ?? "",
        status: product.status ?? "available",
      });
      setExistingImages(
        (product.product_images ?? [])
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((i) => ({ id: i.id, url: i.url })),
      );
    } else {
      setForm(emptyForm);
      setExistingImages([]);
    }
  }, [open, product]);

  const set = (key: keyof typeof emptyForm, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const removeExistingImage = async (image: { id: string; url: string }) => {
    const { error } = await supabase.from("product_images").delete().eq("id", image.id);
    if (error) {
      toast({ title: "Could not remove photo", description: error.message, variant: "destructive" });
      return;
    }
    await supabase.storage.from(PRODUCT_BUCKET).remove([image.url]);
    setExistingImages((imgs) => imgs.filter((i) => i.id !== image.id));
  };

  const uploadImages = async (productId: string, startPosition: number) => {
    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user!.id}/${productId}/${Date.now()}-${i}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(PRODUCT_BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type });
      if (uploadError) throw uploadError;
      const { error: rowError } = await supabase
        .from("product_images")
        .insert({ product_id: productId, url: path, position: startPosition + i });
      if (rowError) throw rowError;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!form.title.trim()) {
      toast({ title: "Please add a product name", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        farmer_id: user.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        category_id: form.category_id || null,
        unit: form.unit,
        price_per_unit: Number(form.price_per_unit) || 0,
        quantity_available: Number(form.quantity_available) || 0,
        state: form.state || null,
        lga: form.lga.trim() || null,
        status: form.status,
      };

      let productId = product?.id;

      if (product) {
        const { error } = await supabase.from("products").update(payload).eq("id", product.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        productId = data.id;
      }

      if (newFiles.length && productId) {
        await uploadImages(productId, existingImages.length);
      }

      toast({ title: product ? "Listing updated" : "Listing published" });
      onOpenChange(false);
      onSaved();
    } catch (error: any) {
      toast({
        title: "Could not save the listing",
        description: error?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Edit listing" : "Add a new listing"}</DialogTitle>
          <DialogDescription>
            Buyers with an active membership can see available listings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Product name</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. White Maize"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Quality, harvest date, packaging, delivery options..."
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category_id} onValueChange={(v) => set("category_id", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Unit</Label>
              <Select value={form.unit} onValueChange={(v) => set("unit", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price per unit (₦)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={form.price_per_unit}
                onChange={(e) => set("price_per_unit", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity available</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                step="0.01"
                value={form.quantity_available}
                onChange={(e) => set("quantity_available", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>State</Label>
              <Select value={form.state} onValueChange={(v) => set("state", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {NIGERIAN_STATES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lga">Local government area</Label>
              <Input
                id="lga"
                value={form.lga}
                onChange={(e) => set("lga", e.target.value)}
                placeholder="e.g. Ikorodu"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Availability</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="sold_out">Sold out</SelectItem>
                <SelectItem value="inactive">Hidden</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="photos">Photos</Label>
            <div className="flex flex-wrap gap-3">
              {existingImages.map((image) => (
                <div key={image.id} className="relative">
                  <ProductImage
                    path={image.url}
                    alt="Product photo"
                    className="h-20 w-20 rounded-md border"
                  />
                  <button
                    type="button"
                    onClick={() => removeExistingImage(image)}
                    className="absolute -right-2 -top-2 rounded-full bg-red-600 p-1 text-white"
                    aria-label="Remove photo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {newFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className="relative">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="h-20 w-20 rounded-md border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setNewFiles((f) => f.filter((_, i) => i !== index))}
                    className="absolute -right-2 -top-2 rounded-full bg-red-600 p-1 text-white"
                    aria-label="Remove photo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-green-400 text-xs text-green-700 hover:bg-green-50">
                <Upload className="h-4 w-4" />
                Add
                <input
                  id="photos"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    setNewFiles((f) => [...f, ...files]);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <p className="text-xs text-gray-500">JPG or PNG, up to 5 MB each.</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {product ? "Save changes" : "Publish listing"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProductFormDialog;

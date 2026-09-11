import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const PRODUCT_BUCKET = "product-images";

const cache = new Map<string, string>();

/** Turns a storage path stored in product_images.url into a viewable signed URL. */
export const getProductImageUrl = async (path: string | null | undefined) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const cached = cache.get(path);
  if (cached) return cached;
  const { data, error } = await supabase.storage
    .from(PRODUCT_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return null;
  cache.set(path, data.signedUrl);
  return data.signedUrl;
};

export const useProductImageUrl = (path: string | null | undefined) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getProductImageUrl(path).then((u) => {
      if (active) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [path]);

  return url;
};

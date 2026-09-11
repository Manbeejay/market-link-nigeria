import { ImageIcon } from "lucide-react";
import { useProductImageUrl } from "@/hooks/useProductImageUrl";

interface ProductImageProps {
  path?: string | null;
  alt: string;
  className?: string;
}

const ProductImage = ({ path, alt, className = "" }: ProductImageProps) => {
  const url = useProductImageUrl(path);

  if (!url) {
    return (
      <div
        className={`flex items-center justify-center bg-green-50 text-green-300 ${className}`}
        aria-hidden="true"
      >
        <ImageIcon className="h-8 w-8" />
      </div>
    );
  }

  return <img src={url} alt={alt} loading="lazy" className={`object-cover ${className}`} />;
};

export default ProductImage;

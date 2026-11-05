import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/lib/nigeria";
import { CATEGORY_ICONS, DELIVERY_LABELS } from "@/lib/listingDisplay";

interface FreshListing {
  id: string;
  title: string;
  category_name: string | null;
  unit: string;
  price_per_unit: number;
  quantity_available: number;
  state: string | null;
  delivery_option: string | null;
}

const Hero = () => {
  const [listing, setListing] = useState<FreshListing | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      // New database function, so the generated types don't list it yet.
      const { data } = await (supabase as any).rpc("get_fresh_today");
      setListing(Array.isArray(data) && data.length > 0 ? (data[0] as FreshListing) : null);
      setLoaded(true);
    };
    load();
  }, []);

  const icon = (listing?.category_name && CATEGORY_ICONS[listing.category_name]) || "🌱";
  const deliveryLabel = listing?.delivery_option ? DELIVERY_LABELS[listing.delivery_option] : null;
  const deliveryIcon = listing?.delivery_option === "pickup" ? "🏠" : "🚚";

  return (
    <section className="relative bg-gradient-to-br from-green-50 via-white to-orange-50 py-20 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Connecting Nigerian
                <span className="text-green-600"> Farmers</span> with
                <span className="text-orange-500"> Buyers</span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Bridge the gap between agricultural producers and consumers.
                Fresh produce, fair prices, direct connections across Nigeria.
              </p>
            </div>

            <Link to="/auth?role=farmer">
              <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg">
                Join as Farmer
              </Button>
            </Link>
            <Link to="/browse">
              <Button size="lg" variant="outline" className="border-orange-500 text-orange-500 hover:bg-orange-50 px-8 py-4 text-lg">
                Find Products
              </Button>
            </Link>

            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">Direct</div>
                <div className="text-sm text-gray-600">Farmer to Buyer</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">Secure</div>
                <div className="text-sm text-gray-600">Paystack Payments</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">36+</div>
                <div className="text-sm text-gray-600">Nigerian States</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-3xl p-8 shadow-2xl">
              <div className="bg-white rounded-2xl p-6 space-y-4">
                {!loaded ? (
                  <div className="space-y-4 animate-pulse">
                    <div className="h-5 bg-gray-200 rounded w-2/3" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-10 bg-gray-200 rounded" />
                  </div>
                ) : listing ? (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-gray-900">{listing.title}</h3>
                      <span className="text-green-600 font-bold whitespace-nowrap">
                        {formatNaira(Number(listing.price_per_unit))}/{listing.unit}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>
                        {icon} {listing.category_name ?? "Fresh produce"} • {Number(listing.quantity_available)}{" "}
                        {listing.unit} available
                      </div>
                      {(listing.state || deliveryLabel) && (
                        <div>
                          {listing.state && <>📍 {listing.state}</>}
                          {listing.state && deliveryLabel && " • "}
                          {deliveryLabel && (
                            <>
                              {deliveryIcon} {deliveryLabel}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <Link to={`/product/${listing.id}`}>
                      <Button className="w-full bg-green-600 hover:bg-green-700">View Listing</Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <h3 className="font-semibold text-gray-900">Your produce could be here</h3>
                    <p className="text-sm text-gray-600">
                      List what you have harvested and reach buyers across Nigeria.
                    </p>
                    <Link to="/auth?role=farmer">
                      <Button className="w-full bg-green-600 hover:bg-green-700">Join as Farmer</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Floating elements */}
            {listing && (
              <div className="absolute -top-4 -left-4 bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                Fresh Today! {icon}
              </div>
            )}
            <div className="absolute -bottom-4 -right-4 bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
              Direct Trade 🤝
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <ArrowDown className="h-6 w-6 text-gray-400" />
      </div>
    </section>
  );
};

export default Hero;

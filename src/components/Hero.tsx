
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";

const Hero = () => {
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

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg">
                Join as Farmer
              </Button>
              <Button size="lg" variant="outline" className="border-orange-500 text-orange-500 hover:bg-orange-50 px-8 py-4 text-lg">
                Find Products
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">500+</div>
                <div className="text-sm text-gray-600">Active Farmers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">1,200+</div>
                <div className="text-sm text-gray-600">Happy Buyers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">50+</div>
                <div className="text-sm text-gray-600">Nigerian States</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-3xl p-8 shadow-2xl">
              <div className="bg-white rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Fresh Tomatoes</h3>
                  <span className="text-green-600 font-bold">₦2,500/bag</span>
                </div>
                <div className="text-sm text-gray-600">
                  📍 Kano State • 🚚 Available for delivery
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-sm">AM</span>
                  </div>
                  <span className="text-sm font-medium">Aminu Mohammed</span>
                  <div className="flex text-yellow-400 text-xs">
                    ⭐⭐⭐⭐⭐
                  </div>
                </div>
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  Contact Farmer
                </Button>
              </div>
            </div>
            
            {/* Floating elements */}
            <div className="absolute -top-4 -left-4 bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
              Fresh Today! 🥕
            </div>
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

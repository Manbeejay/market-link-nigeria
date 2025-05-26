
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const Header = () => {
  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="text-2xl font-bold text-green-600 flex items-center gap-2">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">🌾</span>
              </div>
              MarketLink Nigeria
            </div>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search for products, farmers, or buyers..."
                className="pl-10 pr-4 py-2 w-full border-gray-300 focus:border-green-500 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center space-x-4">
            <Button variant="ghost" className="text-gray-700 hover:text-green-600">
              Browse Products
            </Button>
            <Button variant="ghost" className="text-gray-700 hover:text-green-600">
              For Farmers
            </Button>
            <Button variant="ghost" className="text-gray-700 hover:text-green-600">
              For Buyers
            </Button>
            <Button variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">
              Sign In
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white">
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

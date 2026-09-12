
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import Logo from "./Logo";
import UserMenu from "./UserMenu";

const Header = () => {
  const { user } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/">
              <Logo size="md" showText={true} />
            </Link>
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
            <Link to="/browse">
              <Button variant="ghost" className="text-gray-700 hover:text-green-600">
                Browse Products
              </Button>
            </Link>
            <Link to="/my-listings">
              <Button variant="ghost" className="text-gray-700 hover:text-green-600">
                My Listings
              </Button>
            </Link>
            
            {user ? (
              <UserMenu />
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">
                    Sign In
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Star } from "lucide-react";

const FeaturedProducts = () => {
  const products = [
    {
      id: 1,
      name: "Premium Rice (50kg)",
      price: "₦45,000",
      farmer: "Fatima Aliyu",
      location: "Kebbi State",
      rating: 4.9,
      image: "🌾",
      category: "Grains",
      available: "2 tons",
      delivery: "Available"
    },
    {
      id: 2,
      name: "Fresh Tomatoes",
      price: "₦2,500/basket",
      farmer: "Ibrahim Musa",
      location: "Plateau State",
      rating: 4.8,
      image: "🍅",
      category: "Vegetables",
      available: "50 baskets",
      delivery: "Available"
    },
    {
      id: 3,
      name: "Organic Plantain",
      price: "₦1,800/bunch",
      farmer: "Chinyere Okafor",
      location: "Ogun State",
      rating: 5.0,
      image: "🍌",
      category: "Fruits",
      available: "100 bunches",
      delivery: "Available"
    },
    {
      id: 4,
      name: "Live Chickens",
      price: "₦3,500/bird",
      farmer: "Ahmed Bello",
      location: "Kaduna State",
      rating: 4.7,
      image: "🐔",
      category: "Livestock",
      available: "200 birds",
      delivery: "Pickup only"
    },
    {
      id: 5,
      name: "Sweet Potatoes",
      price: "₦800/tuber",
      farmer: "Grace Adebayo",
      location: "Osun State",
      rating: 4.6,
      image: "🍠",
      category: "Tubers",
      available: "500 tubers",
      delivery: "Available"
    },
    {
      id: 6,
      name: "Palm Oil (25L)",
      price: "₦18,000",
      farmer: "Emmanuel Okonkwo",
      location: "Imo State",
      rating: 4.9,
      image: "🫒",
      category: "Oil",
      available: "20 gallons",
      delivery: "Available"
    }
  ];

  const categories = ["All", "Grains", "Vegetables", "Fruits", "Livestock", "Tubers", "Oil"];

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Featured Products
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Discover fresh, quality agricultural products from verified farmers across Nigeria
          </p>
          
          {/* Category filters */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {categories.map((category) => (
              <Badge
                key={category}
                variant={category === "All" ? "default" : "secondary"}
                className={`px-4 py-2 cursor-pointer hover:bg-green-100 ${
                  category === "All" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-700"
                }`}
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {products.map((product) => (
            <Card key={product.id} className="hover:shadow-lg transition-shadow duration-300 border-2 border-gray-100 hover:border-green-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="text-4xl mb-2">{product.image}</div>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    {product.category}
                  </Badge>
                </div>
                <CardTitle className="text-lg font-bold text-gray-900">
                  {product.name}
                </CardTitle>
                <div className="text-2xl font-bold text-green-600">
                  {product.price}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium">{product.farmer.split(' ').map(n => n[0]).join('')}</span>
                  </div>
                  <div>
                    <div className="font-medium text-sm text-gray-900">{product.farmer}</div>
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <MapPin className="h-3 w-3" />
                      {product.location}
                    </div>
                  </div>
                  <div className="ml-auto flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-400 fill-current" />
                    <span className="text-xs font-medium">{product.rating}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Available:</span>
                    <div className="font-medium">{product.available}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Delivery:</span>
                    <div className="font-medium">{product.delivery}</div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                    Contact Farmer
                  </Button>
                  <Button variant="outline" size="icon" className="border-green-600 text-green-600 hover:bg-green-50">
                    <Phone className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button size="lg" variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">
            View All Products
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;

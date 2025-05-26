
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Search, ShoppingCart } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      icon: Users,
      title: "Create Your Profile",
      description: "Farmers showcase their products, buyers create their requirements",
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      icon: Search,
      title: "Discover & Connect",
      description: "Use our smart search to find the perfect match for your needs",
      color: "text-orange-500",
      bgColor: "bg-orange-100"
    },
    {
      icon: ShoppingCart,
      title: "Trade Directly",
      description: "Negotiate prices, arrange delivery, and complete transactions safely",
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            How MarketLink Works
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Simple, secure, and efficient way to connect agricultural producers with buyers across Nigeria
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <Card key={index} className="relative border-2 border-gray-100 hover:border-green-200 transition-all duration-300 hover:shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className={`w-16 h-16 ${step.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <step.icon className={`h-8 w-8 ${step.color}`} />
                </div>
                <CardTitle className="text-xl font-bold text-gray-900">
                  {step.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </CardContent>
              
              {/* Step number */}
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                {index + 1}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;

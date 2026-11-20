import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Search, ShoppingCart } from "lucide-react";
import HowItWorksDialog from "./HowItWorksDialog";

const HowItWorks = () => {
  const [guideOpen, setGuideOpen] = useState(false);

  const steps = [
    {
      icon: Users,
      title: "Join and Set Up",
      description:
        "Register with your email and activate your annual membership. Farmers also add their bank details and list their produce.",
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      icon: Search,
      title: "Find and Request",
      description:
        "Buyers browse listings, message the farmer, and request a quantity. The farmer accepts or declines, and you pay nothing at this stage.",
      color: "text-orange-500",
      bgColor: "bg-orange-100",
    },
    {
      icon: ShoppingCart,
      title: "Pay Securely and Confirm",
      description:
        "After the farmer accepts, the buyer pays through Paystack. You arrange pickup or delivery together, and the buyer confirms receipt.",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            How MarketLink Works
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            A simple, secure way to connect agricultural producers with buyers across Nigeria
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <Card
              key={index}
              className="relative border-2 border-gray-100 hover:border-green-200 transition-all duration-300 hover:shadow-lg"
            >
              <CardHeader className="text-center pb-4">
                <div
                  className={`w-16 h-16 ${step.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}
                >
                  <step.icon className={`h-8 w-8 ${step.color}`} />
                </div>
                <CardTitle className="text-xl font-bold text-gray-900">{step.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 leading-relaxed">{step.description}</p>
              </CardContent>

              {/* Step number */}
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                {index + 1}
              </div>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button
            size="lg"
            variant="outline"
            className="border-green-600 text-green-600 hover:bg-green-50"
            onClick={() => setGuideOpen(true)}
          >
            See the step-by-step guide
          </Button>
        </div>
      </div>

      <HowItWorksDialog open={guideOpen} onOpenChange={setGuideOpen} />
    </section>
  );
};

export default HowItWorks;

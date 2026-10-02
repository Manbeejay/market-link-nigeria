import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2 } from "lucide-react";
import Logo from "./Logo";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Footer = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async () => {
    if (!email.trim()) {
      toast({ title: "Enter an email address first", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("newsletter_subscribers").insert({ email: email.trim() });
    setSubmitting(false);
    if (error) {
      if (error.code === "23505") {
        toast({ title: "That email is already subscribed" });
        setSubscribed(true);
        return;
      }
      toast({ title: "Could not subscribe", description: error.message, variant: "destructive" });
      return;
    }
    setSubscribed(true);
    setEmail("");
  };

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Logo size="md" showText={true} className="text-green-400" />
            <p className="text-gray-400 leading-relaxed">
              Connecting Nigerian farmers with buyers for fresh, quality agricultural products and fair trade.
            </p>
            <div className="flex space-x-4">
              <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-600">
                <span className="text-sm">f</span>
              </div>
              <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-600">
                <span className="text-sm">t</span>
              </div>
              <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-600">
                <span className="text-sm">in</span>
              </div>
            </div>
          </div>

          {/* For Farmers */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">For Farmers</h3>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Sell Your Products</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Farmer Resources</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Success Stories</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Training Programs</a></li>
            </ul>
          </div>

          {/* For Buyers */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">For Buyers</h3>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Browse Products</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Quality Guarantee</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Bulk Orders</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Delivery Options</a></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Stay Updated</h3>
            <p className="text-gray-400 text-sm">
              Get the latest updates on fresh products and market trends.
            </p>
            {subscribed ? (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span>You're subscribed. Thanks for joining.</span>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                />
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={handleSubscribe}
                  disabled={submitting}
                >
                  {submitting ? "Subscribing..." : "Subscribe"}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="grid md:grid-cols-2 gap-4 items-center">
            <div className="text-gray-400 text-sm space-y-1">
              <p>© 2026 MarketLink Nigeria. All rights reserved.</p>
              <p>MarketLink Nigeria is a product built for Greendale Farms MCS Ltd.</p>
            </div>
            <div className="flex space-x-6 text-sm text-gray-400 md:justify-end">
              <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link to="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link>
              <Link to="/contact-us" className="hover:text-white transition-colors">Contact Us</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

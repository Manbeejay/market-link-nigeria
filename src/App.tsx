
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Subscribe from "./pages/Subscribe";
import Browse from "./pages/Browse";
import MyListings from "./pages/MyListings";
import ProductDetail from "./pages/ProductDetail";
import Orders from "./pages/Orders";
import BankAccount from "./pages/BankAccount";
import Wallet from "./pages/Wallet";
import SubscriptionPayments from "./pages/SubscriptionPayments";
import WalletAssistant from "./pages/WalletAssistant";
import Inquiries from "./pages/Inquiries";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import ContactUs from "./pages/ContactUs";
import Settings from "./pages/Settings";
import ScrollToTop from "./components/ScrollToTop";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/subscribe" element={<Subscribe />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/my-listings" element={<MyListings />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/bank-account" element={<BankAccount />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/subscription-payments" element={<SubscriptionPayments />} />
            <Route path="/wallet/assistant" element={<WalletAssistant />} />
            <Route path="/wallet/assistant/:threadId" element={<WalletAssistant />} />
            <Route path="/inquiries" element={<Inquiries />} />
            <Route path="/inquiries/:inquiryId" element={<Inquiries />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/contact-us" element={<ContactUs />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/scroll-to-top" element={<ScrollToTop />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import Header from "@/components/Header";
import Footer from "@/components/Footer";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full prose prose-gray">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-gray-500 text-sm mb-8">Last updated: October 2, 2026</p>

        <p>
          These terms govern your use of MarketLink Nigeria, a product built for Greendale Farms MCS Ltd.
          By creating an account, you agree to them.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">Membership</h2>
        <p>
          Access to the marketplace requires a yearly membership fee, currently ₦5,000, paid through
          Paystack. Membership runs for 12 months from the day you pay and must be renewed to keep access.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">The marketplace</h2>
        <p>
          MarketLink Nigeria connects farmers and buyers and provides the tools to agree on and pay for an
          order. We are not a party to the trade itself: the farmer is responsible for the product sold,
          and the buyer is responsible for payment. A commission is deducted from each completed order
          before the farmer's share is paid out.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">Your responsibilities</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Give accurate information about yourself and, if you're a farmer, about what you're selling.</li>
          <li>Honor orders you accept, and pay for orders you place.</li>
          <li>Don't use the platform for anything illegal or to defraud another user.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-2">Payments</h2>
        <p>
          Paystack processes all payments. We don't store your card details. Commission rates and
          membership fees may change; we'll post any change here before it takes effect.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">Account suspension</h2>
        <p>
          We can suspend or close an account that breaks these terms, defrauds another user, or is used
          for anything illegal.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">Limitation of liability</h2>
        <p>
          MarketLink Nigeria is provided as is. We work to keep the platform running and payments accurate,
          but we aren't liable for losses arising from a trade disagreement between a farmer and a buyer.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">Governing law</h2>
        <p>These terms are governed by the laws of the Federal Republic of Nigeria.</p>

        <p className="text-sm text-gray-500 mt-10 border-t pt-4">
          This is a starting template, not a substitute for legal advice. Have it reviewed by a lawyer
          before you rely on it in production, particularly the commission, liability, and dispute terms.
        </p>
      </main>
      <Footer />
    </div>
  );
};

export default TermsOfService;

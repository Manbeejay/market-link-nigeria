import Header from "@/components/Header";
import Footer from "@/components/Footer";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full prose prose-gray">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-8">Last updated: October 2, 2026</p>

        <p>
          MarketLink Nigeria is a product built for Greendale Farms MCS Ltd. This policy explains what
          information we collect from farmers and buyers who use the platform, and how it's used.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">Information we collect</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Account details: your name, phone number, email, and location.</li>
          <li>Marketplace activity: product listings, orders, messages between buyers and farmers, and reviews.</li>
          <li>Payment information: membership and order payments are processed by Paystack. We store the
            payment reference and amount, never your card details, which stay with Paystack.</li>
          <li>Bank details for farmers who want to receive payouts, used only to set up payment splitting
            through Paystack.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-2">How we use it</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>To run the marketplace: matching farmers and buyers, processing orders, and paying out farmers.</li>
          <li>To confirm membership and order payments.</li>
          <li>To contact you about your account or an order.</li>
          <li>To improve the platform and respond to support requests.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-2">Who we share it with</h2>
        <p>
          Paystack, to process payments and payouts. Supabase, our database and hosting provider, which
          stores your account and marketplace data. We don't sell your information to anyone.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">Your rights</h2>
        <p>
          Under the Nigeria Data Protection Act, you can ask to see the personal data we hold about you,
          correct it, or request that your account be deleted. Contact us through the <a href="/contact-us">Contact Us</a> page
          to make a request.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">Changes to this policy</h2>
        <p>
          We'll update this page if how we handle your data changes, and update the date at the top.
        </p>

        <p className="text-sm text-gray-500 mt-10 border-t pt-4">
          This is a starting template, not a substitute for legal advice. Have it reviewed by a lawyer
          familiar with the Nigeria Data Protection Act before you rely on it in production.
        </p>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;

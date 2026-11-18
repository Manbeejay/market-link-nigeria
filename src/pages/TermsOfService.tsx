import Header from "@/components/Header";
import Footer from "@/components/Footer";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full prose prose-gray">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-gray-500 text-sm mb-8">Last updated: 2nd October, 2026</p>

        <p>
          These terms govern your use of MarketLink Nigeria, operated by MarketLink Nigeria Enterprises.
          By creating an account, you agree to them.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">Membership</h2>
        <p>
          Access to the marketplace requires a yearly membership fee, currently ₦5,000, paid through
          Paystack. Membership runs for 12 months from the day you pay and must be renewed to keep access.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">The marketplace</h2>
        <p>
          MarketLink Nigeria charges a 5% platform commission on each order. The commission is deducted automatically when the buyer pays, as Paystack splits the payment between the farmer and MarketLink Nigeria. Paystack sends the farmer’s share to the farmer’s bank account on Paystack’s settlement schedule. Paystack’s processing fee is paid from MarketLink Nigeria’s commission and is not charged to the farmer.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">Your responsibilities</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Give accurate information about yourself and, if you're a farmer, about what you're selling.</li>
          <li>Honor orders you accept, and pay for orders you place.</li>
          <li>Do not use the platform for anything illegal or to defraud another user.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-2">Payments</h2>
        <p>
          Paystack processes all payments. We do not store your card details. Commission rates and
          membership fees may change; we'll post any change here before it takes effect.
        </p>

        <h2 id="quality-guarantee" className="text-xl font-semibold mt-8 mb-2">Quality and disputes</h2>
        <p>
          MarketLink Nigeria does not inspect produce or guarantee its quality before a sale. What we provide
          is a clear process around every order: a farmer accepts an order before payment is taken, marks it
          delivered once the produce is handed over, and the buyer confirms receipt to close it out. If
          something does not match what was described, or doesn't arrive, raise it with the farmer directly
          through the listing's chat first, and contact us if that doesn't resolve it.
        </p>

        <h2 id="delivery-options" className="text-xl font-semibold mt-8 mb-2">Delivery</h2>
        <p>
          MarketLink Nigeria does not arrange delivery itself. Each listing states whether the farmer offers
          delivery or pickup only, and the specifics, cost, timing, and how far they'll travel are worked out
          directly between buyer and farmer, usually through the chat on the listing. Confirm delivery details
          with the farmer before you pay.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">Problems with orders</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>If there is a problem with an order, the buyer and farmer must first try to resolve it through the order chat.</li>
          <li>If it is not resolved, the buyer may use “Report a problem” on the order within [48 hours after the order is marked delivered, or within 7 days of payment if it is never marked delivered].</li>
          <li>The order is then marked as disputed, and both parties are notified. MarketLink Nigeria will ask each party for relevant information, such as photos and messages, and aims to respond within [3] business days.</li>
          <li>The outcome may be completion of the order, a full or partial refund, or closure of the order without a refund.</li>
          <li>Paystack sends the farmer’s share to the farmer when the buyer pays, and MarketLink Nigeria does not hold it. Where a refund is agreed or decided, [the farmer agrees to return the refunded amount, and MarketLink Nigeria will return its commission on that amount].</li>
          <li>MarketLink Nigeria is a platform and is not a party to the sale. It decides disputes in good faith on the information provided. Nothing here limits any rights the parties have under Nigerian law.</li>
        </ul>

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

      </main>
      <Footer />
    </div>
  );
};

export default TermsOfService;

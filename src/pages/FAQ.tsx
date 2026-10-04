import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const faqs: { question: string; answer: string }[] = [
  {
    question: "What does MarketLink Nigeria do?",
    answer:
      "It connects Nigerian farmers directly with buyers. Farmers list what they have for sale, buyers browse and order, and the two of you agree on delivery or pickup between yourselves.",
  },
  {
    question: "How much does membership cost?",
    answer:
      "₦5,000 a year, paid through Paystack. It covers browsing listings, messaging farmers or buyers, and placing or accepting orders, for 12 months from the day you pay.",
  },
  {
    question: "I'm a farmer. How do I start selling?",
    answer:
      "Sign up as a farmer (or both farmer and buyer), pay the membership fee, then go to My Listings to add a product. Fill in the crop, price, quantity and a few words on quality or delivery, and the listing writer can turn that into a clear description for you before you publish it.",
  },
  {
    question: "How do I get paid?",
    answer:
      "Add your bank details under My Wallet. Once that's done, a buyer's payment splits automatically when they pay: your share goes to your account, and MarketLink's commission is deducted at the same time. Until bank details are added, that split can't happen.",
  },
  {
    question: "What's the commission?",
    answer: "5% of each completed order, taken automatically at the point of payment.",
  },
  {
    question: "I'm a buyer. How do I order?",
    answer:
      "Browse Products, open a listing, and send a request with the quantity you want. The farmer accepts or declines it; if they accept, you pay through the Orders page and the order moves to paid.",
  },
  {
    question: "Does MarketLink guarantee the quality of what I'm buying?",
    answer:
      "No, we don't inspect produce ourselves. What we provide is the order process itself, request, accept, pay, deliver, confirm, so there's a clear record of what was agreed. See the Terms of Service for how that works if something doesn't match what was described.",
  },
  {
    question: "Who handles delivery?",
    answer:
      "Farmers and buyers arrange it between themselves, usually through the chat on the listing. Each listing states whether the farmer offers delivery or pickup only, confirm the details with them before you pay.",
  },
  {
    question: "Can I ask a question about a specific listing before I order?",
    answer:
      "Yes. Every listing has a box where you can ask about it directly, answered from what the farmer actually stated. For anything beyond that, like negotiating or checking current availability, use Message Farmer to chat with them directly.",
  },
  {
    question: "How do I cancel an order?",
    answer:
      "From the Orders page. Buyers can cancel a request before paying; once an order is paid, speak to the farmer directly through the order's chat.",
  },
  {
    question: "Can I be both a farmer and a buyer?",
    answer:
      'Yes, choose "Both" when you sign up. Contact us if you need this changed on an existing account.',
  },
];

const FAQ = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <h1 className="text-3xl font-bold mb-2">Frequently Asked Questions</h1>
        <p className="text-gray-600 mb-8">
          Common questions from farmers and buyers using MarketLink Nigeria.
        </p>
        <Accordion type="single" collapsible className="bg-white rounded-lg border px-6">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
              <AccordionContent className="text-gray-600">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </main>
      <Footer />
    </div>
  );
};

export default FAQ;

import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BankAccountForm from "@/components/wallet/BankAccountForm";
import WalletInsights from "@/components/wallet/WalletInsights";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet as WalletIcon, ArrowDownCircle, Receipt, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/nigeria";

interface TransactionRow {
  id: string;
  type: string;
  amount: number;
  provider: string | null;
  provider_reference: string | null;
  status: string;
  created_at: string;
}

interface PayoutRow {
  id: string;
  amount: number;
  status: string;
  requested_at: string;
  processed_at: string | null;
}

interface WalletOrder {
  id: string;
  buyer_id: string;
  farmer_id: string;
  status: string;
  total_amount: number | null;
  commission_amount: number | null;
  farmer_payout_amount: number | null;
}

interface SummaryCard {
  label: string;
  display: string;
  icon: typeof Receipt;
}

const PAID_STATUSES = ["paid", "delivered", "completed"];
const BUYER_PAID_STATUSES = ["paid", "delivered", "completed", "disputed"];

const statusStyles: Record<string, string> = {
  success: "bg-green-100 text-green-800",
  successful: "bg-green-100 text-green-800",
  paid: "bg-green-100 text-green-800",
  processed: "bg-green-100 text-green-800",
  pending: "bg-amber-100 text-amber-800",
  requested: "bg-amber-100 text-amber-800",
  failed: "bg-red-100 text-red-800",
};

const typeLabels: Record<string, string> = {
  order_payment: "Order payment",
  commission: "Platform commission (deducted from your sale)",
  subscription: "Membership fee",
  payout: "Payout",
};

const sum = (rows: WalletOrder[], key: keyof WalletOrder) =>
  rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);

const Wallet = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [orders, setOrders] = useState<WalletOrder[]>([]);
  const [listingCount, setListingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: tx }, { data: po }, { data: od }, { count }] = await Promise.all([
      supabase
        .from("transactions")
        .select("id, type, amount, provider, provider_reference, status, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("payouts")
        .select("id, amount, status, requested_at, processed_at")
        .order("requested_at", { ascending: false }),
      supabase
        .from("orders")
        .select("id, buyer_id, farmer_id, status, total_amount, commission_amount, farmer_payout_amount")
        .or(`farmer_id.eq.${user.id},buyer_id.eq.${user.id}`),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("farmer_id", user.id),
    ]);
    setTransactions((tx ?? []) as TransactionRow[]);
    setPayouts((po ?? []) as PayoutRow[]);
    setOrders((od ?? []) as WalletOrder[]);
    setListingCount(count ?? 0);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const sellerOrders = orders.filter((o) => o.farmer_id === user?.id);
  const buyerOrders = orders.filter((o) => o.buyer_id === user?.id);

  const isSeller = sellerOrders.length > 0 || listingCount > 0;
  const isBuyer = buyerOrders.length > 0;
  const showSeller = isSeller || !isBuyer;
  const showBuyer = isBuyer;

  const earningOrders = sellerOrders.filter((o) => PAID_STATUSES.includes(o.status));
  const sellerCards: SummaryCard[] = [
    {
      label: "Total earned from orders",
      display: formatNaira(sum(earningOrders, "farmer_payout_amount")),
      icon: Receipt,
    },
    {
      label: "Platform commission deducted",
      display: formatNaira(sum(earningOrders, "commission_amount")),
      icon: Receipt,
    },
    {
      label: "Completed orders",
      display: String(earningOrders.filter((o) => o.status === "completed").length),
      icon: ArrowDownCircle,
    },
  ];

  const paidPurchases = buyerOrders.filter((o) => BUYER_PAID_STATUSES.includes(o.status));
  const buyerCards: SummaryCard[] = [
    {
      label: "Total paid for orders",
      display: formatNaira(sum(paidPurchases, "total_amount")),
      icon: Receipt,
    },
    {
      label: "Orders completed",
      display: String(buyerOrders.filter((o) => o.status === "completed").length),
      icon: ArrowDownCircle,
    },
    {
      label: "Orders in progress",
      display: String(buyerOrders.filter((o) => ["paid", "delivered"].includes(o.status)).length),
      icon: Receipt,
    },
  ];

  const renderCards = (cards: SummaryCard[], heading?: string) => (
    <div className="mb-8">
      {heading && (
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">{heading}</h2>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((item) => (
          <Card key={item.label}>
            <CardContent className="p-5">
              <item.icon className="h-5 w-5 text-green-600 mb-3" />
              <p className="text-sm text-gray-600">{item.label}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{loading ? "—" : item.display}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const both = showSeller && showBuyer;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center gap-3 mb-2">
          <WalletIcon className="h-7 w-7 text-green-600" />
          <h1 className="text-3xl font-bold text-gray-900">My Wallet</h1>
        </div>
        <p className="text-gray-600 mb-4">
          {showSeller
            ? "Manage the bank account that receives your earnings and review your payment history."
            : "Review the payments you have made and the progress of your orders."}
        </p>
        <Button asChild className="mb-8">
          <Link to="/wallet/assistant">
            <Sprout className="mr-2 h-4 w-4" />
            Ask the Wallet Assistant
          </Link>
        </Button>

        {showSeller && renderCards(sellerCards, both ? "As a farmer" : undefined)}
        {showBuyer && renderCards(buyerCards, both ? "As a buyer" : undefined)}

        <p className="text-sm text-gray-500 -mt-2 mb-10">
          {showSeller
            ? "Your share is sent to your bank directly by Paystack, on its settlement schedule. Check your bank statement or Paystack for settlement."
            : "Order payments are made securely through Paystack. Your payment history is listed below."}
        </p>

        {showSeller && (
          <div className="mb-10">
            <WalletInsights mode="farmer" />
          </div>
        )}
        {showBuyer && (
          <div className="mb-10">
            <WalletInsights mode="buyer" />
          </div>
        )}

        {showSeller && (
          <div className="mb-10">
            <BankAccountForm onSaved={load} />
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Payment history</CardTitle>
            <CardDescription>
              {showSeller
                ? "Every payment received and every payout to your bank."
                : "Every payment you have made on MarketLink Nigeria."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-40 w-full rounded-lg" />
            ) : (
              <Tabs defaultValue="transactions">
                <TabsList className="mb-4">
                  <TabsTrigger value="transactions">Payments ({transactions.length})</TabsTrigger>
                  {showSeller && <TabsTrigger value="payouts">Payouts ({payouts.length})</TabsTrigger>}
                </TabsList>

                <TabsContent value="transactions" className="space-y-3">
                  {transactions.length === 0 ? (
                    <p className="text-sm text-gray-500 py-6 text-center">
                      {showSeller
                        ? "No payments yet. Your earnings will show here once a buyer pays."
                        : "No payments yet. Your payments will show here once you pay for an order."}
                    </p>
                  ) : (
                    transactions.map((t) => (
                      <div
                        key={t.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-white p-4"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{typeLabels[t.type] ?? t.type}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(t.created_at).toLocaleString()}
                            {t.provider ? ` · ${t.provider}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={statusStyles[t.status] ?? ""}>{t.status}</Badge>
                          <span
                            className={`font-semibold ${
                              t.type === "commission" ? "text-gray-600" : "text-green-700"
                            }`}
                          >
                            {t.type === "commission" ? "−" : ""}
                            {formatNaira(Number(t.amount))}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                {showSeller && (
                  <TabsContent value="payouts" className="space-y-3">
                    {payouts.length === 0 ? (
                      <p className="text-sm text-gray-500 py-6 text-center">
                        No payouts yet. Paystack settles your share to your saved bank account.
                      </p>
                    ) : (
                      payouts.map((p) => (
                        <div
                          key={p.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-white p-4"
                        >
                          <div>
                            <p className="font-medium text-gray-900">Payout to your bank</p>
                            <p className="text-sm text-gray-500">
                              Requested {new Date(p.requested_at).toLocaleDateString()}
                              {p.processed_at
                                ? ` · Paid ${new Date(p.processed_at).toLocaleDateString()}`
                                : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={statusStyles[p.status] ?? ""}>{p.status}</Badge>
                            <span className="font-semibold text-green-700">
                              {formatNaira(Number(p.amount))}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>
                )}
              </Tabs>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Wallet;

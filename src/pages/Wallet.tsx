import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BankAccountForm from "@/components/wallet/BankAccountForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet as WalletIcon, ArrowDownCircle, Receipt, Sprout } from "lucide-react";
import { Link } from "react-router-dom";
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
  commission: "Platform commission",
  subscription: "Membership fee",
  payout: "Payout",
};

const Wallet = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: tx }, { data: po }] = await Promise.all([
      supabase
        .from("transactions")
        .select("id, type, amount, provider, provider_reference, status, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("payouts")
        .select("id, amount, status, requested_at, processed_at")
        .order("requested_at", { ascending: false }),
    ]);
    setTransactions((tx ?? []) as TransactionRow[]);
    setPayouts((po ?? []) as PayoutRow[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const earned = transactions
    .filter((t) => t.type === "order_payment" && ["success", "successful", "paid"].includes(t.status))
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const commission = transactions
    .filter((t) => t.type === "commission")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const paidOut = payouts
    .filter((p) => ["processed", "paid", "successful"].includes(p.status))
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const summary = [
    { label: "Total earned from orders", value: earned, icon: Receipt },
    { label: "Platform commission deducted", value: commission, icon: Receipt },
    { label: "Paid out to your bank", value: paidOut, icon: ArrowDownCircle },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center gap-3 mb-2">
          <WalletIcon className="h-7 w-7 text-green-600" />
          <h1 className="text-3xl font-bold text-gray-900">My Wallet</h1>
        </div>
        <p className="text-gray-600 mb-4">
          Manage the bank account that receives your earnings and review your payment history.
        </p>
        <Button asChild className="mb-8">
          <Link to="/wallet/assistant">
            <Sprout className="mr-2 h-4 w-4" />
            Ask the Wallet Assistant
          </Link>
        </Button>

        <div className="grid gap-4 sm:grid-cols-3 mb-10">
          {summary.map((item) => (
            <Card key={item.label}>
              <CardContent className="p-5">
                <item.icon className="h-5 w-5 text-green-600 mb-3" />
                <p className="text-sm text-gray-600">{item.label}</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {loading ? "—" : formatNaira(item.value)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mb-10">
          <BankAccountForm onSaved={load} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payment history</CardTitle>
            <CardDescription>Every payment received and every payout to your bank.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-40 w-full rounded-lg" />
            ) : (
              <Tabs defaultValue="transactions">
                <TabsList className="mb-4">
                  <TabsTrigger value="transactions">Payments ({transactions.length})</TabsTrigger>
                  <TabsTrigger value="payouts">Payouts ({payouts.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="transactions" className="space-y-3">
                  {transactions.length === 0 ? (
                    <p className="text-sm text-gray-500 py-6 text-center">
                      No payments yet. Your earnings will show here once a buyer pays.
                    </p>
                  ) : (
                    transactions.map((t) => (
                      <div
                        key={t.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-white p-4"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {typeLabels[t.type] ?? t.type}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(t.created_at).toLocaleString()}
                            {t.provider ? ` · ${t.provider}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={statusStyles[t.status] ?? ""}>{t.status}</Badge>
                          <span className="font-semibold text-green-700">
                            {formatNaira(Number(t.amount))}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

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

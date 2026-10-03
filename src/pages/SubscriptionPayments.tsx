import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Receipt, CalendarCheck, CheckCircle2 } from "lucide-react";
import { formatNaira } from "@/lib/nigeria";

interface PaymentRow {
  id: string;
  amount: number;
  provider: string | null;
  provider_reference: string | null;
  status: string;
  created_at: string;
}

interface SubscriptionRow {
  id: string;
  status: string;
  amount: number | null;
  payment_reference: string | null;
  started_at: string | null;
  expires_at: string | null;
}

const statusStyles: Record<string, string> = {
  success: "bg-green-100 text-green-800",
  successful: "bg-green-100 text-green-800",
  pending: "bg-amber-100 text-amber-800",
  failed: "bg-red-100 text-red-800",
  abandoned: "bg-red-100 text-red-800",
};

const SubscriptionPayments = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [paymentsRes, subscriptionsRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("id, amount, provider, provider_reference, status, created_at")
          .eq("type", "subscription")
          .order("created_at", { ascending: false }),
        supabase
          .from("subscriptions")
          .select("id, status, amount, payment_reference, started_at, expires_at")
          .order("created_at", { ascending: false }),
      ]);
      setPayments((paymentsRes.data ?? []) as PaymentRow[]);
      setSubscriptions((subscriptionsRes.data ?? []) as SubscriptionRow[]);
      setLoading(false);
    })();
  }, [user]);

  const periodByReference = new Map<string, SubscriptionRow>();
  for (const sub of subscriptions) {
    if (sub.payment_reference) periodByReference.set(sub.payment_reference, sub);
  }

  const activeSub = subscriptions.find((s) => s.status === "active");
  const confirmedCount = payments.filter((p) => ["success", "successful"].includes(p.status)).length;
  const totalPaid = payments
    .filter((p) => ["success", "successful"].includes(p.status))
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const formatDate = (value: string) => new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const copyReference = async (reference: string) => {
    try {
      await navigator.clipboard.writeText(reference);
    } catch {
      // clipboard not available — ignore
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center gap-3 mb-2">
          <Receipt className="h-7 w-7 text-green-600" />
          <h1 className="text-3xl font-bold text-gray-900">Subscription Payments</h1>
        </div>
        <p className="text-gray-600 mb-8">
          Every membership payment you've made, with its Paystack reference and confirmation status.
        </p>

        <div className="grid gap-4 sm:grid-cols-3 mb-10">
          <Card>
            <CardContent className="p-5">
              <CheckCircle2 className="h-5 w-5 text-green-600 mb-3" />
              <p className="text-sm text-gray-600">Confirmed payments</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {loading ? "—" : confirmedCount}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <Receipt className="h-5 w-5 text-green-600 mb-3" />
              <p className="text-sm text-gray-600">Total paid for membership</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {loading ? "—" : formatNaira(totalPaid)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <CalendarCheck className="h-5 w-5 text-green-600 mb-3" />
              <p className="text-sm text-gray-600">Membership active until</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {loading ? "—" : activeSub?.expires_at ? formatDate(activeSub.expires_at) : "Not active"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payment history</CardTitle>
            <CardDescription>Newest first. The reference matches what Paystack shows in your dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-40 w-full rounded-lg" />
            ) : payments.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-500 mb-4">
                  No membership payments yet. Your payments will show here once you subscribe.
                </p>
                <Button asChild>
                  <Link to="/subscribe">View subscription plans</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((p) => {
                  const sub = p.provider_reference ? periodByReference.get(p.provider_reference) : undefined;
                  const period =
                    sub?.started_at && sub?.expires_at
                      ? `${formatDate(sub.started_at)} – ${formatDate(sub.expires_at)}`
                      : null;
                  return (
                    <div
                      key={p.id}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-md border bg-white p-4"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-gray-900">Membership fee (1 year)</p>
                          <Badge className={statusStyles[p.status] ?? ""}>
                            {["success", "successful"].includes(p.status) ? "Confirmed" : p.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Paid {new Date(p.created_at).toLocaleString()}
                          {p.provider ? ` · ${p.provider}` : ""}
                        </p>
                        {period && (
                          <p className="text-sm text-gray-500">
                            Covers {period}
                          </p>
                        )}
                        {p.provider_reference && (
                          <button
                            type="button"
                            onClick={() => copyReference(p.provider_reference!)}
                            title="Copy reference"
                            className="mt-2 text-xs font-mono text-gray-600 bg-gray-100 hover:bg-gray-200 rounded px-2 py-1 break-all text-left"
                          >
                            {p.provider_reference}
                          </button>
                        )}
                      </div>
                      <span className="font-semibold text-green-700 whitespace-nowrap">
                        {formatNaira(Number(p.amount))}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default SubscriptionPayments;

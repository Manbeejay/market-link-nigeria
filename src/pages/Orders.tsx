import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList } from "lucide-react";
import { formatNaira } from "@/lib/nigeria";

interface OrderRow {
  id: string;
  buyer_id: string;
  farmer_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  commission_amount: number | null;
  status: string;
  created_at: string;
  products: { id: string; title: string; unit: string } | null;
  buyer: { full_name: string | null } | null;
  farmer: { full_name: string | null } | null;
}

const statusStyles: Record<string, string> = {
  requested: "bg-amber-100 text-amber-800",
  accepted: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  completed: "bg-green-600 text-white",
  cancelled: "bg-gray-200 text-gray-700",
  disputed: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  requested: "Awaiting farmer",
  accepted: "Accepted – payment due",
  paid: "Paid",
  completed: "Completed",
  cancelled: "Declined / cancelled",
  disputed: "Disputed",
};

const SELECT =
  "id, buyer_id, farmer_id, quantity, unit_price, total_amount, commission_amount, status, created_at, products(id, title, unit), buyer:profiles!orders_buyer_id_fkey(full_name), farmer:profiles!orders_farmer_id_fkey(full_name)";

const Orders = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select(SELECT)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Could not load orders", description: error.message, variant: "destructive" });
    } else {
      setOrders((data ?? []) as unknown as OrderRow[]);
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (order: OrderRow, status: string) => {
    setBusyId(order.id);
    const { error } = await supabase.from("orders").update({ status }).eq("id", order.id);
    setBusyId(null);
    if (error) {
      toast({ title: "Could not update order", description: error.message, variant: "destructive" });
    } else {
      toast({ title: status === "accepted" ? "Order accepted" : "Order declined" });
      load();
    }
  };

  const payForOrder = async (order: OrderRow) => {
    setBusyId(order.id);
    const { data, error } = await supabase.functions.invoke("create-order-payment", {
      body: { order_id: order.id, callback_url: `${window.location.origin}/orders` },
    });
    setBusyId(null);
    if (error || data?.error) {
      toast({
        title: "Payment could not be started",
        description: data?.error ?? error?.message,
        variant: "destructive",
      });
      return;
    }
    if (data?.authorization_url) window.location.href = data.authorization_url;
  };

  const purchases = orders.filter((o) => o.buyer_id === user?.id);
  const sales = orders.filter((o) => o.farmer_id === user?.id);

  const renderCard = (order: OrderRow, role: "buyer" | "farmer") => (
    <Card key={order.id}>
      <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">
              {order.products?.title ?? "Product removed"}
            </h3>
            <Badge className={statusStyles[order.status] ?? ""}>
              {statusLabels[order.status] ?? order.status}
            </Badge>
          </div>
          <p className="text-sm text-gray-600">
            {Number(order.quantity)} {order.products?.unit ?? "unit"} ×{" "}
            {formatNaira(Number(order.unit_price))} ={" "}
            <span className="font-semibold text-green-700">
              {formatNaira(Number(order.total_amount))}
            </span>
          </p>
          <p className="text-sm text-gray-500">
            {role === "buyer"
              ? `Farmer: ${order.farmer?.full_name ?? "Verified farmer"}`
              : `Buyer: ${order.buyer?.full_name ?? "Buyer"}`}{" "}
            · {new Date(order.created_at).toLocaleDateString()}
          </p>
          {role === "farmer" && order.status === "paid" && order.commission_amount != null && (
            <p className="text-sm text-gray-500">
              Platform commission: {formatNaira(Number(order.commission_amount))}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {role === "farmer" && order.status === "requested" && (
            <>
              <Button
                className="bg-green-600 hover:bg-green-700"
                disabled={busyId === order.id}
                onClick={() => setStatus(order, "accepted")}
              >
                Accept
              </Button>
              <Button
                variant="outline"
                className="text-red-600 hover:text-red-700"
                disabled={busyId === order.id}
                onClick={() => setStatus(order, "cancelled")}
              >
                Decline
              </Button>
            </>
          )}
          {role === "buyer" && order.status === "accepted" && (
            <Button
              className="bg-green-600 hover:bg-green-700"
              disabled={busyId === order.id}
              onClick={() => payForOrder(order)}
            >
              {busyId === order.id ? "Starting payment..." : "Pay now"}
            </Button>
          )}
          {role === "buyer" && order.status === "requested" && (
            <Button
              variant="outline"
              disabled={busyId === order.id}
              onClick={() => setStatus(order, "cancelled")}
            >
              Cancel request
            </Button>
          )}
          {role === "farmer" && order.status === "paid" && (
            <Button
              variant="outline"
              disabled={busyId === order.id}
              onClick={() => setStatus(order, "completed")}
            >
              Mark delivered
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const empty = (text: string) => (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <ClipboardList className="h-10 w-10 text-green-600" />
        <p className="text-gray-600 max-w-sm">{text}</p>
        <Link to="/browse" className="text-green-700 underline">
          Browse products
        </Link>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
        <p className="text-gray-600 mt-1 mb-8">
          Track what you are buying and respond to requests on your listings.
        </p>

        {loading ? (
          <Skeleton className="h-64 w-full rounded-lg" />
        ) : (
          <Tabs defaultValue="purchases">
            <TabsList className="mb-6">
              <TabsTrigger value="purchases">I am buying ({purchases.length})</TabsTrigger>
              <TabsTrigger value="sales">Requests on my listings ({sales.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="purchases" className="space-y-4">
              {purchases.length === 0
                ? empty("You have not requested any orders yet.")
                : purchases.map((o) => renderCard(o, "buyer"))}
            </TabsContent>
            <TabsContent value="sales" className="space-y-4">
              {sales.length === 0
                ? empty("No buyer has requested your produce yet.")
                : sales.map((o) => renderCard(o, "farmer"))}
            </TabsContent>
          </Tabs>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Orders;

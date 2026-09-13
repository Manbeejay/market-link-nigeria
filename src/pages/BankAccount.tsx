import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Landmark, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface Bank {
  name: string;
  code: string;
}

const BankAccount = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [banks, setBanks] = useState<Bank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [savedAccount, setSavedAccount] = useState<{
    bank_name: string;
    account_number: string;
    account_name: string;
  } | null>(null);
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const callFunction = async (payload: Record<string, unknown>) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-bank-account`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );
    return res.json();
  };

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoadingBanks(true);
      try {
        const data = await callFunction({ action: "list_banks" });
        if (data?.banks) setBanks(data.banks);
        else if (data?.error) toast.error(data.error);
      } catch {
        toast.error("Could not load the bank list. Please refresh.");
      } finally {
        setLoadingBanks(false);
      }
    };
    const loadExisting = async () => {
      setLoadingExisting(true);
      const { data } = await supabase
        .from("bank_accounts")
        .select("bank_name, account_number, account_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setSavedAccount(data);
      setLoadingExisting(false);
    };
    load();
    loadExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleResolve = async () => {
    if (!bankCode || accountNumber.length !== 10) {
      toast.error("Choose your bank and enter a 10-digit account number.");
      return;
    }
    setResolving(true);
    setAccountName("");
    try {
      const data = await callFunction({
        action: "resolve_account",
        bank_code: bankCode,
        account_number: accountNumber,
      });
      if (data?.account_name) {
        setAccountName(data.account_name);
      } else {
        toast.error(data?.error ?? "Could not verify that account number.");
      }
    } catch {
      toast.error("Could not verify that account number.");
    } finally {
      setResolving(false);
    }
  };

  const handleSave = async () => {
    if (!accountName) {
      toast.error("Please verify the account number first.");
      return;
    }
    setSaving(true);
    try {
      const data = await callFunction({
        action: "save_account",
        bank_code: bankCode,
        account_number: accountNumber,
      });
      if (data?.account_name) {
        setSavedAccount({
          bank_name: data.bank_name,
          account_number: data.account_number,
          account_name: data.account_name,
        });
        setBankCode("");
        setAccountNumber("");
        setAccountName("");
        toast.success("Your payout account has been saved.");
      } else {
        toast.error(data?.error ?? "Could not save your bank details.");
      }
    } catch {
      toast.error("Could not save your bank details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-6">
          <Landmark className="h-7 w-7 text-green-600" />
          <h1 className="text-2xl font-bold text-gray-900">Payout Bank Account</h1>
        </div>

        {savedAccount && !loadingExisting && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800 text-lg">
                <CheckCircle2 className="h-5 w-5" />
                Saved payout account
              </CardTitle>
              <CardDescription>
                Payments for your orders are settled to this account automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-green-900 space-y-1">
              <p><span className="font-medium">Bank:</span> {savedAccount.bank_name}</p>
              <p><span className="font-medium">Account number:</span> {savedAccount.account_number}</p>
              <p><span className="font-medium">Account name:</span> {savedAccount.account_name}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{savedAccount ? "Update bank details" : "Add your bank details"}</CardTitle>
            <CardDescription>
              This is where your earnings are paid. The platform's 5% commission is deducted
              automatically on each paid order.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="bank">Bank</Label>
              <Select value={bankCode} onValueChange={setBankCode} disabled={loadingBanks}>
                <SelectTrigger id="bank">
                  <SelectValue placeholder={loadingBanks ? "Loading banks..." : "Select your bank"} />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((bank) => (
                    <SelectItem key={bank.code} value={bank.code}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account-number">Account number</Label>
              <div className="flex gap-2">
                <Input
                  id="account-number"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit account number"
                  value={accountNumber}
                  onChange={(e) => {
                    setAccountNumber(e.target.value.replace(/\D/g, ""));
                    setAccountName("");
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResolve}
                  disabled={resolving || !bankCode || accountNumber.length !== 10}
                >
                  {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                </Button>
              </div>
            </div>

            {accountName && (
              <Alert className="border-green-200 bg-green-50">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Account verified: <span className="font-semibold">{accountName}</span>
                </AlertDescription>
              </Alert>
            )}

            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              onClick={handleSave}
              disabled={saving || !accountName}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {savedAccount ? "Update payout account" : "Save payout account"}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default BankAccount;

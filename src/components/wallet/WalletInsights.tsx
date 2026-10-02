import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageResponse } from "@/components/ai-elements/message";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Sparkles, Square } from "lucide-react";

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wallet-insights`;
const iso = (d: Date) => d.toISOString().slice(0, 10);

const presets = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

const WalletInsights = () => {
  const today = new Date();
  const [from, setFrom] = useState(iso(new Date(Date.now() - 30 * 864e5)));
  const [to, setTo] = useState(iso(today));
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const run = async () => {
    setError("");
    setText("");
    if (from > to) {
      setError("The start date must be before the end date.");
      return;
    }
    setBusy(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch(ENDPOINT, {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${data.session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ from, to }),
      });
      if (!res.ok || !res.body) {
        const msg = await res.json().catch(() => null);
        throw new Error(msg?.error ?? "Could not explain your wallet right now.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setText(acc);
      }
      if (!acc.trim()) setError("The explanation couldn't be produced. Please try again later.");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" /> Explain my earnings
        </CardTitle>
        <CardDescription>
          Pick a period and get a plain-language summary of your earnings and payout trends.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <Button
              key={p.days}
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setFrom(iso(new Date(Date.now() - p.days * 864e5)));
                setTo(iso(new Date()));
              }}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="ins-from">From</Label>
            <Input id="ins-from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} disabled={busy} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ins-to">To</Label>
            <Input id="ins-to" type="date" value={to} min={from} max={iso(today)} onChange={(e) => setTo(e.target.value)} disabled={busy} />
          </div>
          {busy ? (
            <Button variant="outline" onClick={() => abortRef.current?.abort()}>
              <Square className="mr-2 h-4 w-4" /> Stop
            </Button>
          ) : (
            <Button onClick={run}>
              <Sparkles className="mr-2 h-4 w-4" /> Explain
            </Button>
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {busy && !text && <Shimmer>Looking through your records...</Shimmer>}
        {text && (
          <div className="rounded-md border bg-muted/30 p-4 text-sm">
            <MessageResponse>{text}</MessageResponse>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WalletInsights;

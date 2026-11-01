import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, MessageSquare, PenLine, Send, Sparkles } from "lucide-react";

interface InquiryRow {
  id: string;
  buyer_id: string;
  farmer_id: string;
  status: string;
  updated_at: string;
  inquiry_summary: string | null;
  inquiry_summary_msg_count: number | null;
  product_id: string;
  products: { title: string } | null;
  buyer: { full_name: string | null } | null;
  farmer: { full_name: string | null } | null;
}
interface Msg { id: string; inquiry_id: string; sender_id: string; content: string; created_at: string }

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  negotiating: "Negotiating",
  closed: "Closed",
};
const STATUS_VARIANT: Record<string, "secondary" | "default" | "outline"> = {
  open: "secondary",
  negotiating: "default",
  closed: "outline",
};
const STATUS_OPTIONS = ["open", "negotiating", "closed"] as const;

const StatusBadge = ({ status }: { status: string }) => (
  <Badge variant={STATUS_VARIANT[status] ?? "secondary"} className="text-[10px] uppercase tracking-wide">
    {STATUS_LABEL[status] ?? status}
  </Badge>
);

const Thread = ({ inquiry, onSent, onStatus }: { inquiry: InquiryRow; onSent: () => void; onStatus: (id: string, status: string) => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [summary, setSummary] = useState<string | null>(inquiry.inquiry_summary);
  const [summarizing, setSummarizing] = useState(false);
  const bottom = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    supabase
      .from("inquiry_messages")
      .select("id, inquiry_id, sender_id, content, created_at")
      .eq("inquiry_id", inquiry.id)
      .order("created_at")
      .then(({ data, error }) => {
        if (error) toast({ title: "Could not load messages", description: error.message, variant: "destructive" });
        setMsgs((data ?? []) as Msg[]);
      });
    const ch = supabase
      .channel(`inquiry-${inquiry.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "inquiry_messages", filter: `inquiry_id=eq.${inquiry.id}` }, (p) => {
        const row = p.new as Msg;
        setMsgs((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
      })
      .subscribe();
    inputRef.current?.focus();
    return () => { supabase.removeChannel(ch); };
  }, [inquiry.id, toast]);

  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [msgs]);

  const send = async () => {
    const content = text.trim();
    if (!content || !user) return;
    setSending(true);
    const { data, error } = await supabase
      .from("inquiry_messages")
      .insert({ inquiry_id: inquiry.id, sender_id: user.id, content })
      .select("id, inquiry_id, sender_id, content, created_at")
      .single();
    setSending(false);
    if (error) {
      toast({ title: "Message not sent", description: error.message, variant: "destructive" });
      return;
    }
    setText("");
    setMsgs((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data as Msg]));
    await supabase.from("inquiries").update({ updated_at: new Date().toISOString() }).eq("id", inquiry.id);
    onSent();
    inputRef.current?.focus();
  };

  const changeStatus = async (status: string) => {
    if (status === inquiry.status) return;
    setSavingStatus(true);
    const { error } = await supabase.from("inquiries").update({ status }).eq("id", inquiry.id);
    setSavingStatus(false);
    if (error) {
      toast({ title: "Status not updated", description: error.message, variant: "destructive" });
      return;
    }
    onStatus(inquiry.id, status);
  };

  const [notes, setNotes] = useState("");
  const [drafting, setDrafting] = useState(false);
  const draft = async () => {
    setDrafting(true);
    const previous = text;
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/inquiry-reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${data.session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ inquiryId: inquiry.id, notes }),
      });
      if (!res.ok || !res.body) {
        const msg = await res.json().catch(() => null);
        throw new Error(msg?.error ?? "The reply helper is unavailable right now.");
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
      if (!acc.trim()) {
        setText(previous);
        throw new Error("No reply was produced. Please try again later.");
      }
    } catch (err: any) {
      toast({ title: "Could not draft a reply", description: err?.message, variant: "destructive" });
    } finally {
      setDrafting(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const summarize = async () => {
    setSummarizing(true);
    const previous = summary;
    setSummary("");
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/inquiry-intent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${data.session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ inquiryId: inquiry.id }),
      });
      if (!res.ok || !res.body) {
        const msg = await res.json().catch(() => null);
        throw new Error(msg?.error ?? "The intent summary is unavailable right now.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setSummary(acc);
      }
      if (!acc.trim()) {
        setSummary(previous);
        throw new Error("No summary was produced. Please try again later.");
      }
    } catch (err: any) {
      setSummary(previous);
      toast({ title: "Could not summarize the inquiry", description: err?.message, variant: "destructive" });
    } finally {
      setSummarizing(false);
    }
  };

  const isBuyer = inquiry.buyer_id === user?.id;
  const isFarmer = inquiry.farmer_id === user?.id;
  const other = (isBuyer ? inquiry.farmer?.full_name : inquiry.buyer?.full_name) ?? (isBuyer ? "Farmer" : "Buyer");
  const summaryStale = summary !== null && inquiry.inquiry_summary_msg_count !== null && msgs.length !== inquiry.inquiry_summary_msg_count;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b p-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-semibold text-foreground">{inquiry.products?.title ?? "Listing"}</h2>
          {isFarmer ? (
            <Select value={inquiry.status} onValueChange={changeStatus} disabled={savingStatus}>
              <SelectTrigger className="h-7 w-[150px] text-xs" aria-label="Inquiry status">
                {savingStatus ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <StatusBadge status={inquiry.status} />}
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <StatusBadge status={inquiry.status} />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Chatting with {other} ·{" "}
          <Link to={`/product/${inquiry.product_id}`} className="text-primary underline">View listing</Link>
        </p>
      </div>

      {msgs.length > 0 && (
        <div className="space-y-1.5 border-b bg-muted/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Buyer's intent
            </span>
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={summarize} disabled={summarizing}>
              {summarizing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              {summary ? "Refresh" : "Summarize"}
            </Button>
          </div>
          {summarizing && !summary ? (
            <p className="text-xs text-muted-foreground">Reading the conversation…</p>
          ) : summary ? (
            <>
              <p className="whitespace-pre-wrap text-xs text-foreground">{summary}</p>
              {summaryStale && (
                <p className="text-[10px] text-muted-foreground">Newer messages aren't covered — refresh to update.</p>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">A short summary of what the buyer wants, based on this conversation.</p>
          )}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 bg-muted/30 p-3">
        {msgs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {isBuyer ? "Ask about availability, delivery or arrange your purchase." : "No messages yet."}
          </p>
        ) : (
          msgs.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "border bg-card text-card-foreground"}`}>
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <p className="mt-1 text-[10px] opacity-70">{new Date(m.created_at).toLocaleString()}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottom} />
      </div>

      {!isBuyer && (
        <div className="space-y-2 border-t bg-muted/20 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <PenLine className="h-4 w-4 text-primary" /> Draft a reply with AI
          </div>
          <div className="flex gap-2">
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes, e.g. can deliver to Ikeja for ₦3,000"
              maxLength={1000}
            />
            <Button type="button" variant="outline" onClick={draft} disabled={drafting}>
              {drafting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PenLine className="mr-2 h-4 w-4" />}
              {drafting ? "Drafting..." : "Draft reply"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Uses your listing details and this conversation. Check and edit before sending.</p>
        </div>
      )}

      <form className="flex items-end gap-2 border-t p-3" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <Textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Type a message..."
          maxLength={1000}
          rows={text.length > 80 ? 4 : 1}
          className="min-h-10 resize-none"
          disabled={drafting}
        />
        <Button type="submit" disabled={sending || drafting || !text.trim()} aria-label="Send"><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
};

const Inquiries = () => {
  const { inquiryId } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [list, setList] = useState<InquiryRow[]>([]);

  useEffect(() => { if (!loading && !user) navigate("/auth"); }, [loading, user, navigate]);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("inquiries")
      .select("id, buyer_id, farmer_id, product_id, status, updated_at, inquiry_summary, inquiry_summary_msg_count, products(title), buyer:profiles!inquiries_buyer_id_fkey(full_name), farmer:profiles!inquiries_farmer_id_fkey(full_name)")
      .order("updated_at", { ascending: false });
    if (error) toast({ title: "Could not load inquiries", description: error.message, variant: "destructive" });
    setList((data ?? []) as unknown as InquiryRow[]);
  }, [toast]);

  useEffect(() => { if (user) load(); }, [user, load]);

  const handleStatus = useCallback((id: string, status: string) => {
    setList((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
  }, []);

  const active = list.find((i) => i.id === inquiryId);

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header />
      <div className="mx-auto flex w-full max-w-6xl flex-1 min-h-0 gap-4 px-4 py-4">
        <aside className={`${inquiryId ? "hidden md:flex" : "flex"} w-full md:w-72 shrink-0 flex-col rounded-lg border bg-card`}>
          <h1 className="border-b p-3 font-semibold text-foreground">Inquiries</h1>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {list.length === 0 && (
              <p className="p-3 text-sm text-muted-foreground">
                No inquiries yet. Use "Message farmer" on any listing to start one.
              </p>
            )}
            {list.map((i) => {
              const isBuyer = i.buyer_id === user?.id;
              return (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => navigate(`/inquiries/${i.id}`)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm ${i.id === inquiryId ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium">{i.products?.title ?? "Listing"}</p>
                    <StatusBadge status={i.status} />
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {isBuyer ? `Farmer: ${i.farmer?.full_name ?? "—"}` : `Buyer: ${i.buyer?.full_name ?? "—"}`}
                  </p>
                </button>
              );
            })}
          </div>
        </aside>
        <section className={`${inquiryId ? "flex" : "hidden md:flex"} flex-1 min-h-0 flex-col rounded-lg border bg-card`}>
          {active ? (
            <Thread key={active.id} inquiry={active} onSent={load} onStatus={handleStatus} />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
              <MessageSquare className="h-10 w-10" />
              <p className="text-sm">Select an inquiry to read messages.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Inquiries;

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Send } from "lucide-react";

interface MessageRow {
  id: string;
  order_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface Props {
  orderId: string;
  otherPartyName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const OrderChat = ({ orderId, otherPartyName, open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("messages")
      .select("id, order_id, sender_id, content, created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });
    if (error) {
      toast({ title: "Could not load messages", description: error.message, variant: "destructive" });
    } else {
      setMessages((data ?? []) as MessageRow[]);
    }
    setLoading(false);
  }, [orderId, toast]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const channel = supabase
      .channel(`order-messages-${orderId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `order_id=eq.${orderId}` },
        (payload) => {
          const row = payload.new as MessageRow;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, orderId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const send = async () => {
    const content = text.trim();
    if (!content || !user) return;
    setSending(true);
    const { data, error } = await supabase
      .from("messages")
      .insert({ order_id: orderId, sender_id: user.id, content })
      .select("id, order_id, sender_id, content, created_at")
      .single();
    setSending(false);
    if (error) {
      toast({ title: "Message not sent", description: error.message, variant: "destructive" });
      return;
    }
    setText("");
    if (data) {
      setMessages((prev) =>
        prev.some((m) => m.id === data.id) ? prev : [...prev, data as MessageRow],
      );
    }
    inputRef.current?.focus();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Chat about this order</DialogTitle>
          <DialogDescription>Only you and {otherPartyName} can see these messages.</DialogDescription>
        </DialogHeader>

        <div className="h-72 overflow-y-auto rounded-md border bg-gray-50 p-3 space-y-2">
          {loading ? (
            <p className="text-sm text-gray-500">Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-gray-500">No messages yet. Say hello to get started.</p>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      mine ? "bg-green-600 text-primary-foreground" : "bg-white border text-gray-800"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    <p className={`mt-1 text-[10px] ${mine ? "opacity-80" : "text-gray-500"}`}>
                      {new Date(m.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <Input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            maxLength={1000}
          />
          <Button
            type="submit"
            className="bg-green-600 hover:bg-green-700"
            disabled={sending || !text.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default OrderChat;

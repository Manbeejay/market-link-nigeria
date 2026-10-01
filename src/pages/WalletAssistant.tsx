import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { ArrowLeft, Plus, Sprout, Trash2 } from "lucide-react";

interface ThreadRow {
  id: string;
  title: string;
  updated_at: string;
}

const SUGGESTIONS = [
  "How much have I earned in total?",
  "How much commission was taken from my last order?",
  "Which payouts are still pending?",
  "Summarise my payments this month.",
];

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wallet-assistant`;

const ChatWindow = ({
  threadId,
  initialMessages,
  onFinished,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  onFinished: () => void;
}) => {
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const { messages, sendMessage, status, stop } = useChat({
    id: threadId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: ENDPOINT,
      body: { threadId },
      headers: async () => {
        const { data } = await supabase.auth.getSession();
        return {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${data.session?.access_token ?? ""}`,
        };
      },
    }),
    onError: (err) => {
      let msg = err.message;
      try {
        msg = JSON.parse(err.message).error ?? msg;
      } catch {
        /* plain text */
      }
      toast({ title: "Assistant unavailable", description: msg, variant: "destructive" });
    },
    onFinish: () => {
      onFinished();
      textareaRef.current?.focus();
    },
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    textareaRef.current?.focus();
  }, [threadId]);

  const submit = (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    sendMessage({ text: t });
    setInput("");
    textareaRef.current?.focus();
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Conversation className="flex-1 min-h-0">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<Sprout className="h-14 w-14 text-primary" />}
              title="Ask about your wallet"
              description="Questions about earnings, commission, payments and payouts — answered from your own records."
            >
              <div className="flex flex-col items-center gap-3">
                <Sprout className="h-14 w-14 text-primary" />
                <h3 className="font-semibold text-foreground">Ask about your wallet</h3>
                <p className="text-sm text-muted-foreground max-w-sm text-center">
                  Questions about earnings, commission, payments and payouts — answered from your own records.
                </p>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <Button key={s} variant="outline" size="sm" onClick={() => submit(s)}>
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((m) => (
              <Message key={m.id} from={m.role}>
                <MessageContent>
                  {m.parts.map((part, i) =>
                    part.type === "text" ? (
                      m.role === "assistant" ? (
                        <MessageResponse key={i}>{part.text}</MessageResponse>
                      ) : (
                        <p key={i} className="whitespace-pre-wrap">{part.text}</p>
                      )
                    ) : null,
                  )}
                </MessageContent>
              </Message>
            ))
          )}
          {status === "submitted" && (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>Checking your records...</Shimmer>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t bg-background p-3">
        <PromptInput onSubmit={(msg) => submit(msg.text)}>
          <PromptInputTextarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Why was my last payout smaller than expected?"
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} onStop={stop} disabled={!busy && !input.trim()} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
};

const WalletAssistant = () => {
  const { threadId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [activeMessages, setActiveMessages] = useState<UIMessage[] | null>(null);
  const creating = useRef(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  const loadThreads = useCallback(async () => {
    const { data, error } = await supabase
      .from("wallet_threads")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false });
    if (error) {
      toast({ title: "Could not load conversations", description: error.message, variant: "destructive" });
      return [];
    }
    setThreads(data ?? []);
    return data ?? [];
  }, [toast]);

  const createThread = useCallback(async () => {
    if (!user || creating.current) return;
    creating.current = true;
    const { data, error } = await supabase
      .from("wallet_threads")
      .insert({ user_id: user.id })
      .select("id")
      .single();
    creating.current = false;
    if (error || !data) {
      toast({ title: "Could not start a conversation", description: error?.message, variant: "destructive" });
      return;
    }
    await loadThreads();
    navigate(`/wallet/assistant/${data.id}`);
  }, [user, toast, loadThreads, navigate]);

  // Root: pick latest thread or create one.
  useEffect(() => {
    if (!user) return;
    loadThreads().then((list) => {
      if (threadId) return;
      if (list.length > 0) navigate(`/wallet/assistant/${list[0].id}`, { replace: true });
      else createThread();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, threadId === undefined]);

  // Load active thread messages.
  useEffect(() => {
    if (!user || !threadId) return;
    setActiveMessages(null);
    supabase
      .from("wallet_threads")
      .select("messages")
      .eq("id", threadId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          toast({ title: "Conversation not found", variant: "destructive" });
          navigate("/wallet/assistant", { replace: true });
          return;
        }
        setActiveMessages((data.messages as unknown as UIMessage[]) ?? []);
      });
  }, [user, threadId, toast, navigate]);

  const deleteThread = async (id: string) => {
    const { error } = await supabase.from("wallet_threads").delete().eq("id", id);
    if (error) {
      toast({ title: "Could not delete", description: error.message, variant: "destructive" });
      return;
    }
    const list = await loadThreads();
    if (id === threadId) {
      if (list.length > 0) navigate(`/wallet/assistant/${list[0].id}`);
      else navigate("/wallet/assistant");
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header />
      <div className="mx-auto flex w-full max-w-6xl flex-1 min-h-0 gap-4 px-4 py-4">
        <aside className="hidden w-64 shrink-0 flex-col rounded-lg border bg-card md:flex">
          <div className="flex items-center justify-between border-b p-3">
            <Link to="/wallet" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Wallet
            </Link>
            <Button size="sm" onClick={createThread}>
              <Plus className="mr-1 h-4 w-4" /> New
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {threads.map((t) => (
              <div
                key={t.id}
                className={`group flex items-center gap-1 rounded-md ${
                  t.id === threadId ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                }`}
              >
                <button
                  type="button"
                  onClick={() => navigate(`/wallet/assistant/${t.id}`)}
                  className="flex-1 truncate px-3 py-2 text-left text-sm"
                >
                  {t.title}
                </button>
                <button
                  type="button"
                  aria-label="Delete conversation"
                  onClick={() => deleteThread(t.id)}
                  className="mr-1 rounded p-1 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </aside>

        <section className="flex flex-1 min-h-0 flex-col rounded-lg border bg-card">
          <div className="flex items-center gap-3 border-b p-3">
            <Sprout className="h-7 w-7 text-primary" />
            <div className="flex-1">
              <h1 className="font-semibold text-foreground">Wallet Assistant</h1>
              <p className="text-xs text-muted-foreground">AI-powered answers from your payment records</p>
            </div>
            <Button size="sm" variant="outline" className="md:hidden" onClick={createThread}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 min-h-0">
            {threadId && activeMessages ? (
              <ChatWindow
                key={threadId}
                threadId={threadId}
                initialMessages={activeMessages}
                onFinished={loadThreads}
              />
            ) : (
              <div className="p-6 space-y-3">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-6 w-2/3" />
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default WalletAssistant;

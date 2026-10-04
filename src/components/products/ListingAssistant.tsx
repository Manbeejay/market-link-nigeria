import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Wheat } from "lucide-react";

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/listing-assistant`;
const SUGGESTIONS = ["What is the quality like?", "Can it be delivered?", "How much for 10 units?"];

const Chat = ({ productId, initialMessages }: { productId: string; initialMessages: UIMessage[] }) => {
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const { messages, sendMessage, status, stop } = useChat({
    id: `listing-${productId}`,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: ENDPOINT,
      body: { productId },
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
      try { msg = JSON.parse(err.message).error ?? msg; } catch { /* plain */ }
      toast({ title: "Assistant unavailable", description: msg, variant: "destructive" });
    },
    onFinish: () => ref.current?.focus(),
  });

  const busy = status === "submitted" || status === "streaming";
  const submit = (t: string) => {
    if (!t.trim() || busy) return;
    sendMessage({ text: t.trim() });
    setInput("");
    ref.current?.focus();
  };

  return (
    <div className="flex flex-col">
      <Conversation className="h-72 rounded-md border bg-muted/30">
        <ConversationContent className="gap-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <p className="text-sm text-muted-foreground">Ask anything about this listing.</p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <Button key={s} size="sm" variant="outline" onClick={() => submit(s)}>{s}</Button>
                ))}
              </div>
            </div>
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
            <Message from="assistant"><MessageContent><Shimmer>Reading the listing...</Shimmer></MessageContent></Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <PromptInput className="mt-3" onSubmit={(msg) => submit(msg.text)}>
        <PromptInputTextarea
          ref={ref}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Is it sun-dried? Can you deliver to Lagos?"
        />
        <PromptInputFooter className="justify-end">
          <PromptInputSubmit status={status} onStop={stop} disabled={!busy && !input.trim()} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
};

const ListingAssistant = ({ productId }: { productId: string }) => {
  const { user } = useAuth();
  const [initial, setInitial] = useState<UIMessage[] | null>(null);

  useEffect(() => {
    if (!user) return;
    setInitial(null);
    supabase
      .from("listing_assistant_chats")
      .select("messages")
      .eq("product_id", productId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error("Could not load listing chat", error);
        setInitial(((data?.messages as unknown) as UIMessage[]) ?? []);
      });
  }, [productId, user]);

  return (
    <Card className="mt-8">
      <CardContent className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Wheat className="h-6 w-6 text-primary" />
          <div>
            <h2 className="font-semibold text-foreground">Ask about this produce</h2>
            <p className="text-xs text-muted-foreground">AI answers from the farmer's stated details. Confirm important points with the farmer.</p>
          </div>
        </div>
        {initial ? <Chat key={productId} productId={productId} initialMessages={initial} /> : <Skeleton className="h-72 w-full" />}
      </CardContent>
    </Card>
  );
};

export default ListingAssistant;

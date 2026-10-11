import { createFileRoute, Link } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useMemo } from "react";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputTextarea, PromptInputFooter, PromptInputSubmit } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/ai")({
  head: () => ({
    meta: [
      { title: "Ёрдамчии зеҳни сунъӣ | КИТОБХОНАИ МАН" },
      { name: "description", content: "Ёрдамчии таълимии зеҳни сунъӣ ба забони тоҷикӣ: шарҳ, ҳалли масъалаҳо ва тестҳо." },
      { property: "og:title", content: "Ёрдамчии зеҳни сунъӣ — КИТОБХОНАИ МАН" },
      { property: "og:description", content: "Саволҳои таълимии худро ба забони тоҷикӣ диҳед." },
    ],
  }),
  component: AiPage,
});

const suggestions = [
  "Муодилаи x² − 7x + 10 = 0-ро қадам ба қадам ҳал кун",
  "Қонуни дуюми Нютонро бо мисол фаҳмон",
  "Барои Таърихи халқи тоҷик 5 саволи тестӣ тартиб деҳ",
  "Фарқи Present Simple ва Past Simple чист?",
];

function AiPage() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user)
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <LogoMark className="mx-auto size-14" />
        <h1 className="mt-4 text-2xl font-bold">Ёрдамчии зеҳни сунъӣ</h1>
        <p className="mt-2 text-muted-foreground">Барои истифодаи ёрдамчӣ ворид шавед.</p>
        <Button asChild className="mt-5"><Link to="/auth">Воридшавӣ</Link></Button>
      </div>
    );
  return <Chat />;
}

function Chat() {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: async (): Promise<Record<string, string>> => {
          const { data } = await supabase.auth.getSession();
          const t = data.session?.access_token;
          return t ? { Authorization: `Bearer ${t}` } : {};
        },
      }),
    [],
  );
  const { messages, sendMessage, status, stop, setMessages } = useChat({
    transport,
    onError: (e) => toast.error(e.message || "Хатогӣ рух дод"),
  });
  const busy = status === "submitted" || status === "streaming";

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] max-w-3xl flex-col px-3 sm:px-4">
      <div className="flex items-center justify-between py-3">
        <div className="flex items-center gap-2">
          <LogoMark className="size-8" />
          <div>
            <p className="font-display font-bold leading-tight">Устод</p>
            <p className="text-xs text-muted-foreground">Ёрдамчии таълимӣ</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setMessages([])} disabled={busy}><RotateCcw /> Сӯҳбати нав</Button>
        )}
      </div>
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 && (
            <div className="py-10 text-center">
              <h1 className="text-2xl font-bold">Салом! Чӣ омӯзем?</h1>
              <p className="mt-2 text-sm text-muted-foreground">Аз ҳар фан савол диҳед — ман қадам ба қадам шарҳ медиҳам.</p>
              <div className="mx-auto mt-6 grid max-w-xl gap-2 sm:grid-cols-2">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => sendMessage({ text: s })} className="rounded-xl border bg-card p-3 text-left text-sm hover:border-primary">{s}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <Message key={m.id} from={m.role}>
              <MessageContent className={m.role === "user" ? "bg-primary text-primary-foreground" : ""}>
                {m.parts.map((p, i) => (p.type === "text" ? <MessageResponse key={i}>{p.text}</MessageResponse> : null))}
              </MessageContent>
            </Message>
          ))}
          {status === "submitted" && <Shimmer className="text-sm">Фикр мекунам...</Shimmer>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="pb-3 pt-2">
        <PromptInput
          onSubmit={(msg) => {
            const t = msg.text?.trim();
            if (!t || busy) return;
            sendMessage({ text: t });
          }}
          className="bg-card"
        >
          <PromptInputTextarea placeholder="Саволи худро нависед..." autoFocus />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
        <p className="mt-1.5 text-center text-[11px] text-muted-foreground">Зеҳни сунъӣ метавонад хато кунад — маълумоти муҳимро санҷед.</p>
      </div>
    </div>
  );
}

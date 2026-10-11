import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { createRunIdFetch } from "@/lib/ai/run-id";

const SYSTEM = `Ту «Устод» — ёрдамчии таълимии сомонаи «КИТОБХОНАИ МАН» барои хонандагон ва довталабони Тоҷикистон.
Ҳамеша ба забони тоҷикии адабӣ (хати кириллӣ) ҷавоб деҳ, агар корбар забони дигарро талаб накунад.
Мавзӯъҳо: математика, физика, химия, биология, география, таърих, забонҳои тоҷикӣ, русӣ ва англисӣ, адабиёт, информатика ва барномасозӣ.
- Масъалаҳоро қадам ба қадам ҳал кун ва ҳар қадамро шарҳ деҳ.
- Мавзӯъҳои душворро бо забони содда ва мисолҳо фаҳмон; сатҳи шарҳро ба синфи хонанда мувофиқ кун.
- Агар хоҳиш кунанд, саволҳои тестии машқӣ (4 вариант) бо ҷавоб ва шарҳ тартиб деҳ ва онҳоро ҳамчун «машқӣ» қайд кун, на саволи расмии ММТ.
- Ҷавоби хонандаро санҷида, хатоҳоро нарм шарҳ деҳ.
- Хулоса, конспект ва нақшаи омодагӣ тартиб деҳ.
- Агар чизеро аниқ надонӣ, ростқавлона бигӯ. Маълумоти расмиро (санаҳои имтиҳон ва ғ.) ба ntc.tj ҳавола кун.
Формулаҳоро бо матни оддӣ ва Markdown навис.`;

function json(status: number, error: string) {
  return new Response(JSON.stringify({ error }), { status, headers: { "Content-Type": "application/json" } });
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return json(401, "Барои истифода ворид шавед");
        const url = process.env["SUPABASE_URL"]!;
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
        const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
        const { data: userData, error: authErr } = await sb.auth.getUser(token);
        if (authErr || !userData.user) return json(401, "Сессия нодуруст аст. Аз нав ворид шавед");

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return json(500, "Хидмати зеҳни сунъӣ танзим нашудааст");

        let body: { messages?: UIMessage[] };
        try {
          body = await request.json();
        } catch {
          return json(400, "Дархости нодуруст");
        }
        const messages = Array.isArray(body.messages) ? body.messages.slice(-30) : [];
        if (!messages.length) return json(400, "Паём холӣ аст");

        const runFetch = createRunIdFetch(request.headers.get("X-Lovable-AIG-Run-ID") ?? undefined);
        const provider = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey,
          headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
          fetch: runFetch.fetch,
        });
        const result = streamText({
          model: provider.responses("openai/gpt-6-astra"),
          system: SYSTEM,
          messages: await convertToModelMessages(messages),
          abortSignal: request.signal,
          providerOptions: {
            openai: {
              forceReasoning: true,
              reasoningEffort: "low",
              reasoningSummary: "auto",
              store: false,
              include: ["reasoning.encrypted_content"],
            },
          },
        });
        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onError: (e) => {
            const m = String((e as Error)?.message ?? e);
            if (m.includes("402")) return "Кредитҳои зеҳни сунъӣ тамом шуданд.";
            if (m.includes("429")) return "Дархостҳо зиёданд. Каме дертар кӯшиш кунед.";
            return "Хатогӣ рух дод. Аз нав кӯшиш кунед.";
          },
        });
      },
    },
  },
});

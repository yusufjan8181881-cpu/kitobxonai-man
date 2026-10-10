import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, ArrowRight, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { clustersQuery, subjectsQuery, questionCountsQuery, subjectIcons } from "@/lib/content";

export const Route = createFileRoute("/cluster")({
  head: () => ({
    meta: [
      { title: "Кластерҳо — тестҳои машқӣ | КИТОБХОНАИ МАН" },
      { name: "description", content: "Омодагӣ ба тестҳои дохилшавӣ аз рӯи шаш кластер: фанҳо, саволҳои машқӣ, вақтсанҷ ва натиҷаҳо." },
      { property: "og:title", content: "Кластерҳо — тестҳои машқӣ" },
      { property: "og:description", content: "Шаш кластер, фанҳо ва тестҳои интерактивӣ ба забони тоҷикӣ." },
    ],
  }),
  component: ClusterPage,
});

function ClusterPage() {
  const clusters = useQuery(clustersQuery);
  const subjects = useQuery(subjectsQuery);
  const counts = useQuery(questionCountsQuery);
  const [q, setQ] = useState("");

  const subjMap = useMemo(() => new Map((subjects.data ?? []).map((s) => [s.id, s])), [subjects.data]);
  const term = q.trim().toLowerCase();
  const filtered = (clusters.data ?? []).filter((c) => {
    if (!term) return true;
    const names = c.subjectIds.map((id) => subjMap.get(id)?.name ?? "").join(" ");
    return (c.name + " " + c.description + " " + names).toLowerCase().includes(term);
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold sm:text-4xl">Кластерҳо</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">Кластери худро интихоб кунед ва аз рӯи фанҳои он тест супоред.</p>

      <div className="mt-5 flex items-start gap-3 rounded-xl border border-gold/40 bg-accent/50 p-4 text-sm text-accent-foreground">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>Ҳамаи саволҳо <b>маводи машқӣ</b> мебошанд, на саволҳои расмии Маркази миллии тестӣ. Тақсимоти фанҳо барои омодагӣ аст — рӯйхати расмии фанҳоро дар <a className="underline" href="https://ntc.tj" target="_blank" rel="noreferrer">ntc.tj</a> санҷед.</p>
      </div>

      <div className="relative mt-6 max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ҷустуҷӯи кластер ё фан..." className="h-11 bg-card pl-9" />
      </div>

      {clusters.isLoading && <p className="mt-8 text-muted-foreground">Бор шуда истодааст...</p>}
      {clusters.error && <p className="mt-8 text-destructive">Хатогӣ ҳангоми боркунӣ. Саҳифаро нав кунед.</p>}
      {!clusters.isLoading && filtered.length === 0 && <p className="mt-8 text-muted-foreground">Ҳеҷ чиз ёфт нашуд.</p>}

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {filtered.map((c) => (
          <div key={c.id} className="rounded-2xl border bg-card p-6 shadow-card">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-gold font-display text-lg font-extrabold text-gold-foreground">{c.id}</span>
              <h2 className="text-lg font-bold leading-snug">{c.name}</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{c.description}</p>
            <div className="mt-4 space-y-2">
              {c.subjectIds.map((id) => {
                const s = subjMap.get(id);
                if (!s) return null;
                const Icon = subjectIcons[s.icon] ?? DefaultIcon;
                const n = counts.data?.[id] ?? 0;
                return (
                  <Link key={id} to="/quiz" search={{ subject: s.slug, cluster: c.id }} className="group flex items-center gap-3 rounded-xl border bg-background p-3 transition-colors hover:border-primary">
                    <Icon className="size-5 text-primary" />
                    <span className="flex-1 font-medium">{s.name}</span>
                    <span className="text-xs text-muted-foreground">{n} савол</span>
                    <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </Link>
                );
              })}
            </div>
            <Link to="/quiz" search={{ cluster: c.id }} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              Тести омехта аз ҳамаи фанҳо <ArrowRight className="size-4" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

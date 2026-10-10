import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { subjectsQuery, subjectIcons, kindLabel } from "@/lib/content";

export const Route = createFileRoute("/library/")({
  head: () => ({
    meta: [
      { title: "Китобхона | КИТОБХОНАИ МАН" },
      { name: "description", content: "Китобхонаи таълимӣ: конспектҳо, формулаҳо, дарсҳо ва саволҳо аз рӯи фанҳо ба забони тоҷикӣ." },
      { property: "og:title", content: "Китобхонаи таълимӣ — КИТОБХОНАИ МАН" },
      { property: "og:description", content: "Маводи таълимӣ аз рӯи фан, синф ва мавзӯъ." },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const subjects = useQuery(subjectsQuery);
  const [q, setQ] = useState("");
  const term = q.trim();

  const results = useQuery({
    queryKey: ["resource-search", term],
    enabled: term.length >= 2,
    queryFn: async () => {
      const like = `%${term.replace(/[%_,()]/g, " ")}%`;
      const { data, error } = await supabase
        .from("resources")
        .select("id, title, summary, kind, subjects(name)")
        .eq("status", "approved")
        .or(`title.ilike.${like},summary.ilike.${like},content.ilike.${like},topic.ilike.${like}`)
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  const filteredSubjects = (subjects.data ?? []).filter((s) => !term || s.name.toLowerCase().includes(term.toLowerCase()));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold sm:text-4xl">Китобхона</h1>
      <p className="mt-2 text-muted-foreground">Фанро интихоб кунед ё маводро ҷустуҷӯ намоед.</p>
      <div className="relative mt-6 max-w-xl">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Масалан: формула, Сомониён, Python..." className="h-12 bg-card pl-9 text-base" />
      </div>

      {term.length >= 2 && (
        <div className="mt-6">
          <h2 className="text-lg font-bold">Натиҷаҳои ҷустуҷӯ</h2>
          {results.isLoading && <p className="mt-2 text-sm text-muted-foreground">Ҷустуҷӯ...</p>}
          {results.data?.length === 0 && <p className="mt-2 text-sm text-muted-foreground">Мавод ёфт нашуд.</p>}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {results.data?.map((r) => (
              <Link key={r.id} to="/read/$id" params={{ id: r.id }} className="rounded-xl border bg-card p-4 transition-colors hover:border-primary">
                <p className="text-xs text-muted-foreground">{r.subjects?.name} · {kindLabel[r.kind]}</p>
                <p className="mt-1 font-semibold">{r.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.summary}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {subjects.isLoading && <p className="mt-8 text-muted-foreground">Бор шуда истодааст...</p>}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {filteredSubjects.map((s) => {
          const Icon = subjectIcons[s.icon] ?? subjectIcons.book;
          return (
            <Link key={s.id} to="/library/$slug" params={{ slug: s.slug }} className="card-lift group rounded-2xl border bg-card p-4 shadow-card sm:p-5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary transition-colors group-hover:bg-gradient-primary group-hover:text-primary-foreground">
                <Icon className="size-5" />
              </span>
              <p className="mt-3 font-bold leading-snug">{s.name}</p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, ExternalLink, ChevronDown, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { subjectsQuery, kindLabel, difficultyLabel, sourceLabel, type Question } from "@/lib/content";

export const Route = createFileRoute("/library/$slug")({
  head: () => ({
    meta: [
      { title: "Маводи фан | КИТОБХОНАИ МАН" },
      { name: "description", content: "Китобҳо, дарсҳо, саволҳо ва ҷавобҳо аз рӯи фан." },
      { property: "og:title", content: "Маводи фан — КИТОБХОНАИ МАН" },
      { property: "og:description", content: "Маводи таълимӣ ва саволу ҷавоб." },
    ],
  }),
  component: SubjectPage,
});

function SubjectPage() {
  const { slug } = Route.useParams();
  const subjects = useQuery(subjectsQuery);
  const subject = subjects.data?.find((s) => s.slug === slug);
  const [grade, setGrade] = useState<string>("");

  const resources = useQuery({
    queryKey: ["resources", subject?.id],
    enabled: !!subject,
    queryFn: async () => {
      const { data, error } = await supabase.from("resources").select("id,title,summary,kind,grade,topic,external_url,source_type").eq("subject_id", subject!.id).eq("status", "approved").order("title");
      if (error) throw error;
      return data;
    },
  });
  const questions = useQuery({
    queryKey: ["subject-questions", subject?.id],
    enabled: !!subject,
    queryFn: async () => {
      const { data, error } = await supabase.from("questions").select("*").eq("subject_id", subject!.id).eq("status", "approved").order("created_at").limit(200);
      if (error) throw error;
      return data as unknown as Question[];
    },
  });

  if (subjects.isSuccess && !subject)
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center">Фан ёфт нашуд. <Link to="/library" className="text-primary underline">Ба китобхона</Link></div>;

  const grades = Array.from(new Set((resources.data ?? []).map((r) => r.grade).filter(Boolean))).sort() as number[];
  const shown = (resources.data ?? []).filter((r) => !grade || String(r.grade) === grade);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link to="/library" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Китобхона</Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{subject?.name ?? "..."}</h1>
          <p className="mt-1 text-muted-foreground">{subject?.description}</p>
        </div>
        {!!questions.data?.length && (
          <Button asChild variant="hero"><Link to="/quiz" search={{ subject: slug }}><ClipboardCheck /> Тест супоридан</Link></Button>
        )}
      </div>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Мавод ва дарсҳо</h2>
          {grades.length > 0 && (
            <select value={grade} onChange={(e) => setGrade(e.target.value)} className="h-9 rounded-lg border bg-card px-3 text-sm">
              <option value="">Ҳамаи синфҳо</option>
              {grades.map((g) => <option key={g} value={g}>Синфи {g}</option>)}
            </select>
          )}
        </div>
        {resources.isLoading && <p className="mt-3 text-sm text-muted-foreground">Бор шуда истодааст...</p>}
        {resources.data && shown.length === 0 && (
          <p className="mt-3 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Барои ин фан ҳоло мавод илова нашудааст. Метавонед аз ёрдамчии <Link to="/ai" className="text-primary underline">зеҳни сунъӣ</Link> пурсед.</p>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {shown.map((r) => (
            <Link key={r.id} to="/read/$id" params={{ id: r.id }} className="card-lift rounded-2xl border bg-card p-5 shadow-card">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary">{kindLabel[r.kind]}</Badge>
                {r.grade && <Badge variant="outline">Синфи {r.grade}</Badge>}
                {r.source_type === "ai" && <Badge variant="outline" className="border-gold/60">Таҳияи ЗС</Badge>}
                {r.external_url && <ExternalLink className="size-4 text-muted-foreground" />}
              </div>
              <p className="mt-3 font-bold">{r.title}</p>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.summary}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Саволу ҷавоб</h2>
        {questions.data?.length === 0 && <p className="mt-3 text-sm text-muted-foreground">Ҳоло савол нест.</p>}
        <div className="mt-4 space-y-2">
          {questions.data?.map((q, i) => <QA key={q.id} q={q} n={i + 1} />)}
        </div>
      </section>
    </div>
  );
}

function QA({ q, n }: { q: Question; n: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border bg-card">
      <button onClick={() => setOpen(!open)} className="flex w-full items-start gap-3 p-4 text-left">
        <span className="text-sm font-semibold text-primary">{n}.</span>
        <span className="flex-1 font-medium">{q.question}</span>
        <ChevronDown className={`size-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t px-4 pb-4 pt-3 text-sm">
          <ul className="space-y-1">
            {q.options.map((o, i) => (
              <li key={i} className={i === q.correct_index ? "font-semibold text-success" : "text-muted-foreground"}>
                {String.fromCharCode(1040 + i)}) {o} {i === q.correct_index && "✓"}
              </li>
            ))}
          </ul>
          {q.explanation && <p className="mt-2"><b>Шарҳ:</b> {q.explanation}</p>}
          <p className="mt-2 text-xs text-muted-foreground">{difficultyLabel[q.difficulty]} · {sourceLabel[q.source_type]}</p>
        </div>
      )}
    </div>
  );
}

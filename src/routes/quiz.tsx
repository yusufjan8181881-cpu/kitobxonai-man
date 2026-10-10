import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Timer, CheckCircle2, XCircle, RotateCcw, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  clustersQuery, subjectsQuery, difficultyLabel, sourceLabel, shuffle, scoreQuiz, type Question,
} from "@/lib/content";
import { cn } from "@/lib/utils";

type Search = { subject?: string; cluster?: number; difficulty?: string };

export const Route = createFileRoute("/quiz")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    subject: typeof s.subject === "string" ? s.subject : undefined,
    cluster: s.cluster != null && !isNaN(Number(s.cluster)) ? Number(s.cluster) : undefined,
    difficulty: typeof s.difficulty === "string" && ["easy", "medium", "hard"].includes(s.difficulty) ? s.difficulty : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Тести машқӣ | КИТОБХОНАИ МАН" },
      { name: "description", content: "Тести интерактивӣ бо вақтсанҷ, шарҳи ҷавобҳо ва ҳисоби натиҷа." },
      { property: "og:title", content: "Тести машқӣ — КИТОБХОНАИ МАН" },
      { property: "og:description", content: "Саволҳои машқӣ бо ҷавобҳо ва шарҳ." },
    ],
  }),
  component: QuizPage,
});

const SECONDS_PER_Q = 60;

function QuizPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const subjects = useQuery(subjectsQuery);
  const clusters = useQuery(clustersQuery);
  const [count, setCount] = useState(10);
  const [started, setStarted] = useState(false);

  const subject = subjects.data?.find((s) => s.slug === search.subject);
  const cluster = clusters.data?.find((c) => c.id === search.cluster);
  const subjectIds = subject ? [subject.id] : cluster ? cluster.subjectIds : [];
  const ready = subjects.isSuccess && clusters.isSuccess;

  const title = subject ? subject.name : cluster ? cluster.name : "Ҳамаи фанҳо";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/cluster" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Ба кластерҳо
      </Link>
      <h1 className="mt-3 text-2xl font-bold sm:text-3xl">{title}</h1>

      {!started ? (
        <div className="mt-6 rounded-2xl border bg-card p-6 shadow-card">
          <h2 className="text-lg font-bold">Танзимоти тест</h2>
          <div className="mt-4 space-y-5">
            <div>
              <p className="mb-2 text-sm font-medium">Фан</p>
              <select
                className="h-11 w-full rounded-lg border bg-background px-3"
                value={search.subject ?? ""}
                onChange={(e) => navigate({ search: { ...search, subject: e.target.value || undefined } })}
              >
                <option value="">{cluster ? "Ҳамаи фанҳои кластер" : "Ҳамаи фанҳо"}</option>
                {(subjects.data ?? [])
                  .filter((s) => !cluster || cluster.subjectIds.includes(s.id))
                  .map((s) => <option key={s.id} value={s.slug}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Сатҳи душворӣ</p>
              <div className="flex flex-wrap gap-2">
                {[undefined, "easy", "medium", "hard"].map((d) => (
                  <Button
                    key={d ?? "all"}
                    size="sm"
                    variant={search.difficulty === d ? "default" : "outline"}
                    onClick={() => navigate({ search: { ...search, difficulty: d } })}
                  >
                    {d ? difficultyLabel[d] : "Ҳама"}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Шумораи саволҳо</p>
              <div className="flex gap-2">
                {[5, 10, 20, 30].map((n) => (
                  <Button key={n} size="sm" variant={count === n ? "default" : "outline"} onClick={() => setCount(n)}>{n}</Button>
                ))}
              </div>
            </div>
          </div>
          <Button variant="hero" size="lg" className="mt-6 w-full sm:w-auto" disabled={!ready} onClick={() => setStarted(true)}>
            Оғози тест
          </Button>
        </div>
      ) : (
        <QuizRunner
          key={`${search.subject}-${search.cluster}-${search.difficulty}-${count}`}
          subjectIds={subjectIds}
          difficulty={search.difficulty}
          count={count}
          clusterId={search.cluster}
          subjectId={subject?.id}
          onExit={() => setStarted(false)}
        />
      )}
    </div>
  );
}

function QuizRunner(props: {
  subjectIds: string[]; difficulty?: string; count: number; clusterId?: number; subjectId?: string; onExit: () => void;
}) {
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["quiz", props.subjectIds, props.difficulty, props.count],
    queryFn: async () => {
      let q = supabase.from("questions").select("*").eq("status", "approved").limit(500);
      if (props.subjectIds.length) q = q.in("subject_id", props.subjectIds);
      if (props.difficulty) q = q.eq("difficulty", props.difficulty);
      const { data, error } = await q;
      if (error) throw error;
      return shuffle(data as unknown as Question[]).slice(0, props.count);
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const questions = data ?? [];
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [finished, setFinished] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const limit = questions.length * SECONDS_PER_Q;

  useEffect(() => {
    if (questions.length) setAnswers(Array(questions.length).fill(null));
  }, [questions.length]);

  useEffect(() => {
    if (finished || !questions.length) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [finished, questions.length]);

  useEffect(() => {
    if (!finished && limit > 0 && elapsed >= limit) {
      toast.info("Вақт тамом шуд");
      finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, limit, finished]);

  const result = useMemo(() => scoreQuiz(questions, answers), [questions, answers]);

  async function finish() {
    setFinished(true);
    if (user) {
      const r = scoreQuiz(questions, answers);
      const { error } = await supabase.from("quiz_attempts").insert({
        user_id: user.id, subject_id: props.subjectId ?? null, cluster_id: props.clusterId ?? null,
        total: r.total, correct: r.correct, duration_seconds: elapsed,
      });
      if (error) toast.error("Натиҷа сабт нашуд");
    }
  }

  if (isLoading) return <p className="mt-8 text-muted-foreground">Саволҳо бор шуда истодаанд...</p>;
  if (error) return <p className="mt-8 text-destructive">Хатогӣ ҳангоми боркунии саволҳо.</p>;
  if (!questions.length)
    return (
      <div className="mt-8 rounded-2xl border bg-card p-6 text-center">
        <p>Барои ин интихоб ҳоло савол мавҷуд нест.</p>
        <Button className="mt-4" variant="outline" onClick={props.onExit}>Танзимоти дигар</Button>
      </div>
    );

  const remaining = Math.max(0, limit - elapsed);
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  if (finished) {
    return (
      <div className="mt-6 space-y-6">
        <div className="rounded-2xl bg-gradient-hero p-8 text-center text-hero-foreground">
          <p className="opacity-80">Натиҷаи шумо</p>
          <p className="mt-2 font-display text-6xl font-extrabold text-gold">{result.percent}%</p>
          <p className="mt-2">{result.correct} аз {result.total} ҷавоби дуруст · {Math.floor(elapsed / 60)} дақ {elapsed % 60} сон</p>
          {!user && <p className="mt-3 text-sm opacity-75">Барои сабти натиҷаҳо <Link to="/auth" className="underline">ворид шавед</Link>.</p>}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button variant="hero" onClick={props.onExit}><RotateCcw /> Тести нав</Button>
          </div>
        </div>
        <h2 className="text-xl font-bold">Таҳлили ҷавобҳо</h2>
        {questions.map((q, i) => {
          const ok = answers[i] === q.correct_index;
          return (
            <div key={q.id} className="rounded-2xl border bg-card p-5">
              <div className="flex items-start gap-2">
                {ok ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" /> : <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />}
                <p className="font-medium">{i + 1}. {q.question}</p>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm">
                {q.options.map((o, oi) => (
                  <li key={oi} className={cn("rounded-lg px-3 py-2", oi === q.correct_index ? "bg-success/15 font-medium" : oi === answers[i] ? "bg-destructive/10 line-through" : "bg-muted/50")}>{o}</li>
                ))}
              </ul>
              {q.explanation && <p className="mt-3 text-sm text-muted-foreground"><b>Шарҳ:</b> {q.explanation}</p>}
            </div>
          );
        })}
      </div>
    );
  }

  const q = questions[idx];
  const chosen = answers[idx];
  const answeredCount = answers.filter((a) => a !== null).length;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Савол {idx + 1} / {questions.length}</span>
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono", remaining < 60 ? "bg-destructive/10 text-destructive" : "bg-secondary")}>
          <Timer className="size-4" /> {mm}:{ss}
        </span>
      </div>
      <Progress value={(answeredCount / questions.length) * 100} className="mt-3" />

      <div className="mt-6 rounded-2xl border bg-card p-6 shadow-card">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{difficultyLabel[q.difficulty]}</Badge>
          {q.topic && <Badge variant="outline">{q.topic}</Badge>}
          <Badge variant="outline" className="border-gold/60">{sourceLabel[q.source_type] ?? "Машқӣ"}</Badge>
        </div>
        <p className="mt-4 text-lg font-medium leading-relaxed">{q.question}</p>
        <div className="mt-5 space-y-2.5">
          {q.options.map((o, oi) => (
            <button
              key={oi}
              onClick={() => setAnswers((a) => a.map((v, i) => (i === idx ? oi : v)))}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                chosen === oi ? "border-primary bg-primary/10" : "hover:border-primary/50 hover:bg-muted/50",
              )}
            >
              <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold", chosen === oi && "border-primary bg-primary text-primary-foreground")}>
                {String.fromCharCode(1040 + oi)}
              </span>
              {o}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-2">
        <Button variant="outline" disabled={idx === 0} onClick={() => setIdx(idx - 1)}><ArrowLeft /> Қаблӣ</Button>
        {idx < questions.length - 1 ? (
          <Button onClick={() => setIdx(idx + 1)}>Навбатӣ <ArrowRight /></Button>
        ) : (
          <Button variant="hero" onClick={finish}>Анҷоми тест</Button>
        )}
      </div>
      <div className="mt-6 flex flex-wrap gap-1.5">
        {questions.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)} className={cn("size-8 rounded-md border text-xs", i === idx && "border-primary", answers[i] !== null && "bg-primary text-primary-foreground")}>{i + 1}</button>
        ))}
      </div>
    </div>
  );
}

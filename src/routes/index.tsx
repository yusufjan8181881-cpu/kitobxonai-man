import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, Bot, ClipboardCheck, Timer, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero-book.jpg";
import { subjectsQuery, questionCountsQuery } from "@/lib/content";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "КИТОБХОНАИ МАН — Саволнома ва китобхона" },
      { name: "description", content: "Омодагӣ ба тестҳои кластерӣ, китобхонаи таълимӣ ва ёрдамчии зеҳни сунъӣ — ҳама ба забони тоҷикӣ." },
      { property: "og:title", content: "КИТОБХОНАИ МАН — Саволнома ва китобхона" },
      { property: "og:description", content: "Тестҳои машқӣ, китобхона ва ёрдамчии зеҳни сунъӣ барои хонандагони Тоҷикистон." },
    ],
  }),
  component: Index,
});

const sections = [
  {
    to: "/cluster" as const,
    num: "01",
    title: "Кластер",
    text: "Тестҳои машқӣ аз рӯи шаш кластер: интихоби фан, сатҳи душворӣ, вақтсанҷ ва натиҷаҳо.",
    icon: ClipboardCheck,
    cta: "Оғози тест",
  },
  {
    to: "/library" as const,
    num: "02",
    title: "Китобхона",
    text: "Конспектҳо, формулаҳо ва маводи таълимӣ аз рӯи фанҳо — бо ҷустуҷӯ ва захира.",
    icon: BookOpen,
    cta: "Ба китобхона",
  },
  {
    to: "/ai" as const,
    num: "03",
    title: "Зеҳни сунъӣ (ИИ)",
    text: "Ёрдамчии шахсӣ: шарҳи қадам ба қадам, ҳалли масъалаҳо ва тартиби тестҳо ба забони тоҷикӣ.",
    icon: Bot,
    cta: "Пурсидан",
  },
];

function Index() {
  const { data: subjects } = useQuery(subjectsQuery);
  const { data: counts } = useQuery(questionCountsQuery);
  const totalQ = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : null;

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-hero text-hero-foreground">
        <div className="pattern-dots absolute inset-0" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-[1.2fr_1fr] md:py-24">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-hero-foreground/20 bg-hero-foreground/10 px-3 py-1 text-xs font-medium">
              <span className="size-1.5 rounded-full bg-gold" /> Платформаи таълимӣ барои Тоҷикистон
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.15] sm:text-5xl lg:text-6xl">
              Хуш омадед ба <span className="text-gradient-gold">саволнома</span> ва китобхона
            </h1>
            <p className="mt-5 max-w-xl text-base opacity-80 sm:text-lg">
              Барои имтиҳонҳо омода шавед, китоб хонед ва аз ёрдамчии зеҳни сунъӣ савол диҳед — ҳама дар як ҷо, ба забони тоҷикӣ.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="lg">
                <Link to="/cluster">Оғози омодагӣ <ArrowRight /></Link>
              </Button>
              <Button asChild variant="glass" size="lg">
                <Link to="/library">Китобхона</Link>
              </Button>
            </div>
            <dl className="mt-10 flex flex-wrap gap-8 text-sm">
              <div><dt className="opacity-70">Кластерҳо</dt><dd className="font-display text-2xl font-bold text-gold">6</dd></div>
              <div><dt className="opacity-70">Фанҳо</dt><dd className="font-display text-2xl font-bold text-gold">{subjects?.length ?? "—"}</dd></div>
              <div><dt className="opacity-70">Саволҳои машқӣ</dt><dd className="font-display text-2xl font-bold text-gold">{totalQ ?? "—"}</dd></div>
            </dl>
          </div>
          <div className="relative mx-auto w-full max-w-sm animate-rise [animation-delay:150ms] md:max-w-none">
            <div className="absolute -inset-6 rounded-[2rem] bg-gold/20 blur-3xl" />
            <img src={heroImg} alt="Китоби кушода дар пасманзари кӯҳҳо" width={1024} height={1024} className="relative aspect-square w-full rounded-[2rem] border border-hero-foreground/15 object-cover shadow-2xl" />
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-10 max-w-6xl px-4">
        <div className="grid gap-5 md:grid-cols-3">
          {sections.map((s, i) => (
            <Link
              key={s.to}
              to={s.to}
              className="group card-lift relative animate-rise overflow-hidden rounded-2xl border bg-card p-6 shadow-card"
              style={{ animationDelay: `${200 + i * 100}ms` }}
            >
              <div className="flex items-start justify-between">
                <span className="flex size-12 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
                  <s.icon className="size-6" />
                </span>
                <span className="font-display text-3xl font-extrabold text-border">{s.num}</span>
              </div>
              <h2 className="mt-5 text-2xl font-bold">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                {s.cta} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-6xl px-4">
        <h2 className="text-center text-3xl font-bold">Чаро КИТОБХОНАИ МАН?</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Timer, t: "Вақтсанҷ ва натиҷа", d: "Тестро бо вақт супоред ва баҳои худро бубинед." },
            { icon: Search, t: "Ҷустуҷӯи тез", d: "Маводро аз рӯи фан, синф ва мавзӯъ ёбед." },
            { icon: Bot, t: "Ёрдамчии зирак", d: "Шарҳи содда ва қадам ба қадам ба забони тоҷикӣ." },
            { icon: ShieldCheck, t: "Маводи ростқавлона", d: "Саволҳои машқӣ ҳамеша аз расмӣ ҷудо нишон дода мешаванд." },
          ].map((f) => (
            <div key={f.t} className="rounded-2xl border bg-card/60 p-5">
              <f.icon className="size-6 text-gold" />
              <h3 className="mt-3 font-bold">{f.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

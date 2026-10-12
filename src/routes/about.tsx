import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, MapPin, GraduationCap, PenTool, HeartHandshake, BookOpen, ClipboardCheck, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Дар бораи мо — КИТОБХОНАИ МАН" },
      { name: "description", content: "Дар бораи КИТОБХОНАИ МАН: муаллиф, тарроҳ ва дастаи эҷодкунандаи платформаи таълимӣ." },
      { property: "og:title", content: "Дар бораи мо — КИТОБХОНАИ МАН" },
      { property: "og:description", content: "Платформаи таълимии КИТОБХОНАИ МАН: тими эҷодкунанда ва мақсадҳои мо." },
    ],
  }),
  component: AboutPage,
});

const team = [
  { icon: Users, role: "Муаллиф ва муҳаррир", name: "Муродов Юсуф", note: "Эҷоди маводҳо, саволҳои машқӣ ва идораи сомона." },
  { icon: PenTool, role: "Тарроҳ", name: "Зоирова Зулайхо", note: "Тарҳи сомона ва ороиши саҳифаҳо." },
  { icon: HeartHandshake, role: "Ёрдамчӣ", name: "Абдулоев Илхом", note: "Ёрии дар тайёр кардани маводҳо ва санҷиш." },
];

const facts = [
  { icon: MapPin, label: "Макон", value: "Ноҳияи Ҳамадонӣ, деҳаи Ангурбоғ" },
  { icon: GraduationCap, label: "Муассиса", value: "Муассисаи таҳсилоти миёнаи умумии №23" },
  { icon: BookOpen, label: "Синф", value: "11 «А»" },
];

function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero text-hero-foreground">
        <div className="pattern-dots absolute inset-0" />
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center md:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-hero-foreground/20 bg-hero-foreground/10 px-3 py-1 text-xs font-medium">
            <span className="size-1.5 rounded-full bg-gold" /> Дар бораи мо
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight sm:text-5xl">
            КИТОБХОНАИ <span className="text-gradient-gold">МАН</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base opacity-80 sm:text-lg">
            Лоиҳаи таълимии хонандагон: омодагӣ ба тестҳои кластерӣ, китобхонаи машқӣ ва ёрдамчии зеҳни сунъӣ — ҳама ба забони тоҷикӣ, дар як ҷо.
          </p>
        </div>
      </section>

      {/* Facts */}
      <section className="mx-auto -mt-10 max-w-4xl px-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {facts.map((f) => (
            <div key={f.label} className="rounded-2xl border bg-card p-5 shadow-card">
              <f.icon className="size-5 text-gold" />
              <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{f.label}</p>
              <p className="mt-1 font-semibold">{f.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="mx-auto mt-14 max-w-4xl px-4">
        <div className="rounded-2xl border bg-card/60 p-6 sm:p-8">
          <h2 className="text-2xl font-bold">Мақсади мо</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Ин сомона барои он сохта шудааст, ки омодагӣ ба имтиҳонҳо содда, мантиқӣ ва дастрас гардад. Ҳар як саволи машқӣ ва маводи китобхона бо шарҳи содда ва қадам ба қадам тарҳрезӣ шудааст, то хонанда ҳам натиҷаи тестро беҳтар кунад ва ҳам онро фаҳмад.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Link to="/cluster" className="flex items-center gap-2 rounded-xl border bg-background px-4 py-3 text-sm font-medium transition-colors hover:bg-muted">
              <ClipboardCheck className="size-4 text-gold" /> Тестҳои кластерӣ
            </Link>
            <Link to="/library" className="flex items-center gap-2 rounded-xl border bg-background px-4 py-3 text-sm font-medium transition-colors hover:bg-muted">
              <BookOpen className="size-4 text-gold" /> Китобхона
            </Link>
            <Link to="/ai" className="flex items-center gap-2 rounded-xl border bg-background px-4 py-3 text-sm font-medium transition-colors hover:bg-muted">
              <Bot className="size-4 text-gold" /> Ёрдамчии ИИ
            </Link>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="mx-auto mt-14 max-w-4xl px-4">
        <h2 className="text-center text-3xl font-bold">Дастаи лоиҳа</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {team.map((m) => (
            <div key={m.name} className="card-lift rounded-2xl border bg-card p-6 text-center shadow-card">
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground">
                <m.icon className="size-7" />
              </span>
              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">{m.role}</p>
              <p className="mt-1 font-display text-lg font-bold">{m.name}</p>
              <p className="mt-2 text-sm text-muted-foreground">{m.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Signature */}
      <section className="mx-auto mt-14 max-w-4xl px-4 pb-4">
        <div className="rounded-2xl border bg-gradient-to-br from-primary/5 to-gold/5 p-6 text-center sm:p-8">
          <div className="mx-auto w-fit"><Logo /></div>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Лоиҳа бо меҳнати хонандагон ва хоҳиши донистан сохта шудааст. Агар шумо хоҳеҳед дар ин кор саҳм гузоред — бо хотирсолиҳо, саволҳо ё ақидаҳо — мо хуш омадемед.
          </p>
          <div className="mt-6">
            <Button asChild>
              <Link to="/">Ба саҳифаи асосӣ</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

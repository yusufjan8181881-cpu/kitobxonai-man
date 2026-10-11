import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/saved")({
  head: () => ({
    meta: [
      { title: "Захираҳо | КИТОБХОНАИ МАН" },
      { name: "description", content: "Маводи захиракардаи шумо ва натиҷаҳои тестҳо." },
      { property: "og:title", content: "Захираҳо — КИТОБХОНАИ МАН" },
      { property: "og:description", content: "Маводи захирашуда." },
    ],
  }),
  component: SavedPage,
});

function SavedPage() {
  const { user, loading } = useAuth();
  const saved = useQuery({
    queryKey: ["saved", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("bookmarks").select("id, resources(id, title, summary)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const attempts = useQuery({
    queryKey: ["attempts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("quiz_attempts").select("id, total, correct, created_at, subjects(name)").order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
  });

  if (loading) return null;
  if (!user) return <div className="mx-auto max-w-md px-4 py-16 text-center">Барои дидани захираҳо <Link to="/auth" className="text-primary underline">ворид шавед</Link>.</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold">Захираҳо</h1>
      {saved.data?.length === 0 && <p className="mt-4 text-muted-foreground">Ҳоло чизе захира накардаед.</p>}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {saved.data?.map((b) => b.resources && (
          <Link key={b.id} to="/read/$id" params={{ id: b.resources.id }} className="rounded-xl border bg-card p-4 hover:border-primary">
            <p className="font-semibold">{b.resources.title}</p>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{b.resources.summary}</p>
          </Link>
        ))}
      </div>
      <h2 className="mt-10 text-xl font-bold">Натиҷаҳои тестҳо</h2>
      {attempts.data?.length === 0 && <p className="mt-3 text-muted-foreground">Ҳоло тест насупоридаед.</p>}
      <ul className="mt-3 divide-y rounded-xl border bg-card">
        {attempts.data?.map((a) => (
          <li key={a.id} className="flex justify-between p-3 text-sm">
            <span>{a.subjects?.name ?? "Тести омехта"} · {new Date(a.created_at).toLocaleDateString("ru-RU")}</span>
            <span className="font-semibold">{a.correct}/{a.total} ({a.total ? Math.round((a.correct / a.total) * 100) : 0}%)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

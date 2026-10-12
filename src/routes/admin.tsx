import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { subjectsQuery, difficultyLabel } from "@/lib/content";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Панели идора | КИТОБХОНАИ МАН" },
      { name: "description", content: "Идораи саволҳо ва мавод." },
      { property: "og:title", content: "Панели идора — КИТОБХОНАИ МАН" },
      { property: "og:description", content: "Идораи мундариҷа." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, loading, user } = useAuth();
  const qc = useQueryClient();
  const subjects = useQuery(subjectsQuery);
  const [term, setTerm] = useState("");
  const [subject, setSubject] = useState("");

  const stats = useQuery({
    queryKey: ["admin-stats"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_stats");
      if (error) throw error;
      return data as Record<string, number>;
    },
  });
  const list = useQuery({
    queryKey: ["admin-questions", term, subject],
    enabled: isAdmin,
    queryFn: async () => {
      let q = supabase.from("questions").select("id, question, difficulty, status, subjects(name)").order("created_at", { ascending: false }).limit(50);
      if (term.trim()) q = q.ilike("question", `%${term.trim()}%`);
      if (subject) q = q.eq("subject_id", subject);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  async function remove(id: string) {
    if (!confirm("Ин саволро нест кунед?")) return;
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) {
      toast.error("Нест карда нашуд");
      return;
    }
    toast.success("Нест шуд");
    qc.invalidateQueries({ queryKey: ["admin-questions"] });
  }

  if (loading) return null;
  if (!user) return <div className="mx-auto max-w-md px-4 py-16 text-center"><Link to="/auth" className="text-primary underline">Ворид шавед</Link></div>;
  if (!isAdmin) return <div className="mx-auto max-w-md px-4 py-16 text-center">Шумо иҷозати дастрасӣ ба панели идора надоред.</div>;

  const labels: Record<string, string> = { users: "Корбарон", questions: "Саволҳо", resources: "Мавод", pending: "Дар интизорӣ", attempts: "Тестҳо", threads: "Сӯҳбатҳо" };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold">Панели идора</h1>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Object.entries(labels).map(([k, l]) => (
          <div key={k} className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className="font-display text-2xl font-bold">{stats.data?.[k] ?? "—"}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-2">
        <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Ҷустуҷӯи савол..." className="max-w-sm bg-card" />
        <select value={subject} onChange={(e) => setSubject(e.target.value)} className="h-9 rounded-md border bg-card px-3 text-sm">
          <option value="">Ҳамаи фанҳо</option>
          {subjects.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <ul className="mt-4 divide-y rounded-xl border bg-card">
        {list.data?.map((q) => (
          <li key={q.id} className="flex items-start gap-3 p-3 text-sm">
            <div className="flex-1">
              <p>{q.question}</p>
              <p className="mt-1 text-xs text-muted-foreground">{q.subjects?.name} · {difficultyLabel[q.difficulty]} · {q.status}</p>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={() => remove(q.id)} aria-label="Нест кардан"><Trash2 /></Button>
          </li>
        ))}
        {list.data?.length === 0 && <li className="p-4 text-sm text-muted-foreground">Ҳеҷ чиз ёфт нашуд.</li>}
      </ul>
    </div>
  );
}

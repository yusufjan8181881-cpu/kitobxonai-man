import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bookmark, BookmarkCheck, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageResponse } from "@/components/ai-elements/message";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { kindLabel } from "@/lib/content";

export const Route = createFileRoute("/read/$id")({
  head: () => ({
    meta: [
      { title: "Хониш | КИТОБХОНАИ МАН" },
      { name: "description", content: "Маводи таълимӣ барои хониш." },
      { property: "og:title", content: "Хониш — КИТОБХОНАИ МАН" },
      { property: "og:description", content: "Маводи таълимӣ ба забони тоҷикӣ." },
    ],
  }),
  component: ReadPage,
});

function ReadPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const res = useQuery({
    queryKey: ["resource", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("resources").select("*, subjects(name, slug)").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const bm = useQuery({
    queryKey: ["bookmark", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("bookmarks").select("id").eq("resource_id", id).maybeSingle();
      return data;
    },
  });

  async function toggle() {
    if (!user) {
      toast.info("Барои захира ворид шавед");
      return;
    }
    if (bm.data) {
      const { error } = await supabase.from("bookmarks").delete().eq("id", bm.data.id);
      if (error) {
        toast.error("Хатогӣ");
        return;
      }
      toast.success("Аз захираҳо хориҷ шуд");
    } else {
      const { error } = await supabase.from("bookmarks").insert({ user_id: user.id, resource_id: id });
      if (error) {
        toast.error("Хатогӣ");
        return;
      }
      toast.success("Захира шуд");
    }
    qc.invalidateQueries({ queryKey: ["bookmark", id] });
    qc.invalidateQueries({ queryKey: ["saved"] });
  }

  if (res.isLoading) return <p className="mx-auto max-w-3xl px-4 py-10 text-muted-foreground">Бор шуда истодааст...</p>;
  const r = res.data;
  if (!r) return <div className="mx-auto max-w-3xl px-4 py-16 text-center">Мавод ёфт нашуд. <Link to="/library" className="text-primary underline">Ба китобхона</Link></div>;

  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      {r.subjects && (
        <Link to="/library/$slug" params={{ slug: r.subjects.slug }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> {r.subjects.name}
        </Link>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="secondary">{kindLabel[r.kind]}</Badge>
        {r.grade && <Badge variant="outline">Синфи {r.grade}</Badge>}
      </div>
      <h1 className="mt-3 text-3xl font-bold">{r.title}</h1>
      {r.author && <p className="mt-1 text-sm text-muted-foreground">{r.author}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={toggle}>
          {bm.data ? <BookmarkCheck /> : <Bookmark />} {bm.data ? "Захирашуда" : "Захира кардан"}
        </Button>
        {r.external_url && (
          <Button asChild size="sm"><a href={r.external_url} target="_blank" rel="noreferrer"><ExternalLink /> Кушодани манбаъ</a></Button>
        )}
        {r.download_url && (
          <Button asChild size="sm" variant="hero"><a href={r.download_url} target="_blank" rel="noreferrer">Боргирӣ</a></Button>
        )}
      </div>
      <div className="mt-8 rounded-2xl border bg-card p-6 text-[17px] shadow-card">
        <MessageResponse>{r.content}</MessageResponse>
      </div>
      {r.license && <p className="mt-4 text-xs text-muted-foreground">Иҷозатнома: {r.license}</p>}
    </article>
  );
}

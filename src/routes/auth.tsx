import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Воридшавӣ | КИТОБХОНАИ МАН" },
      { name: "description", content: "Ба ҳисоби худ ворид шавед ё ҳисоби нав созед." },
      { property: "og:title", content: "Воридшавӣ — КИТОБХОНАИ МАН" },
      { property: "og:description", content: "Воридшавӣ ва бақайдгирӣ." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast.error("Почтаи электронии дуруст ворид кунед");
    if (password.length < 6) return toast.error("Парол бояд на камтар аз 6 аломат бошад");
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error("Почта ё парол нодуруст аст");
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
      if (error) toast.error(error.message);
      else toast.success("Ба почтаи худ нигаред ва суроғаро тасдиқ кунед");
    }
    setBusy(false);
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Воридшавӣ бо Google муяссар нашуд");
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-14">
      <h1 className="text-center text-3xl font-bold">{mode === "in" ? "Воридшавӣ" : "Бақайдгирӣ"}</h1>
      <form onSubmit={submit} className="mt-8 space-y-3 rounded-2xl border bg-card p-6 shadow-card">
        <Input type="email" placeholder="Почтаи электронӣ" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
        <Input type="password" placeholder="Парол" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
        <Button type="submit" className="h-11 w-full" disabled={busy}>{busy ? "..." : mode === "in" ? "Ворид шудан" : "Сохтани ҳисоб"}</Button>
        <Button type="button" variant="outline" className="h-11 w-full" onClick={google}>Идома бо Google</Button>
        <button type="button" className="w-full pt-2 text-sm text-primary" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "Ҳисоб надоред? Бақайдгирӣ" : "Ҳисоб доред? Воридшавӣ"}
        </button>
      </form>
    </div>
  );
}

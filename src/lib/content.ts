import { queryOptions } from "@tanstack/react-query";
import {
  Atom, BookA, BookMarked, BookOpen, Calculator, Code, Cpu, Feather, FlaskConical, Globe,
  GraduationCap, Landmark, Languages, Leaf, Library, Monitor, Scroll, Sigma, Book, type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const subjectIcons: Record<string, LucideIcon> = {
  calculator: Calculator, atom: Atom, flask: FlaskConical, leaf: Leaf, globe: Globe,
  landmark: Landmark, scroll: Scroll, languages: Languages, feather: Feather, "book-a": BookA,
  "book-open": BookOpen, cpu: Cpu, code: Code, monitor: Monitor, "book-marked": BookMarked,
  sigma: Sigma, library: Library, "graduation-cap": GraduationCap, book: Book,
};

export const difficultyLabel: Record<string, string> = {
  easy: "Осон",
  medium: "Миёна",
  hard: "Душвор",
};

export const sourceLabel: Record<string, string> = {
  official: "Расмӣ (ММТ)",
  practice: "Машқӣ",
  ai: "Машқӣ · ЗС",
};

export const kindLabel: Record<string, string> = {
  book: "Китоб",
  notes: "Конспект",
  formula: "Формулаҳо",
  dictionary: "Луғат",
  guide: "Дастур",
  link: "Манбаи берунӣ",
};

export type Subject = { id: string; slug: string; name: string; description: string; icon: string; sort_order: number };

export const subjectsQuery = queryOptions({
  queryKey: ["subjects"],
  queryFn: async () => {
    const { data, error } = await supabase.from("subjects").select("*").order("sort_order");
    if (error) throw error;
    return data as Subject[];
  },
  staleTime: 5 * 60_000,
});

export const clustersQuery = queryOptions({
  queryKey: ["clusters"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("clusters")
      .select("id, name, description, cluster_subjects(subject_id)")
      .order("id");
    if (error) throw error;
    return data.map((c) => ({ ...c, subjectIds: c.cluster_subjects.map((s) => s.subject_id) }));
  },
  staleTime: 5 * 60_000,
});

export const questionCountsQuery = queryOptions({
  queryKey: ["question-counts"],
  queryFn: async () => {
    const { data, error } = await supabase.from("questions").select("subject_id").eq("status", "approved").limit(10000);
    if (error) throw error;
    const counts: Record<string, number> = {};
    for (const r of data) counts[r.subject_id] = (counts[r.subject_id] ?? 0) + 1;
    return counts;
  },
  staleTime: 60_000,
});

export type Question = {
  id: string;
  subject_id: string;
  topic: string;
  grade: number | null;
  difficulty: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  source_type: string;
  source_ref: string;
};

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Score a quiz: answers[i] is the chosen option index (or null) for questions[i]. */
export function scoreQuiz(questions: Pick<Question, "correct_index">[], answers: (number | null)[]) {
  let correct = 0;
  questions.forEach((q, i) => {
    if (answers[i] === q.correct_index) correct++;
  });
  const total = questions.length;
  return { correct, total, percent: total ? Math.round((correct / total) * 100) : 0 };
}

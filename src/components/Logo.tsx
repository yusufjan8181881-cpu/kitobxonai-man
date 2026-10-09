import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("size-9", className)} aria-hidden="true">
      <defs>
        <linearGradient id="lg-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--gold)" />
          <stop offset="1" stopColor="oklch(0.68 0.13 70)" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill="var(--hero)" />
      <path d="M24 10l1.6 3.4 3.7.5-2.7 2.6.7 3.7L24 18.4l-3.3 1.8.7-3.7-2.7-2.6 3.7-.5z" fill="url(#lg-gold)" />
      <path d="M10 22c5-1.8 10-1.2 14 2 4-3.2 9-3.8 14-2v15c-5-1.8-10-1.2-14 2-4-3.2-9-3.8-14-2z" fill="none" stroke="url(#lg-gold)" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M24 24v15" stroke="url(#lg-gold)" strokeWidth="2.4" />
    </svg>
  );
}

export function Logo({ light }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className={cn("font-display text-[15px] font-bold leading-tight tracking-wide sm:text-base", light ? "text-hero-foreground" : "text-foreground")}>
        КИТОБХОНАИ МАН
      </span>
    </span>
  );
}

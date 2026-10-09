import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, LogOut, Shield, Bookmark } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const links = [
  { to: "/", label: "Асосӣ" },
  { to: "/cluster", label: "Кластер" },
  { to: "/library", label: "Китобхона" },
  { to: "/ai", label: "Зеҳни сунъӣ" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" onClick={() => setOpen(false)}>
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              activeProps={{ className: "bg-secondary text-secondary-foreground" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/saved"><Bookmark /> Захираҳо</Link>
              </Button>
              {isAdmin && (
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin"><Shield /> Идора</Link>
                </Button>
              )}
              <Button variant="ghost" size="icon-sm" onClick={signOut} aria-label="Баромад">
                <LogOut />
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Воридшавӣ</Link>
            </Button>
          )}
        </div>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(!open)} aria-label="Меню">
          {open ? <X /> : <Menu />}
        </Button>
      </div>
      {open && (
        <div className="border-t bg-background px-4 pb-4 md:hidden">
          <nav className="flex flex-col py-2">
            {links.map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 font-medium" activeOptions={{ exact: l.to === "/" }} activeProps={{ className: "bg-secondary" }}>
                {l.label}
              </Link>
            ))}
            {user && (
              <Link to="/saved" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 font-medium">Захираҳо</Link>
            )}
            {isAdmin && (
              <Link to="/admin" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 font-medium">Панели идора</Link>
            )}
          </nav>
          {user ? (
            <Button variant="outline" className="w-full" onClick={() => { signOut(); setOpen(false); }}>Баромад</Button>
          ) : (
            <Button asChild className="w-full"><Link to="/auth" onClick={() => setOpen(false)}>Воридшавӣ</Link></Button>
          )}
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t bg-hero text-hero-foreground">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <Logo light />
          <p className="mt-3 text-sm opacity-75">Платформаи таълимӣ барои хонандагон ва довталабони Тоҷикистон.</p>
        </div>
        <div className="text-sm">
          <p className="mb-2 font-semibold text-gold">Бахшҳо</p>
          <ul className="space-y-1.5 opacity-80">
            <li><Link to="/cluster">Кластерҳо ва тестҳо</Link></li>
            <li><Link to="/library">Китобхона</Link></li>
            <li><Link to="/ai">Ёрдамчии зеҳни сунъӣ</Link></li>
          </ul>
        </div>
        <div className="text-sm opacity-80">
          <p className="mb-2 font-semibold text-gold opacity-100">Эзоҳ</p>
          Ҳамаи саволҳои ин сомона маводи машқӣ мебошанд. Маълумоти расмиро аз сомонаи Маркази миллии тестӣ (ntc.tj) гиред.
        </div>
      </div>
    </footer>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  { href: "/reglages/personnes", label: "Personnes" },
  { href: "/reglages/institutions", label: "Établissements" },
  { href: "/reglages/enveloppes", label: "Enveloppes" },
  { href: "/reglages/comptes", label: "Comptes" },
  { href: "/reglages/actifs", label: "Actifs" },
  { href: "/reglages/categories", label: "Catégories" },
];

export default function ReglagesLayout({ children }: LayoutProps<"/reglages">) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col pb-safe">
      <header className="pt-safe px-5 pb-4 pt-6">
        <Link href="/" className="text-sm text-muted transition-colors hover:text-foreground">
          ← Retour
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          Réglages
        </h1>
      </header>
      <nav className="flex gap-2 overflow-x-auto px-5 pb-5 text-sm">
        {sections.map((s) => {
          const actif = pathname?.startsWith(s.href);
          return (
            <Link
              key={s.href}
              href={s.href}
              className={
                actif
                  ? "shrink-0 rounded-full bg-accent px-3.5 py-1.5 font-medium text-accent-foreground"
                  : "shrink-0 rounded-full border border-line px-3.5 py-1.5 text-muted transition-colors hover:text-foreground"
              }
            >
              {s.label}
            </Link>
          );
        })}
      </nav>
      <main className="flex-1 px-5 pb-10">{children}</main>
    </div>
  );
}

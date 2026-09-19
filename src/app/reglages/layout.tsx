import Link from "next/link";

const sections = [
  { href: "/reglages/personnes", label: "Personnes" },
  { href: "/reglages/institutions", label: "Établissements" },
  { href: "/reglages/enveloppes", label: "Enveloppes" },
  { href: "/reglages/comptes", label: "Comptes" },
  { href: "/reglages/actifs", label: "Actifs" },
  { href: "/reglages/categories", label: "Catégories" },
];

export default function ReglagesLayout({ children }: LayoutProps<"/reglages">) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col pb-safe">
      <header className="pt-safe px-5 pb-3 pt-6">
        <Link href="/" className="text-sm text-muted">
          ← Retour
        </Link>
        <h1 className="mt-1 text-xl font-medium text-foreground">Réglages</h1>
      </header>
      <nav className="flex gap-2 overflow-x-auto px-5 pb-4 text-sm">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="shrink-0 rounded-full border border-line px-3 py-1.5 text-foreground"
          >
            {s.label}
          </Link>
        ))}
      </nav>
      <main className="flex-1 px-5 pb-10">{children}</main>
    </div>
  );
}

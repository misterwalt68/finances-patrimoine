import type { SVGProps } from "react";
import { ICONES_CATEGORIE } from "./constants";

function Trait(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    />
  );
}

const TRACES: Record<string, (p: SVGProps<SVGSVGElement>) => React.ReactElement> = {
  courses: (p) => (
    <Trait {...p}>
      <path d="M4 8h16l-1.5 10.5a2 2 0 0 1-2 1.5H7.5a2 2 0 0 1-2-1.5L4 8Z" />
      <path d="M8 8V6a4 4 0 0 1 8 0v2" />
    </Trait>
  ),
  restaurant: (p) => (
    <Trait {...p}>
      <path d="M7 3v7a2 2 0 0 0 2 2v9M7 3v7M10 3v7" />
      <path d="M17 3c-1.5 0-3 1.5-3 4.5S17 12 17 12v9" />
    </Trait>
  ),
  transport: (p) => (
    <Trait {...p}>
      <rect x="4" y="5" width="16" height="12" rx="3" />
      <path d="M4 12h16M8 17v2M16 17v2" />
      <circle cx="8" cy="14" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="16" cy="14" r="0.6" fill="currentColor" stroke="none" />
    </Trait>
  ),
  maison: (p) => (
    <Trait {...p}>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 10v9h12v-9" />
    </Trait>
  ),
  vetements: (p) => (
    <Trait {...p}>
      <path d="M9 4c0 1.5 1.3 2.5 3 2.5S15 5.5 15 4" />
      <path d="M9 4 4 7l2 3 2-1.2V20h8V8.8L18 10l2-3-5-3" />
    </Trait>
  ),
  loisirs: (p) => (
    <Trait {...p}>
      <rect x="3" y="8" width="18" height="10" rx="4" />
      <path d="M7 13h3M8.5 11.5v3" />
      <circle cx="15" cy="12" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="17" cy="14.5" r="0.7" fill="currentColor" stroke="none" />
    </Trait>
  ),
  sante: (p) => (
    <Trait {...p}>
      <path d="M12 20.5S4 15 4 9.3A4.3 4.3 0 0 1 12 6a4.3 4.3 0 0 1 8 3.3C20 15 12 20.5 12 20.5Z" />
      <path d="M9.5 10h2v-2h1v2h2v1h-2v2h-1v-2h-2Z" fill="currentColor" stroke="none" />
    </Trait>
  ),
  abonnement: (p) => (
    <Trait {...p}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </Trait>
  ),
  energie: (p) => (
    <Trait {...p}>
      <path d="m13 2-8 12h6l-1 8 8-12h-6l1-8Z" />
    </Trait>
  ),
  voyage: (p) => (
    <Trait {...p}>
      <path d="M3 13l7-2 6-8 2 1-3.5 8L21 11l1 2-7 2-2 6-2-1 1-5-4 1-2-2 4-1Z" />
    </Trait>
  ),
  cadeau: (p) => (
    <Trait {...p}>
      <rect x="4" y="9" width="16" height="11" rx="1" />
      <path d="M4 9h16v4H4zM12 9v11" />
      <path d="M12 9C10 9 8 8 8 6a2 2 0 0 1 4 0c0-2 2-3 4-3a2 2 0 0 1 0 4c1.5 0 4 0 4 2" />
    </Trait>
  ),
  autre: (p) => (
    <Trait {...p}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </Trait>
  ),
};

export function IconeCategorie({ icone, className }: { icone?: string | null; className?: string }) {
  const Trace = (icone && TRACES[icone]) || TRACES.autre;
  return <Trace className={className ?? "h-5 w-5"} />;
}

export const OPTIONS_ICONE_CATEGORIE = ICONES_CATEGORIE;

"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

const SEUIL_DECLENCHEMENT = 70; // px de tirage avant que le relâchement déclenche l'actualisation
const TIRAGE_MAX = 110; // px — au-delà, le doigt continue de bouger mais l'indicateur ne grandit plus

/**
 * "Tirer pour actualiser" façon appli mobile — remplace le bouton "Actualiser
 * les cours" du header (demande de Maxime). Le pull-to-refresh natif du
 * navigateur n'est pas fiable une fois l'app installée en PWA (souvent
 * désactivé en mode standalone), donc le geste est entièrement reconstruit
 * ici : `touchmove` est écouté nativement (pas en JSX) avec `passive: false`,
 * seul moyen fiable d'appeler `preventDefault()` pendant le tirage.
 */
export function TirerPourActualiser({
  action,
  children,
}: {
  /** Server action à lancer au relâchement — reçoit zéro argument. */
  action: () => Promise<void>;
  children: ReactNode;
}) {
  const conteneurRef = useRef<HTMLDivElement>(null);
  const [tirage, setTirage] = useState(0);
  const [enCours, setEnCours] = useState(false);
  const debutY = useRef<number | null>(null);
  const router = useRouter();

  const relacher = useCallback(async () => {
    const declenche = debutY.current !== null && tirage >= SEUIL_DECLENCHEMENT;
    debutY.current = null;
    if (!declenche) {
      setTirage(0);
      return;
    }
    setEnCours(true);
    setTirage(SEUIL_DECLENCHEMENT);
    try {
      await action();
      router.refresh();
    } finally {
      setEnCours(false);
      setTirage(0);
    }
  }, [tirage, action, router]);

  useEffect(() => {
    const el = conteneurRef.current;
    if (!el) return;

    function toucherDebut(e: TouchEvent) {
      if (window.scrollY > 0 || enCours) {
        debutY.current = null;
        return;
      }
      debutY.current = e.touches[0].clientY;
    }

    function toucherDeplacer(e: TouchEvent) {
      if (debutY.current === null || enCours) return;
      const delta = e.touches[0].clientY - debutY.current;
      if (delta <= 0) {
        setTirage(0);
        return;
      }
      // Résistance progressive façon iOS : le tirage ralentit à mesure qu'il
      // approche du maximum, au lieu de suivre le doigt 1:1.
      const amorti = Math.min(TIRAGE_MAX, delta * 0.5);
      setTirage(amorti);
      e.preventDefault();
    }

    function toucherFin() {
      relacher();
    }

    el.addEventListener("touchstart", toucherDebut, { passive: true });
    el.addEventListener("touchmove", toucherDeplacer, { passive: false });
    el.addEventListener("touchend", toucherFin, { passive: true });
    el.addEventListener("touchcancel", toucherFin, { passive: true });
    return () => {
      el.removeEventListener("touchstart", toucherDebut);
      el.removeEventListener("touchmove", toucherDeplacer);
      el.removeEventListener("touchend", toucherFin);
      el.removeEventListener("touchcancel", toucherFin);
    };
  }, [enCours, relacher]);

  const progres = Math.min(1, tirage / SEUIL_DECLENCHEMENT);

  return (
    <div ref={conteneurRef}>
      <div
        className="flex items-center justify-center overflow-hidden"
        style={{ height: tirage, transition: enCours || tirage === 0 ? "height 0.2s ease-out" : "none" }}
      >
        <svg
          viewBox="0 0 24 24"
          className={`h-5 w-5 text-muted ${enCours ? "animate-spin" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        >
          <path
            d="M20 12a8 8 0 1 1-2.34-5.66"
            style={enCours ? undefined : { opacity: 0.25 + progres * 0.75 }}
          />
        </svg>
      </div>
      {children}
    </div>
  );
}

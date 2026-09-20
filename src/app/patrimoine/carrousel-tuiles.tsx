"use client";

import { useRef, useState, type ReactNode } from "react";

/**
 * Glissement horizontal type "story" entre plusieurs tuiles (camembert,
 * évolution dans le temps…) — scroll-snap natif plutôt qu'une librairie de
 * carrousel, pour un geste tactile fluide sans JS de calcul de position.
 */
export function CarrouselTuiles({ tuiles }: { tuiles: ReactNode[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  function onScroll() {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  return (
    <div>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tuiles.map((tuile, i) => (
          <div key={i} className="w-full shrink-0 snap-center">
            {tuile}
          </div>
        ))}
      </div>
      {tuiles.length > 1 && (
        <div className="mt-2 flex justify-center gap-1.5">
          {tuiles.map((_, i) => (
            <span
              key={i}
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full transition-colors ${i === index ? "bg-foreground" : "bg-line"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

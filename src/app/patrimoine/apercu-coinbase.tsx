"use client";

import { useActionState } from "react";
import { Carte } from "@/components/ui/carte";
import { synchroniserCoinbase, type EtatSyncCoinbase } from "./actions";

const etatInitial: EtatSyncCoinbase = { statut: "repos" };

export function ApercuCoinbase() {
  const [etat, lancer, enCours] = useActionState(
    () => synchroniserCoinbase(),
    etatInitial,
  );

  return (
    <Carte>
      <div className="flex items-center justify-between">
        <p className="font-medium text-foreground">Coinbase</p>
        <form action={lancer}>
          <button
            type="submit"
            disabled={enCours}
            className="rounded-full border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground disabled:opacity-60"
          >
            {enCours ? "Synchronisation…" : "Synchroniser"}
          </button>
        </form>
      </div>

      {etat.statut === "erreur" && (
        <p className="mt-3 text-sm text-negative">{etat.message}</p>
      )}

      {etat.statut === "ok" && (
        <p className="mt-3 text-sm text-muted">
          {etat.nombre} position{etat.nombre > 1 ? "s" : ""} mise{etat.nombre > 1 ? "s" : ""} à
          jour.
          {etat.ignores.length > 0 && (
            <> Ignoré (introuvable sur CoinGecko) : {etat.ignores.join(", ")}.</>
          )}
        </p>
      )}

      {etat.statut === "repos" && (
        <p className="mt-3 text-sm text-muted">
          Lecture seule côté Coinbase — crée ou met à jour tes positions crypto ci-dessous.
        </p>
      )}
    </Carte>
  );
}

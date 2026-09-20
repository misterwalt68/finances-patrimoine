"use client";

import { useActionState, useState } from "react";
import { Champ, ChampSelect } from "@/components/ui/champ";
import { Bouton } from "@/components/ui/bouton";
import { Badge } from "@/components/ui/carte";
import { PERIODICITES_CHARGE } from "@/lib/constants";
import { modifierChargeRevenu, supprimerChargeRevenu } from "./actions";
import { GraphiqueEvolutionMontant, type PointMontant } from "./graphique-evolution-montant";

type Personne = { id: string; libelle: string };

type ChargeRevenu = {
  id: string;
  libelle: string;
  periodicite: string;
  personneId: string;
  fournisseur: string | null;
  numeroClient: string | null;
  lienSuivi: string | null;
  note: string | null;
};

const MOT_CONFIRMATION = "SUPPRIMER";

const formatEur = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const libellePeriodicite = (v: string) => PERIODICITES_CHARGE.find((p) => p.value === v)?.label ?? v;

export function LigneChargeRevenu({
  charge,
  montantMensualise,
  dernierMontant,
  historique,
  personnes,
  personneLibelle,
}: {
  charge: ChargeRevenu;
  montantMensualise: number;
  dernierMontant: number;
  historique: PointMontant[];
  personnes: Personne[];
  personneLibelle: string;
}) {
  const [ouvertEdition, setOuvertEdition] = useState(false);
  const [vue, setVue] = useState<"edition" | "suppression">("edition");
  const [saisieSuppression, setSaisieSuppression] = useState("");
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);

  const [, lancerEdition] = useActionState(async (_etat: null, formData: FormData) => {
    await modifierChargeRevenu(formData);
    fermer();
    return null;
  }, null);

  function fermer() {
    setOuvertEdition(false);
    setVue("edition");
    setSaisieSuppression("");
  }

  const peutConfirmerSuppression = saisieSuppression.trim().toUpperCase() === MOT_CONFIRMATION;

  async function confirmerSuppression() {
    setSuppressionEnCours(true);
    await supprimerChargeRevenu(charge.id);
    setSuppressionEnCours(false);
    fermer();
  }

  const infosPratiques = [
    charge.fournisseur && { label: "Fournisseur", valeur: charge.fournisseur },
    charge.numeroClient && { label: "Numéro client", valeur: charge.numeroClient },
  ].filter(Boolean) as { label: string; valeur: string }[];

  return (
    <li className="py-3">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <div>
            <p className="font-medium text-foreground">{charge.libelle}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge>{libellePeriodicite(charge.periodicite)}</Badge>
              <Badge>{personneLibelle}</Badge>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="font-medium text-foreground">{formatEur(montantMensualise)}/mois</span>
            <span className="text-muted transition-transform group-open:rotate-180">▾</span>
          </div>
        </summary>

        <div className="mt-3 space-y-3 border-t border-line pt-3">
          {charge.periodicite === "annuel" && (
            <p className="text-xs text-muted">{formatEur(dernierMontant)} par an, ramené au mois.</p>
          )}

          <GraphiqueEvolutionMontant points={historique} />

          {(infosPratiques.length > 0 || charge.lienSuivi || charge.note) && (
            <div className="space-y-1 rounded-lg border border-line bg-background px-3 py-2 text-sm">
              {infosPratiques.map((info) => (
                <p key={info.label}>
                  <span className="text-muted">{info.label} : </span>
                  <span className="text-foreground">{info.valeur}</span>
                </p>
              ))}
              {charge.lienSuivi && (
                <p>
                  <span className="text-muted">Suivi : </span>
                  <a href={charge.lienSuivi} target="_blank" rel="noreferrer" className="text-accent underline">
                    {charge.lienSuivi}
                  </a>
                </p>
              )}
              {charge.note && <p className="text-muted">{charge.note}</p>}
            </div>
          )}

          <button
            type="button"
            onClick={() => setOuvertEdition(true)}
            className="text-sm text-muted underline transition-colors hover:text-foreground"
          >
            Modifier
          </button>
        </div>
      </details>

      {ouvertEdition && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center" onClick={fermer}>
          <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-4" onClick={(e) => e.stopPropagation()}>
            {vue === "edition" ? (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-medium text-foreground">Modifier {charge.libelle}</p>
                  <button type="button" onClick={fermer} aria-label="Fermer" className="rounded p-1 text-muted transition-colors hover:text-foreground">
                    ✕
                  </button>
                </div>
                <form action={lancerEdition} className="space-y-3">
                  <input type="hidden" name="id" value={charge.id} />
                  <Champ label="Libellé" name="libelle" defaultValue={charge.libelle} required />
                  <ChampSelect label="Périodicité" name="periodicite" defaultValue={charge.periodicite} required>
                    {PERIODICITES_CHARGE.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </ChampSelect>
                  <ChampSelect label="Personne" name="personneId" defaultValue={charge.personneId} required>
                    {personnes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.libelle}
                      </option>
                    ))}
                  </ChampSelect>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Champ
                        label="Montant (€)"
                        name="montant"
                        type="number"
                        inputMode="decimal"
                        step="any"
                        defaultValue={dernierMontant}
                        required
                      />
                    </div>
                    <div className="flex-1">
                      <Champ
                        label="Depuis le"
                        name="dateEffet"
                        type="date"
                        defaultValue={new Date().toISOString().slice(0, 10)}
                        required
                      />
                    </div>
                  </div>
                  <Champ label="Fournisseur (optionnel)" name="fournisseur" defaultValue={charge.fournisseur ?? ""} />
                  <Champ label="Numéro client (optionnel)" name="numeroClient" defaultValue={charge.numeroClient ?? ""} />
                  <Champ label="Lien de suivi (optionnel)" name="lienSuivi" type="url" defaultValue={charge.lienSuivi ?? ""} />
                  <Champ label="Note (optionnel)" name="note" defaultValue={charge.note ?? ""} />
                  <Bouton type="submit" className="w-full">
                    Enregistrer
                  </Bouton>
                </form>
                <button type="button" onClick={() => setVue("suppression")} className="mt-3 w-full text-center text-sm text-negative">
                  Supprimer cette ligne
                </button>
              </>
            ) : (
              <>
                <p className="font-medium text-foreground">Supprimer {charge.libelle} ?</p>
                <p className="mt-1 text-sm text-muted">
                  Cette action est irréversible, avec tout son historique. Tape{" "}
                  <span className="font-mono text-foreground">{MOT_CONFIRMATION}</span> pour confirmer.
                </p>
                <input
                  autoFocus
                  value={saisieSuppression}
                  onChange={(e) => setSaisieSuppression(e.target.value)}
                  placeholder={MOT_CONFIRMATION}
                  className="mt-3 h-11 w-full rounded-lg border border-line bg-background px-4 text-base text-foreground outline-none focus:border-accent"
                />
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => setVue("edition")} className="h-11 flex-1 rounded-lg border border-line text-sm text-foreground">
                    Retour
                  </button>
                  <button
                    type="button"
                    disabled={!peutConfirmerSuppression || suppressionEnCours}
                    onClick={confirmerSuppression}
                    className="h-11 flex-1 rounded-lg bg-negative text-sm font-medium text-white disabled:opacity-40"
                  >
                    {suppressionEnCours ? "Suppression…" : "Supprimer"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

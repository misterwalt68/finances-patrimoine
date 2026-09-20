"use client";

import { useActionState, useMemo, useState } from "react";
import { Champ, ChampSelect } from "@/components/ui/champ";
import { Bouton } from "@/components/ui/bouton";
import { modifierPosition, supprimerPosition } from "./actions";

type Compte = { id: string; libelle: string; institutionId: string };
type Institution = { id: string; nom: string };
type Position = {
  id: string;
  compteId: string;
  quantite: string;
  prixRevientMoyen: string | null;
  note: string | null;
  dateAcquisition: string | null;
};

const MOT_CONFIRMATION = "SUPPRIMER";

/**
 * Un seul bouton (crayon) pour modifier une position ou la supprimer — la
 * suppression reprend telle quelle l'ancienne confirmation par saisie de
 * texte (SupprimerPositionBouton), simplement déplacée dans cette modale à
 * la demande de Maxime plutôt que d'avoir un deuxième bouton sur la ligne.
 */
const formatEur = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function ModifierPositionBouton({
  position,
  actifLibelle,
  actifType,
  sourcePrix,
  valeurActuelle,
  performance,
  listeComptes,
  listeInstitutions,
}: {
  position: Position;
  actifLibelle: string;
  actifType?: string;
  sourcePrix?: string;
  /** Valeur et performance déjà calculées côté page — juste pour affichage, jamais soumises. */
  valeurActuelle?: number;
  performance?: number;
  listeComptes: Compte[];
  listeInstitutions: Institution[];
}) {
  const [ouvert, setOuvert] = useState(false);
  const [vue, setVue] = useState<"edition" | "suppression">("edition");
  const [saisieSuppression, setSaisieSuppression] = useState("");
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);

  // "securite" (ex. Livret A) suit exactement les mêmes règles qu'un compte
  // cash : un seul solde, pas de quantité ni de notion d'achat.
  const estCash = actifType === "cash" || actifType === "securite";
  // Un compte cash relié en DSP2 (BoursoBank, Trade Republic) a son solde
  // géré automatiquement à chaque actualisation — rien à saisir ici. Un
  // compte cash "manuel" (ex. Livret A, hors DSP2) a besoin d'une saisie de
  // solde ; comme pour tout actif à cours manuel (ex. Assurance-vie), ce
  // nouveau solde/valeur devient un nouveau point d'historique (`cours`),
  // pas seulement une correction du prix de revient.
  const estValeurManuelle = sourcePrix === "manuel";
  // Une ligne "à contexte fixe" (un compte bancaire, une assurance-vie…) n'a
  // ni quantité, ni compte à choisir, ni date d'achat qui aient un sens —
  // c'est toujours le même compte réel, une seule "part" possédée, sans
  // notion d'achat ponctuel. Ne s'applique jamais à un actif "normal"
  // (action, ETF, crypto, métal), où ces champs restent utiles.
  const estContexteFixe = estCash || estValeurManuelle;
  const labelPrixRevient = estValeurManuelle ? "Montant investi au total (€)" : "Prix de revient moyen (€, optionnel)";

  const apports = valeurActuelle !== undefined && performance !== undefined ? valeurActuelle - performance : undefined;
  const performancePct = apports !== undefined && performance !== undefined && apports !== 0 ? (performance / apports) * 100 : null;

  const institutionsParId = useMemo(
    () => new Map(listeInstitutions.map((i) => [i.id, i])),
    [listeInstitutions],
  );

  const [, lancer] = useActionState(async (_etat: null, formData: FormData) => {
    await modifierPosition(formData);
    fermer();
    return null;
  }, null);

  function fermer() {
    setOuvert(false);
    setVue("edition");
    setSaisieSuppression("");
  }

  const peutConfirmerSuppression = saisieSuppression.trim().toUpperCase() === MOT_CONFIRMATION;

  async function confirmerSuppression() {
    setSuppressionEnCours(true);
    await supprimerPosition(position.id);
    setSuppressionEnCours(false);
    fermer();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        aria-label={`Modifier ${actifLibelle}`}
        className="rounded p-1 text-xs text-muted transition-colors hover:text-foreground"
      >
        ✎
      </button>

      {ouvert && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={fermer}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-line bg-surface p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {vue === "edition" ? (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-medium text-foreground">Modifier {actifLibelle}</p>
                  <button
                    type="button"
                    onClick={fermer}
                    aria-label="Fermer"
                    className="rounded p-1 text-muted transition-colors hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>
                {estValeurManuelle && valeurActuelle !== undefined && performance !== undefined && (
                  <div className="mb-3 rounded-lg border border-line bg-background px-3 py-2">
                    <p className="text-xs text-muted">Valeur actuelle enregistrée</p>
                    <p className="flex items-baseline gap-2">
                      <span className="text-lg font-semibold text-foreground">{formatEur(valeurActuelle)}</span>
                      <span className={`text-sm ${performance >= 0 ? "text-positive" : "text-negative"}`}>
                        {performance >= 0 ? "▲" : "▼"}
                        {performancePct !== null && <> {Math.abs(performancePct).toFixed(2)}% ·</>}{" "}
                        {performance >= 0 ? "+" : ""}
                        {formatEur(performance)}
                      </span>
                    </p>
                  </div>
                )}
                <form action={lancer} className="space-y-3">
                  <input type="hidden" name="id" value={position.id} />
                  {estContexteFixe ? (
                    <input type="hidden" name="compteId" value={position.compteId} />
                  ) : (
                    <ChampSelect label="Compte" name="compteId" defaultValue={position.compteId} required>
                      {listeComptes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.libelle} · {institutionsParId.get(c.institutionId)?.nom}
                        </option>
                      ))}
                    </ChampSelect>
                  )}
                  {!estContexteFixe && (
                    <Champ
                      label="Quantité"
                      name="quantite"
                      type="number"
                      inputMode="decimal"
                      step="any"
                      defaultValue={position.quantite}
                      required
                    />
                  )}
                  {estValeurManuelle && (
                    <Champ
                      label={estCash ? "Solde actuel (€)" : "Nouvelle valeur actuelle (€)"}
                      name="valeurActuelle"
                      type="number"
                      inputMode="decimal"
                      step="any"
                      autoFocus
                      defaultValue={valeurActuelle !== undefined ? String(valeurActuelle) : (position.prixRevientMoyen ?? "")}
                      required={estCash}
                    />
                  )}
                  {!estCash && (
                    <Champ
                      label={labelPrixRevient}
                      name="prixRevientMoyen"
                      type="number"
                      inputMode="decimal"
                      step="any"
                      defaultValue={position.prixRevientMoyen ?? ""}
                    />
                  )}
                  <Champ
                    label="Description (optionnel)"
                    name="note"
                    placeholder="Note libre…"
                    defaultValue={position.note ?? ""}
                  />
                  {!estContexteFixe && (
                    <Champ
                      label="Date d'achat (optionnel)"
                      name="dateAcquisition"
                      type="date"
                      defaultValue={position.dateAcquisition ?? ""}
                    />
                  )}
                  <Bouton type="submit" className="w-full">
                    Enregistrer
                  </Bouton>
                </form>
                <button
                  type="button"
                  onClick={() => setVue("suppression")}
                  className="mt-3 w-full text-center text-sm text-negative"
                >
                  Supprimer cette position
                </button>
              </>
            ) : (
              <>
                <p className="font-medium text-foreground">Supprimer {actifLibelle} ?</p>
                <p className="mt-1 text-sm text-muted">
                  Cette action est irréversible. Tape{" "}
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
                  <button
                    type="button"
                    onClick={() => setVue("edition")}
                    className="h-11 flex-1 rounded-lg border border-line text-sm text-foreground"
                  >
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
    </>
  );
}

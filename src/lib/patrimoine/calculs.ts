/**
 * Séparation apports / performance et TRI — SPEC.md §4 et §7 :
 * "tu as mis X de ta poche, l'argent a généré Y tout seul".
 */

export function separerApportsEtPerformance(params: {
  quantite: number;
  prixRevientMoyen: number;
  dernierCours: number;
}) {
  const apports = params.quantite * params.prixRevientMoyen;
  const valeurActuelle = params.quantite * params.dernierCours;
  return {
    apports,
    valeurActuelle,
    performance: valeurActuelle - apports,
  };
}

export type FluxTresorerie = {
  date: Date;
  /** Négatif = argent sorti de la poche (achat, apport). Positif = argent reçu (vente, valeur finale). */
  montant: number;
};

const JOUR_EN_MS = 1000 * 60 * 60 * 24;
const ANNEE_EN_JOURS = 365;

function valeurActualisee(flux: FluxTresorerie[], taux: number, origine: number): number {
  return flux.reduce((somme, f) => {
    const annees = (f.date.getTime() - origine) / JOUR_EN_MS / ANNEE_EN_JOURS;
    return somme + f.montant / Math.pow(1 + taux, annees);
  }, 0);
}

function deriveeValeurActualisee(flux: FluxTresorerie[], taux: number, origine: number): number {
  return flux.reduce((somme, f) => {
    const annees = (f.date.getTime() - origine) / JOUR_EN_MS / ANNEE_EN_JOURS;
    if (annees === 0) return somme;
    return somme - (annees * f.montant) / Math.pow(1 + taux, annees + 1);
  }, 0);
}

/**
 * TRI annualisé (XIRR) par Newton-Raphson, avec repli par bissection si ça ne
 * converge pas. Retourne `null` si le calcul n'a pas de sens (moins de deux
 * flux, ou pas de signe positif ET négatif parmi les flux).
 */
export function calculerTRI(flux: FluxTresorerie[]): number | null {
  if (flux.length < 2) return null;

  const aUnFluxPositif = flux.some((f) => f.montant > 0);
  const aUnFluxNegatif = flux.some((f) => f.montant < 0);
  if (!aUnFluxPositif || !aUnFluxNegatif) return null;

  const triee = [...flux].sort((a, b) => a.date.getTime() - b.date.getTime());
  const origine = triee[0].date.getTime();

  let taux = 0.1;
  for (let i = 0; i < 100; i++) {
    const v = valeurActualisee(triee, taux, origine);
    const dv = deriveeValeurActualisee(triee, taux, origine);
    if (Math.abs(dv) < 1e-10) break;
    const nouveauTaux = taux - v / dv;
    if (!Number.isFinite(nouveauTaux) || nouveauTaux <= -1) break;
    if (Math.abs(nouveauTaux - taux) < 1e-7) return nouveauTaux;
    taux = nouveauTaux;
  }

  // Repli par bissection sur une plage large (-99.9% à +1000% annualisé),
  // au cas où Newton-Raphson diverge (flux inhabituels).
  let bas = -0.999;
  let haut = 10;
  const signeBas = Math.sign(valeurActualisee(triee, bas, origine));
  const signeHaut = Math.sign(valeurActualisee(triee, haut, origine));
  if (signeBas === signeHaut) return null;

  for (let i = 0; i < 200; i++) {
    const milieu = (bas + haut) / 2;
    const v = valeurActualisee(triee, milieu, origine);
    if (Math.abs(v) < 1e-6) return milieu;
    if (Math.sign(v) === signeBas) {
      bas = milieu;
    } else {
      haut = milieu;
    }
  }
  return (bas + haut) / 2;
}

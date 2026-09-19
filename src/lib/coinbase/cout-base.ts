import type { TransactionCoinbase } from "./client";

/**
 * Prix de revient moyen d'une crypto Coinbase, calculé à partir de son
 * historique réel de transactions (méthode du coût moyen pondéré) —
 * Coinbase ne fournit pas de prix de revient directement sur `/v2/accounts`.
 *
 * Principe : une acquisition (achat, conversion entrante, réception externe)
 * ajoute sa quantité et son coût réel (`montantNatifEur`, la valeur en euros
 * au moment de la transaction). Une sortie (vente, conversion sortante,
 * envoi externe) retire la quantité sortie au coût unitaire moyen *courant*,
 * pas à la valeur de la transaction — le coût de ce qui reste ne doit
 * dépendre que de ce qui a été payé pour l'acquérir, pas du prix auquel une
 * partie a ensuite été vendue ailleurs. Les récompenses de staking et les
 * gains "Earn" sont ajoutés à coût nul (Maxime n'a rien déboursé pour les
 * obtenir) — c'est ce qui fait qu'un solde entièrement gagné via
 * staking/Earn ressort avec un apport de 0€, donc 100% de plus-value : c'est
 * la réalité, pas un bug.
 *
 * Approximation assumée (comme le taux EUR/USD historique des métaux) :
 * coût moyen pondéré, pas un suivi précis par lot (FIFO/LIFO) — largement
 * suffisant pour un usage personnel, pas un outil de déclaration fiscale.
 */
export function calculerCoutBaseMoyen(transactions: TransactionCoinbase[]): {
  quantite: number;
  coutTotal: number;
  coutUnitaire: number;
} {
  const triees = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());

  let quantite = 0;
  let coutTotal = 0;

  for (const t of triees) {
    if (t.type === "staking_reward" || t.type === "earn_payout") {
      quantite += t.montant;
      continue;
    }

    if (t.montant >= 0) {
      quantite += t.montant;
      coutTotal += t.montantNatifEur;
      continue;
    }

    const quantiteSortante = -t.montant;
    const coutUnitaireCourant = quantite > 0 ? coutTotal / quantite : 0;
    coutTotal -= quantiteSortante * coutUnitaireCourant;
    quantite -= quantiteSortante;
  }

  // Le solde ne peut pas être négatif ni le coût — garde-fou contre un
  // historique incomplet (transaction antérieure au rattachement de la clé
  // API, par exemple) plutôt que d'afficher un prix de revient absurde.
  quantite = Math.max(0, quantite);
  coutTotal = Math.max(0, coutTotal);

  return { quantite, coutTotal, coutUnitaire: quantite > 0 ? coutTotal / quantite : 0 };
}

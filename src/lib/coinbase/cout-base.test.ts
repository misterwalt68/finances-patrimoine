import { describe, expect, it } from "vitest";
import { calculerCoutBaseMoyen } from "./cout-base";

function tx(type: string, montant: number, montantNatifEur: number, date: string) {
  return { type, montant, montantNatifEur, date: new Date(date) };
}

describe("calculerCoutBaseMoyen", () => {
  it("un seul achat donne un coût unitaire simple", () => {
    const r = calculerCoutBaseMoyen([tx("buy", 100, 65, "2021-01-01")]);
    expect(r.quantite).toBe(100);
    expect(r.coutTotal).toBe(65);
    expect(r.coutUnitaire).toBeCloseTo(0.65, 6);
  });

  it("une récompense de staking n'ajoute aucun coût", () => {
    const r = calculerCoutBaseMoyen([tx("staking_reward", 1, 0, "2026-01-01")]);
    expect(r.quantite).toBe(1);
    expect(r.coutTotal).toBe(0);
    expect(r.coutUnitaire).toBe(0);
  });

  it("une sortie retire au coût moyen courant, pas à sa propre valeur", () => {
    // Achète 10 à 100€ (coût unitaire 10€), puis en revend 4 pour 60€ (valeur
    // de vente sans rapport avec le coût moyen). Il doit rester 6 unités et
    // un coût total de 60€ (6 × 10€), pas 40€ (100€ - 60€ de vente).
    const r = calculerCoutBaseMoyen([
      tx("buy", 10, 100, "2021-01-01"),
      tx("sell", -4, -60, "2021-02-01"),
    ]);
    expect(r.quantite).toBe(6);
    expect(r.coutTotal).toBeCloseTo(60, 6);
    expect(r.coutUnitaire).toBeCloseTo(10, 6);
  });

  it("dilue le coût moyen quand des récompenses gratuites s'ajoutent à un solde acheté", () => {
    // Achète 10 à 100€ (10€/unité), puis reçoit 10 gratuites (staking) :
    // même coût total (100€) réparti sur deux fois plus d'unités → 5€/unité.
    const r = calculerCoutBaseMoyen([
      tx("buy", 10, 100, "2021-01-01"),
      tx("staking_reward", 10, 0, "2021-06-01"),
    ]);
    expect(r.quantite).toBe(20);
    expect(r.coutTotal).toBeCloseTo(100, 6);
    expect(r.coutUnitaire).toBeCloseTo(5, 6);
  });

  it("un envoi externe (send) sortant réduit le coût comme une vente", () => {
    const r = calculerCoutBaseMoyen([
      tx("buy", 1, 1000, "2018-01-01"),
      tx("send", -0.5, -600, "2018-06-01"),
    ]);
    expect(r.quantite).toBeCloseTo(0.5, 6);
    expect(r.coutTotal).toBeCloseTo(500, 6);
  });

  it("l'ordre chronologique d'entrée n'a pas d'importance, seul l'ordre des dates compte", () => {
    const enOrdre = calculerCoutBaseMoyen([
      tx("buy", 10, 100, "2021-01-01"),
      tx("staking_reward", 10, 0, "2021-06-01"),
    ]);
    const inversees = calculerCoutBaseMoyen([
      tx("staking_reward", 10, 0, "2021-06-01"),
      tx("buy", 10, 100, "2021-01-01"),
    ]);
    expect(inversees).toEqual(enOrdre);
  });

  it("ne descend jamais sous zéro même avec un historique incomplet", () => {
    // Une sortie sans acquisition connue avant (ex. clé API rattachée après
    // le début de l'historique réel) ne doit pas produire une quantité ou un
    // coût négatif.
    const r = calculerCoutBaseMoyen([tx("sell", -5, -50, "2020-01-01")]);
    expect(r.quantite).toBe(0);
    expect(r.coutTotal).toBe(0);
    expect(r.coutUnitaire).toBe(0);
  });

  it("liste vide donne un coût nul", () => {
    const r = calculerCoutBaseMoyen([]);
    expect(r).toEqual({ quantite: 0, coutTotal: 0, coutUnitaire: 0 });
  });
});

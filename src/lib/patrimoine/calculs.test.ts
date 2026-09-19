import { describe, expect, it } from "vitest";
import { calculerTRI, separerApportsEtPerformance } from "./calculs";

describe("separerApportsEtPerformance", () => {
  it("sépare correctement apports et performance en gain", () => {
    const r = separerApportsEtPerformance({
      quantite: 10,
      prixRevientMoyen: 100,
      dernierCours: 120,
    });
    expect(r.apports).toBe(1000);
    expect(r.valeurActuelle).toBe(1200);
    expect(r.performance).toBe(200);
  });

  it("gère une position en perte", () => {
    const r = separerApportsEtPerformance({
      quantite: 5,
      prixRevientMoyen: 200,
      dernierCours: 150,
    });
    expect(r.apports).toBe(1000);
    expect(r.valeurActuelle).toBe(750);
    expect(r.performance).toBe(-250);
  });
});

describe("calculerTRI", () => {
  it("retourne ~10% pour un placement simple sur un an", () => {
    // 1000€ investis, revalorisés à 1100€ un an plus tard : TRI = 10%.
    const tri = calculerTRI([
      { date: new Date("2024-01-01"), montant: -1000 },
      { date: new Date("2025-01-01"), montant: 1100 },
    ]);
    expect(tri).not.toBeNull();
    expect(tri!).toBeCloseTo(0.1, 2);
  });

  it("gère plusieurs apports échelonnés (plan d'investissement programmé)", () => {
    // 100€/mois pendant 12 mois, valeur finale 1300€ (gain net de 100€ sur 1200€ apportés).
    const flux = Array.from({ length: 12 }, (_, i) => ({
      date: new Date(2024, i, 1),
      montant: -100,
    }));
    flux.push({ date: new Date(2025, 0, 1), montant: 1300 });

    const tri = calculerTRI(flux);
    expect(tri).not.toBeNull();
    expect(tri!).toBeGreaterThan(0);
  });

  it("retourne null sans flux positif et négatif à la fois", () => {
    expect(
      calculerTRI([
        { date: new Date("2024-01-01"), montant: -1000 },
        { date: new Date("2024-06-01"), montant: -500 },
      ]),
    ).toBeNull();
  });

  it("retourne null avec moins de deux flux", () => {
    expect(calculerTRI([{ date: new Date(), montant: -1000 }])).toBeNull();
  });
});

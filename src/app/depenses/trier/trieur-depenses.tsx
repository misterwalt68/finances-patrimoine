"use client";

import { forwardRef, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useRouter } from "next/navigation";
import { Champ } from "@/components/ui/champ";
import { Bouton } from "@/components/ui/bouton";
import { SelecteurIconeCategorie } from "@/components/ui/selecteur-icone";
import { IconeCategorie } from "@/lib/icones-categorie";
import { categoriserTransaction, creerCategorieEtCategoriser } from "../actions";
import { modifierCategorie } from "@/app/reglages/categories/actions";

type TransactionLegere = { id: string; commercant: string | null; montant: number; date: string };
type CategorieAvecTransactions = {
  id: string;
  libelle: string;
  icone: string | null;
  transactions: TransactionLegere[];
};

const CIBLE_AJOUTER = "__ajouter__";
const SEUIL_DEPOT = 70; // px de tirage avant qu'une catégorie soit considérée comme ciblée

const formatEur = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

/**
 * Pile façon "cartes à trier" : la carte du dessus se glisse au doigt (ou à
 * la souris) vers une bulle de catégorie pour la classer, ou vers "Ajouter
 * une catégorie" pour en créer une à la volée. Événements pointer plutôt que
 * le drag-and-drop HTML5 — ce dernier ne fonctionne pas de façon fiable au
 * toucher sur iOS Safari (même choix que le tirer-pour-actualiser, avant
 * qu'il ne soit remplacé par un bouton).
 */
export function TrieurDepenses({
  pileInitiale,
  categoriesInitiales,
  compteursInitiaux,
}: {
  pileInitiale: TransactionLegere[];
  categoriesInitiales: CategorieAvecTransactions[];
  compteursInitiaux: Record<string, number>;
}) {
  const router = useRouter();
  const [pile, setPile] = useState(pileInitiale);
  const [categoriesListe, setCategoriesListe] = useState(categoriesInitiales);
  const [compteurs, setCompteurs] = useState(compteursInitiaux);
  const [total] = useState(pileInitiale.length);

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [enTirage, setEnTirage] = useState(false);
  const [survole, setSurvole] = useState<string | null>(null);
  const [categorieOuverte, setCategorieOuverte] = useState<CategorieAvecTransactions | null>(null);
  const [creationPour, setCreationPour] = useState<TransactionLegere | null>(null);

  const debut = useRef<{ x: number; y: number } | null>(null);
  const ciblesRef = useRef(new Map<string, HTMLElement>());

  function trouverCible(x: number, y: number): string | null {
    for (const [id, el] of ciblesRef.current) {
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return id;
    }
    return null;
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (creationPour) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    debut.current = { x: e.clientX, y: e.clientY };
    setEnTirage(true);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!enTirage || !debut.current) return;
    const dx = e.clientX - debut.current.x;
    const dy = e.clientY - debut.current.y;
    setOffset({ x: dx, y: dy });
    if (Math.hypot(dx, dy) < SEUIL_DEPOT) {
      setSurvole(null);
      return;
    }
    setSurvole(trouverCible(e.clientX, e.clientY));
  }

  async function deposerSur(cible: string, transaction: TransactionLegere) {
    if (cible === CIBLE_AJOUTER) {
      setPile((p) => p.filter((t) => t.id !== transaction.id));
      setOffset({ x: 0, y: 0 });
      setCreationPour(transaction);
      return;
    }
    setPile((p) => p.filter((t) => t.id !== transaction.id));
    setCompteurs((c) => ({ ...c, [cible]: (c[cible] ?? 0) + 1 }));
    setCategoriesListe((liste) =>
      liste.map((c) => (c.id === cible ? { ...c, transactions: [...c.transactions, transaction] } : c)),
    );
    setOffset({ x: 0, y: 0 });
    const fd = new FormData();
    fd.set("transactionId", transaction.id);
    fd.set("categorieId", cible);
    await categoriserTransaction(fd);
    router.refresh();
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (!enTirage) return;
    setEnTirage(false);
    debut.current = null;
    const transaction = pile[0];
    const cible = Math.hypot(offset.x, offset.y) >= SEUIL_DEPOT ? trouverCible(e.clientX, e.clientY) : null;
    setSurvole(null);
    if (cible && transaction) {
      void deposerSur(cible, transaction);
    } else {
      setOffset({ x: 0, y: 0 });
    }
  }

  async function validerNouvelleCategorie(formData: FormData) {
    if (!creationPour) return;
    const libelle = String(formData.get("libelle") ?? "").trim();
    if (!libelle) return;
    const transaction = creationPour;
    formData.set("transactionId", transaction.id);
    const nouvelleCategorie = await creerCategorieEtCategoriser(formData);
    if (nouvelleCategorie) {
      setCategoriesListe((liste) => [...liste, { ...nouvelleCategorie, transactions: [transaction] }]);
      setCompteurs((c) => ({ ...c, [nouvelleCategorie.id]: 1 }));
    }
    setCreationPour(null);
    router.refresh();
  }

  function annulerCreation() {
    if (creationPour) setPile((p) => [creationPour, ...p]);
    setCreationPour(null);
  }

  const progres = total > 0 ? (total - pile.length) / total : 0;
  const rotation = Math.max(-12, Math.min(12, offset.x / 10));

  return (
    <div>
      <p className="text-sm text-muted">{pile.length} transaction{pile.length > 1 ? "s" : ""}</p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progres * 100}%` }} />
      </div>

      {/* Bulles du haut */}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {categoriesListe.slice(0, Math.ceil(categoriesListe.length / 2)).map((c) => (
          <BulleCategorie
            key={c.id}
            ref={(el) => {
              if (el) ciblesRef.current.set(c.id, el);
              else ciblesRef.current.delete(c.id);
            }}
            categorie={c}
            compte={compteurs[c.id] ?? 0}
            survolee={survole === c.id}
            onClick={() => setCategorieOuverte(c)}
          />
        ))}
      </div>

      {/* Pile de cartes */}
      <div className="relative mx-auto mt-6 h-[190px] max-w-xs select-none">
        {pile.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-center">
            <p className="font-medium text-foreground">Tout est trié !</p>
            <p className="text-sm text-muted">Reviens quand de nouvelles transactions arrivent.</p>
          </div>
        ) : (
          [...pile]
            .slice(0, 4)
            .reverse()
            .map((t, i, arr) => {
              const profondeur = arr.length - 1 - i;
              const estLaCarteDuDessus = profondeur === 0;
              return (
                <div
                  key={t.id}
                  onPointerDown={estLaCarteDuDessus ? onPointerDown : undefined}
                  onPointerMove={estLaCarteDuDessus ? onPointerMove : undefined}
                  onPointerUp={estLaCarteDuDessus ? onPointerUp : undefined}
                  className="absolute inset-x-0 top-0 rounded-2xl border border-line bg-surface p-4 shadow-lg shadow-black/20"
                  style={{
                    zIndex: 10 - profondeur,
                    transform: estLaCarteDuDessus
                      ? `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg)`
                      : `translateY(${profondeur * 8}px) scale(${1 - profondeur * 0.04})`,
                    transition: enTirage && estLaCarteDuDessus ? "none" : "transform 0.25s ease-out",
                    touchAction: "none",
                    cursor: estLaCarteDuDessus ? "grab" : undefined,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted" aria-hidden>
                      ⠿⠿
                    </span>
                    <span className={`font-semibold ${t.montant >= 0 ? "text-positive" : "text-foreground"}`}>
                      {t.montant >= 0 ? "+" : ""}
                      {formatEur(t.montant)}
                    </span>
                  </div>
                  <p className="mt-3 truncate text-lg font-medium text-foreground">
                    {t.commercant ?? "Sans libellé"}
                  </p>
                  <p className="mt-1 text-sm text-muted">{formatDate(t.date)}</p>
                </div>
              );
            })
        )}
      </div>

      {pile.length > 0 && (
        <p className="mt-3 text-center text-sm text-muted">Glisse la transaction vers une catégorie</p>
      )}

      {/* Bulles du bas */}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {categoriesListe.slice(Math.ceil(categoriesListe.length / 2)).map((c) => (
          <BulleCategorie
            key={c.id}
            ref={(el) => {
              if (el) ciblesRef.current.set(c.id, el);
              else ciblesRef.current.delete(c.id);
            }}
            categorie={c}
            compte={compteurs[c.id] ?? 0}
            survolee={survole === c.id}
            onClick={() => setCategorieOuverte(c)}
          />
        ))}
      </div>

      <div
        ref={(el) => {
          if (el) ciblesRef.current.set(CIBLE_AJOUTER, el);
          else ciblesRef.current.delete(CIBLE_AJOUTER);
        }}
        className={`mx-auto mt-4 flex h-12 w-fit items-center gap-2 rounded-full border border-dashed px-4 text-sm transition-colors ${
          survole === CIBLE_AJOUTER ? "border-accent text-accent" : "border-line text-muted"
        }`}
      >
        <span aria-hidden>+</span> Ajouter une catégorie
      </div>

      {creationPour && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center" onClick={annulerCreation}>
          <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="font-medium text-foreground">Nouvelle catégorie</p>
              <button type="button" onClick={annulerCreation} aria-label="Annuler" className="rounded p-1 text-muted hover:text-foreground">
                ✕
              </button>
            </div>
            <p className="mb-3 text-sm text-muted">
              Pour «&nbsp;{creationPour.commercant ?? "cette transaction"}&nbsp;»
            </p>
            <form action={validerNouvelleCategorie} className="space-y-3">
              <Champ label="Libellé" name="libelle" placeholder="Ex. Vacances…" required autoFocus />
              <SelecteurIconeCategorie name="icone" />
              <Bouton type="submit" className="w-full">
                Créer et classer
              </Bouton>
            </form>
          </div>
        </div>
      )}

      {categorieOuverte && (
        <ModaleCategorie
          categorie={categorieOuverte}
          onFerme={(nouveauLibelle) => {
            if (nouveauLibelle) {
              setCategoriesListe((liste) =>
                liste.map((c) => (c.id === categorieOuverte.id ? { ...c, libelle: nouveauLibelle } : c)),
              );
            }
            setCategorieOuverte(null);
          }}
        />
      )}
    </div>
  );
}

const BulleCategorie = forwardRef<
  HTMLButtonElement,
  { categorie: CategorieAvecTransactions; compte: number; survolee: boolean; onClick: () => void }
>(function BulleCategorie({ categorie, compte, survolee, onClick }, ref) {
  return (
    <button
      type="button"
      ref={ref}
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-2xl border px-4 py-3 transition-colors ${
        survolee ? "border-accent bg-accent/10" : "border-line bg-surface"
      }`}
    >
      <span className={`flex h-11 w-11 items-center justify-center rounded-full ${survolee ? "bg-accent/20 text-accent" : "bg-background text-accent"}`}>
        <IconeCategorie icone={categorie.icone} />
      </span>
      <span className="text-sm font-medium text-foreground">{categorie.libelle}</span>
      <span className="text-xs text-muted">{compte}</span>
    </button>
  );
});

function ModaleCategorie({
  categorie,
  onFerme,
}: {
  categorie: CategorieAvecTransactions;
  onFerme: (nouveauLibelle: string | null) => void;
}) {
  const [libelle, setLibelle] = useState(categorie.libelle);

  async function enregistrer() {
    const fd = new FormData();
    fd.set("id", categorie.id);
    fd.set("libelle", libelle);
    fd.set("icone", categorie.icone ?? "autre");
    await modifierCategorie(fd);
    onFerme(libelle);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center" onClick={() => onFerme(null)}>
      <div
        className="max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-line bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="font-medium text-foreground">Modifier la catégorie</p>
          <button type="button" onClick={() => onFerme(null)} aria-label="Fermer" className="rounded p-1 text-muted hover:text-foreground">
            ✕
          </button>
        </div>
        <div className="flex gap-2">
          <input
            value={libelle}
            onChange={(e) => setLibelle(e.target.value)}
            className="h-11 flex-1 rounded-lg border border-line bg-background px-4 text-base text-foreground outline-none focus:border-accent"
          />
          <Bouton type="button" onClick={enregistrer} className="shrink-0">
            Enregistrer
          </Bouton>
        </div>

        <p className="mt-4 mb-2 text-xs font-medium uppercase tracking-wide text-muted">
          {categorie.transactions.length} transaction{categorie.transactions.length > 1 ? "s" : ""}
        </p>
        {categorie.transactions.length === 0 ? (
          <p className="text-sm text-muted">Aucune transaction dans cette catégorie pour l&apos;instant.</p>
        ) : (
          <ul className="divide-y divide-line">
            {categorie.transactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="truncate text-foreground">{t.commercant ?? "Sans libellé"}</span>
                <span className={`shrink-0 ${t.montant >= 0 ? "text-positive" : "text-muted"}`}>
                  {t.montant >= 0 ? "+" : ""}
                  {formatEur(t.montant)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

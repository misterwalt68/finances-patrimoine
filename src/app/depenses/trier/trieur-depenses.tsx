"use client";

import { forwardRef, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useRouter } from "next/navigation";
import { Champ } from "@/components/ui/champ";
import { Bouton } from "@/components/ui/bouton";
import { SelecteurIconeCategorie } from "@/components/ui/selecteur-icone";
import { IconeCategorie } from "@/lib/icones-categorie";
import { categoriserTransaction, creerCategorieEtCategoriser, declasserTransaction } from "../actions";
import { modifierCategorie } from "@/app/reglages/categories/actions";

type TransactionLegere = { id: string; commercant: string | null; montant: number; date: string };
type CategorieAvecTransactions = {
  id: string;
  libelle: string;
  icone: string | null;
  type: "revenu" | "charge";
  transactions: TransactionLegere[];
};

const CIBLE_AJOUTER = "__ajouter__";
const CIBLE_PLUS_TARD = "__plus_tard__";
const SEUIL_DEPOT = 70; // px de tirage avant qu'une catégorie soit considérée comme ciblée
const SEUIL_TAP = 8; // px de mouvement max pour qu'un relâchement compte comme un tap, pas un glissement
const DELAI_SAISIE = 200; // ms d'appui avant qu'une carte soit considérée "en cours de déplacement"
// Variation d'alignement par profondeur (éventail façon maquette de
// référence) — décalage horizontal + rotation légère, en plus du décalage
// vertical qui garde chaque carte lisible.
const EVENTAIL: { x: number; r: number }[] = [
  { x: 0, r: 0 },
  { x: 14, r: 2.5 },
  { x: -12, r: -2 },
  { x: 18, r: 3.5 },
  { x: -16, r: -3 },
  { x: 10, r: 2 },
];

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
  const [enSaisie, setEnSaisie] = useState(false);
  const [survole, setSurvole] = useState<string | null>(null);
  const [categorieOuverte, setCategorieOuverte] = useState<CategorieAvecTransactions | null>(null);
  const [creationPour, setCreationPour] = useState<TransactionLegere | null>(null);
  const [detailOuvert, setDetailOuvert] = useState<TransactionLegere | null>(null);

  const debut = useRef<{ x: number; y: number } | null>(null);
  const ciblesRef = useRef(new Map<string, HTMLElement>());
  const minuteurSaisie = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Le dernier pointeur reçu et une mise à jour d'état au plus une fois par
  // frame — sur mobile, le pointeur peut envoyer des événements bien plus
  // vite que l'écran ne rafraîchit, et déclencher un setState (donc un
  // rendu de toute la pile + des bulles) à chaque événement était la cause
  // des lags/saccades signalés pendant le glissement.
  const pointeurActuel = useRef<{ x: number; y: number } | null>(null);
  const frameEnAttente = useRef<number | null>(null);

  function annulerMinuteurSaisie() {
    if (minuteurSaisie.current) {
      clearTimeout(minuteurSaisie.current);
      minuteurSaisie.current = null;
    }
  }

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
    if (frameEnAttente.current !== null) {
      cancelAnimationFrame(frameEnAttente.current);
      frameEnAttente.current = null;
    }
    setEnTirage(true);
    setEnSaisie(false);
    annulerMinuteurSaisie();
    // Un appui maintenu, même sans bouger, passe en mode "saisie" (fait
    // apparaître les zones de dépôt sur les bords, estompe les autres
    // cartes) — pas besoin de glisser pour déclencher le transport, juste
    // tenir.
    minuteurSaisie.current = setTimeout(() => setEnSaisie(true), DELAI_SAISIE);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!enTirage || !debut.current) return;
    pointeurActuel.current = { x: e.clientX, y: e.clientY };
    if (frameEnAttente.current !== null) return; // une mise à jour est déjà planifiée pour cette frame
    frameEnAttente.current = requestAnimationFrame(() => {
      frameEnAttente.current = null;
      if (!pointeurActuel.current || !debut.current) return;
      const dx = pointeurActuel.current.x - debut.current.x;
      const dy = pointeurActuel.current.y - debut.current.y;
      setOffset({ x: dx, y: dy });
      const distance = Math.hypot(dx, dy);
      // Un mouvement franc avant même la fin du délai vaut aussi pour un
      // glissement volontaire — pas besoin d'attendre le minuteur.
      if (distance > SEUIL_TAP && minuteurSaisie.current) {
        annulerMinuteurSaisie();
        setEnSaisie(true);
      }
      if (distance < SEUIL_DEPOT) {
        setSurvole(null);
        return;
      }
      setSurvole(trouverCible(pointeurActuel.current.x, pointeurActuel.current.y));
    });
  }

  async function deposerSur(cible: string, transaction: TransactionLegere) {
    if (cible === CIBLE_AJOUTER) {
      setPile((p) => p.filter((t) => t.id !== transaction.id));
      setOffset({ x: 0, y: 0 });
      setCreationPour(transaction);
      return;
    }
    if (cible === CIBLE_PLUS_TARD) {
      // Ni catégorisée ni renvoyée en base — juste repoussée en fin de pile
      // pour voir les suivantes, purement côté client (rien à retenir d'une
      // session à l'autre).
      setPile((p) => {
        const [premiere, ...reste] = p;
        return premiere ? [...reste, premiere] : p;
      });
      setOffset({ x: 0, y: 0 });
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
    if (frameEnAttente.current !== null) {
      cancelAnimationFrame(frameEnAttente.current);
      frameEnAttente.current = null;
    }
    setEnTirage(false);
    annulerMinuteurSaisie();
    // Calculé depuis la position réelle du relâchement plutôt que depuis
    // `offset` (mis à jour au plus une fois par frame) — sinon un dépôt au
    // tout dernier instant pourrait se baser sur une position d'un cran en
    // retard.
    const dx = debut.current ? e.clientX - debut.current.x : offset.x;
    const dy = debut.current ? e.clientY - debut.current.y : offset.y;
    debut.current = null;
    const transaction = pile[0];
    const distance = Math.hypot(dx, dy);
    const cible = distance >= SEUIL_DEPOT ? trouverCible(e.clientX, e.clientY) : null;
    const etaitEnSaisie = enSaisie;
    setSurvole(null);
    // Remis à zéro avant toute chose, y compris quand un dépôt réussit —
    // sinon la carte suivante, qui devient "la carte du dessus" dès ce
    // rendu, hérite du mode saisie du geste précédent.
    setOffset({ x: 0, y: 0 });
    setEnSaisie(false);
    if (cible && transaction) {
      void deposerSur(cible, transaction);
      return;
    }
    if (!etaitEnSaisie && distance < SEUIL_TAP && transaction) {
      // Relâché quasi sur place, sans être passé par le mode saisie : un
      // tap, pas un geste de tri — on ouvre le détail plutôt que de le
      // glisser.
      setDetailOuvert(transaction);
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
      const type: "revenu" | "charge" = nouvelleCategorie.type === "revenu" ? "revenu" : "charge";
      setCategoriesListe((liste) => [...liste, { ...nouvelleCategorie, type, transactions: [transaction] }]);
      setCompteurs((c) => ({ ...c, [nouvelleCategorie.id]: 1 }));
    }
    setCreationPour(null);
    router.refresh();
  }

  function annulerCreation() {
    if (creationPour) setPile((p) => [creationPour, ...p]);
    setCreationPour(null);
  }

  /** Retire une transaction de sa catégorie et la renvoie dans la pile à trier. */
  async function declasser(transaction: TransactionLegere, categorieId: string) {
    setCategoriesListe((liste) =>
      liste.map((c) =>
        c.id === categorieId ? { ...c, transactions: c.transactions.filter((t) => t.id !== transaction.id) } : c,
      ),
    );
    setCompteurs((c) => ({ ...c, [categorieId]: Math.max(0, (c[categorieId] ?? 0) - 1) }));
    setCategorieOuverte((co) =>
      co && co.id === categorieId ? { ...co, transactions: co.transactions.filter((t) => t.id !== transaction.id) } : co,
    );
    setPile((p) => [...p, transaction]);
    await declasserTransaction(transaction.id);
    router.refresh();
  }

  const progres = total > 0 ? (total - pile.length) / total : 0;
  const rotation = Math.max(-12, Math.min(12, offset.x / 10));
  // Le type de bulles à proposer suit celui de la transaction en haut de la
  // pile — jamais de bulle "Restaurants" sous un virement entrant, jamais de
  // bulle "Salaire" sous un paiement carte (demande explicite de Maxime).
  const typeCourant: "revenu" | "charge" | null = pile[0] ? (pile[0].montant >= 0 ? "revenu" : "charge") : null;
  const categoriesAffichees = typeCourant ? categoriesListe.filter((c) => c.type === typeCourant) : [];
  const CARTE_H = 88; // hauteur d'une carte (px) — moins haute, plus longue que la version précédente
  const REVELATION = 42; // décalage vertical entre deux cartes empilées (px)
  const NB_CARTES_VISIBLES = 6;
  // Position de base de la carte du dessus dans le bloc : en bas, pas en
  // haut — les cartes plus profondes se révèlent au-dessus d'elle, si bien
  // que quand l'une d'elles est promue au premier plan, elle descend vers
  // sa nouvelle place plutôt que de remonter.
  const DECALAGE_BASE = (NB_CARTES_VISIBLES - 1) * REVELATION;
  // Plus une carte est profonde dans la pile, plus elle "s'éloigne" —
  // l'échelle réduit et sa couleur se mélange de plus en plus avec le fond
  // (pas une histoire d'opacité, qui laisserait deviner ce qu'il y a
  // dessous : un vrai fondu de teinte, comme si la carte se fondait dans le
  // fond de l'écran).
  const PROFONDEUR_ECHELLE = [1, 0.96, 0.92, 0.88, 0.84, 0.8];
  const PROFONDEUR_FONDU = [0, 0.25, 0.45, 0.6, 0.72, 0.82];

  return (
    <div>
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted">{pile.length} transaction{pile.length > 1 ? "s" : ""}</p>
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progres * 100}%` }} />
        </div>
      </div>

      {/* Bulles de catégories — uniquement celles du même type (revenu/charge) que la carte du dessus */}
      <div className="mt-6 flex flex-wrap justify-center gap-x-3 gap-y-5">
        {categoriesAffichees.slice(0, Math.ceil(categoriesAffichees.length / 2)).map((c) => (
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

      {/*
       * Pile en éventail façon maquette de référence : chaque carte derrière
       * la première est décalée verticalement (reste lisible : commerçant,
       * date, montant) avec une variation d'alignement (léger décalage
       * horizontal + rotation) pour casser l'effet "file indienne". La carte
       * du dessus est ancrée en bas du bloc — les suivantes se révèlent
       * au-dessus, si bien que promouvoir la prochaine carte la fait
       * descendre vers l'avant plutôt que remonter. Seule la carte du
       * dessus est saisissable et affiche la loupe.
       */}
      <div
        className="relative mx-auto mt-6 max-w-xs select-none"
        style={{ height: CARTE_H + (NB_CARTES_VISIBLES - 1) * REVELATION }}
      >
        {pile.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-center">
            <p className="font-medium text-foreground">Tout est trié !</p>
            <p className="text-sm text-muted">Reviens quand de nouvelles transactions arrivent.</p>
          </div>
        ) : (
          [...pile]
            .slice(0, NB_CARTES_VISIBLES)
            .reverse()
            .map((t, i, arr) => {
              const profondeur = arr.length - 1 - i;
              const estLaCarteDuDessus = profondeur === 0;
              const eventail = EVENTAIL[profondeur] ?? EVENTAIL[EVENTAIL.length - 1];
              const echelleProfondeur = PROFONDEUR_ECHELLE[profondeur] ?? PROFONDEUR_ECHELLE[PROFONDEUR_ECHELLE.length - 1];
              const fonduProfondeur = PROFONDEUR_FONDU[profondeur] ?? PROFONDEUR_FONDU[PROFONDEUR_FONDU.length - 1];
              // Pendant la saisie, les autres cartes se fondent davantage
              // dans le fond (même mécanisme que le fondu de profondeur,
              // juste poussé plus loin) pour démarquer celle qu'on tient.
              const fondu = estLaCarteDuDessus ? 0 : enSaisie ? Math.max(fonduProfondeur, 0.75) : fonduProfondeur;
              // Arrivée sur une bulle en glissant : la carte tenue réduit
              // jusqu'à quasi disparaître (comme absorbée par la bulle),
              // qui elle-même grandit déjà via son propre style survolé.
              const surUneCible = estLaCarteDuDessus && enTirage && survole !== null;
              // Décalage vertical au repos : la carte du dessus reste en bas
              // du bloc, les suivantes se révèlent au-dessus d'elle.
              const decalageRepos = estLaCarteDuDessus
                ? DECALAGE_BASE
                : (NB_CARTES_VISIBLES - 1 - profondeur) * REVELATION;
              return (
                <div
                  key={t.id}
                  onPointerDown={estLaCarteDuDessus ? onPointerDown : undefined}
                  onPointerMove={estLaCarteDuDessus ? onPointerMove : undefined}
                  onPointerUp={estLaCarteDuDessus ? onPointerUp : undefined}
                  className={`absolute left-1/2 top-0 w-[95%] overflow-hidden rounded-2xl border bg-surface ${
                    estLaCarteDuDessus ? (enSaisie ? "glow-tri-actif" : "glow-tri") : "shadow-xl shadow-black/50"
                  }`}
                  style={{
                    height: CARTE_H,
                    zIndex: 10 - profondeur,
                    borderColor: estLaCarteDuDessus
                      ? undefined
                      : `color-mix(in srgb, var(--line) ${(1 - fondu) * 100}%, var(--background) ${fondu * 100}%)`,
                    transform: estLaCarteDuDessus
                      ? `translate(-50%, ${decalageRepos}px) translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${surUneCible ? 0.08 : 1})`
                      : `translate(-50%, ${decalageRepos}px) translate(${eventail.x}px, 0) rotate(${eventail.r}deg) scale(${echelleProfondeur})`,
                    willChange: estLaCarteDuDessus && enTirage ? "transform" : undefined,
                    // Pas de transition sur `transform` pendant un
                    // glissement normal : la carte doit suivre le doigt au
                    // pixel près, sans lag d'interpolation. Elle ne
                    // réapparaît que pour l'effet d'absorption (arrivée sur
                    // une bulle) et au repos (retour en place, promotion).
                    transition:
                      estLaCarteDuDessus && enTirage
                        ? survole
                          ? "transform 0.2s ease-out"
                          : "none"
                        : "transform 0.25s ease-out",
                    touchAction: "none",
                    cursor: estLaCarteDuDessus ? "grab" : undefined,
                  }}
                >
                  <div
                    className={
                      estLaCarteDuDessus
                        ? "flex h-full items-center gap-3 p-4"
                        : // Cartes derrière la première : seul le haut de leur
                          // boîte dépasse de sous la carte du dessus (celle-ci
                          // les recouvre par en dessous, la pile se révélant
                          // vers le haut) — le contenu est donc ancré en haut,
                          // pas centré, sinon il resterait caché.
                          "absolute inset-x-0 top-0 flex items-center gap-3 p-4"
                    }
                  >
                    <IconeAvatar />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="truncate font-medium text-foreground">{t.commercant ?? "Sans libellé"}</p>
                      <span className="mt-0.5 text-sm text-muted">{formatDate(t.date)}</span>
                    </div>
                    <div className="flex shrink-0 items-start gap-2">
                      <span className={`font-semibold ${t.montant >= 0 ? "text-positive" : "text-foreground"}`}>
                        {t.montant >= 0 ? "+" : ""}
                        {formatEur(t.montant)}
                      </span>
                      {estLaCarteDuDessus && (
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailOuvert(t);
                          }}
                          aria-label="Voir le détail"
                          className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-background hover:text-foreground"
                        >
                          <IconeLoupe className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {!estLaCarteDuDessus && (
                    // Fondu vers la couleur du fond plutôt qu'une opacité :
                    // une couche du fond posée par-dessus tout le contenu,
                    // de plus en plus opaque avec la profondeur — la carte a
                    // l'air de se fondre dans l'écran, pas de devenir
                    // transparente sur ce qu'il y a derrière.
                    <div
                      className="pointer-events-none absolute inset-0 transition-opacity duration-200"
                      style={{ backgroundColor: "var(--background)", opacity: fondu }}
                    />
                  )}
                </div>
              );
            })
        )}
      </div>
      {pile.length > 0 && (
        <p className="mt-3 text-center text-sm text-muted">
          Tap pour le détail · appui maintenu puis glisse vers une catégorie
        </p>
      )}

      {/* Bulles de catégories — suite (même filtre par type) */}
      <div className="mt-6 flex flex-wrap justify-center gap-x-3 gap-y-5">
        {categoriesAffichees.slice(Math.ceil(categoriesAffichees.length / 2)).map((c) => (
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

      {/*
       * Demi-ovales discrets, plaqués contre les bords de l'écran (bord droit
       * de la forme = bord de l'écran, pas de débordement) — invisibles au
       * repos, elles n'apparaissent que quand une carte est en cours de
       * saisie (`enSaisie`), pour ne jamais gêner la lecture normale de
       * l'écran. Beaucoup plus hautes que larges, sur le modèle d'une appli
       * de swipe façon Tinder, mais discret plutôt qu'un gros cercle.
       */}
      <div
        ref={(el) => {
          if (el) ciblesRef.current.set(CIBLE_AJOUTER, el);
          else ciblesRef.current.delete(CIBLE_AJOUTER);
        }}
        className={`fixed top-1/2 left-0 z-40 flex h-56 w-16 -translate-y-1/2 items-center justify-center rounded-r-full border-2 border-l-0 border-line bg-surface pr-2 transition-all duration-150 ${
          enSaisie ? "opacity-100" : "pointer-events-none opacity-0"
        } ${survole === CIBLE_AJOUTER ? "glow-tri-actif scale-110 bg-accent/10" : ""}`}
      >
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-lg text-accent" aria-hidden>
            +
          </span>
          <span className="text-[10px] leading-tight text-muted">
            Nouvelle
            <br />
            catégorie
          </span>
        </div>
      </div>
      <div
        ref={(el) => {
          if (el) ciblesRef.current.set(CIBLE_PLUS_TARD, el);
          else ciblesRef.current.delete(CIBLE_PLUS_TARD);
        }}
        className={`fixed top-1/2 right-0 z-40 flex h-56 w-16 -translate-y-1/2 items-center justify-center rounded-l-full border-2 border-r-0 border-line bg-surface pl-2 transition-all duration-150 ${
          enSaisie ? "opacity-100" : "pointer-events-none opacity-0"
        } ${survole === CIBLE_PLUS_TARD ? "glow-tri-actif scale-110 bg-accent/10" : ""}`}
      >
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-lg text-accent" aria-hidden>
            ↻
          </span>
          <span className="text-[10px] leading-tight text-muted">
            Plus
            <br />
            tard
          </span>
        </div>
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
          onDeclasser={(transaction) => declasser(transaction, categorieOuverte.id)}
        />
      )}

      {detailOuvert && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={() => setDetailOuvert(null)}
        >
          <div
            className="glow-tri w-full max-w-sm rounded-2xl border bg-surface p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-muted">Détail</p>
              <button
                type="button"
                onClick={() => setDetailOuvert(null)}
                aria-label="Fermer"
                className="rounded p-1 text-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <p className={`text-3xl font-semibold ${detailOuvert.montant >= 0 ? "text-positive" : "text-foreground"}`}>
              {detailOuvert.montant >= 0 ? "+" : ""}
              {formatEur(detailOuvert.montant)}
            </p>
            <p className="mt-3 text-base text-foreground">{detailOuvert.commercant ?? "Sans libellé"}</p>
            <p className="mt-1 text-sm text-muted">
              {new Date(detailOuvert.date).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Bulle de catégorie façon maquette de référence : une vraie capsule (plate
 * en haut et en bas, arrondie sur les côtés — `rounded-full` sur un
 * rectangle produit exactement cette forme), contour vert toujours visible
 * (pas seulement au survol), et le nombre de transactions dans une petite
 * pastille qui déborde du bas du contour plutôt qu'affiché en texte normal.
 */
const BulleCategorie = forwardRef<
  HTMLButtonElement,
  { categorie: CategorieAvecTransactions; compte: number; survolee: boolean; onClick: () => void }
>(function BulleCategorie({ categorie, compte, survolee, onClick }, ref) {
  return (
    <button
      type="button"
      ref={ref}
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1 rounded-full border-2 bg-surface px-5 py-3 transition-all ${
        survolee ? "glow-tri-actif scale-110 bg-accent/10" : "glow-tri"
      }`}
    >
      <IconeCategorie icone={categorie.icone} className="h-5 w-5 text-accent" />
      <span className="text-sm font-medium text-foreground">{categorie.libelle}</span>
      <span className="absolute -bottom-2.5 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border-2 border-background bg-accent text-[11px] font-semibold text-accent-foreground">
        {compte}
      </span>
    </button>
  );
});

function ModaleCategorie({
  categorie,
  onFerme,
  onDeclasser,
}: {
  categorie: CategorieAvecTransactions;
  onFerme: (nouveauLibelle: string | null) => void;
  onDeclasser: (transaction: TransactionLegere) => void;
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
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground">Modifier la catégorie</p>
            <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">
              {categorie.type === "revenu" ? "Revenu" : "Charge"}
            </span>
          </div>
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
                <span className="flex shrink-0 items-center gap-2">
                  <span className={t.montant >= 0 ? "text-positive" : "text-muted"}>
                    {t.montant >= 0 ? "+" : ""}
                    {formatEur(t.montant)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeclasser(t)}
                    className="rounded-full border border-line px-2 py-0.5 text-xs text-muted transition-colors hover:border-negative hover:text-negative"
                  >
                    Déclasser
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * Avatar générique côté gauche de chaque carte — pas un vrai logo marchand
 * (aucune source de logo par commerçant dans l'app), mais reprend l'anatomie
 * de la maquette de référence (icône ronde à gauche du libellé).
 */
function IconeAvatar() {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background text-accent">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18" />
      </svg>
    </span>
  );
}

function IconeLoupe({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m20 20-4.3-4.3" />
    </svg>
  );
}

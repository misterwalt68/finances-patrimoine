import type { ReactNode } from "react";

/**
 * Rendu markdown minimal, pour afficher un fichier .md du dépôt dans l'app
 * (ex. CONNEXIONS.md) sans ajouter de dépendance. Ne gère que ce dont ce
 * document a besoin : titres, listes, séparateurs, gras, liens, code inline.
 * Contenu toujours interne au dépôt (jamais de saisie utilisateur) : pas de
 * risque XSS, tout passe par de vrais éléments React, jamais innerHTML.
 */
function rendreInline(texte: string, cle: string): ReactNode[] {
  const jetons = texte.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|`[^`]+`)/g).filter(Boolean);

  return jetons.map((jeton, i) => {
    const idJeton = `${cle}-${i}`;

    if (jeton.startsWith("**") && jeton.endsWith("**")) {
      return (
        <strong key={idJeton} className="text-foreground">
          {jeton.slice(2, -2)}
        </strong>
      );
    }

    const lien = jeton.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (lien) {
      return (
        <a
          key={idJeton}
          href={lien[2]}
          target="_blank"
          rel="noreferrer"
          className="text-accent underline underline-offset-2"
        >
          {lien[1]}
        </a>
      );
    }

    if (jeton.startsWith("`") && jeton.endsWith("`")) {
      return (
        <code key={idJeton} className="rounded bg-background px-1 py-0.5 text-xs">
          {jeton.slice(1, -1)}
        </code>
      );
    }

    return <span key={idJeton}>{jeton}</span>;
  });
}

export function MarkdownSimple({ contenu }: { contenu: string }) {
  const lignes = contenu.split("\n");
  const elements: ReactNode[] = [];
  let listeCourante: string[] = [];

  const viderListe = (cle: string) => {
    if (listeCourante.length === 0) return;
    elements.push(
      <ul key={cle} className="list-disc space-y-1.5 pl-5 text-sm text-muted">
        {listeCourante.map((item, i) => (
          <li key={i}>{rendreInline(item, `${cle}-li-${i}`)}</li>
        ))}
      </ul>,
    );
    listeCourante = [];
  };

  lignes.forEach((ligneBrute, i) => {
    const ligne = ligneBrute;
    if (ligne.startsWith("## ")) {
      viderListe(`liste-${i}`);
      elements.push(
        <h2 key={i} className="mt-8 text-lg font-semibold text-foreground first:mt-0">
          {ligne.slice(3)}
        </h2>,
      );
    } else if (ligne.startsWith("# ")) {
      viderListe(`liste-${i}`);
      elements.push(
        <h1 key={i} className="text-xl font-semibold text-foreground">
          {ligne.slice(2)}
        </h1>,
      );
    } else if (ligne.startsWith("- ")) {
      listeCourante.push(ligne.slice(2));
    } else if (ligne.trim() === "---") {
      viderListe(`liste-${i}`);
      elements.push(<hr key={i} className="my-2 border-line" />);
    } else if (ligne.trim() === "") {
      viderListe(`liste-${i}`);
    } else {
      viderListe(`liste-${i}`);
      elements.push(
        <p key={i} className="text-sm leading-relaxed text-muted">
          {rendreInline(ligne, `p-${i}`)}
        </p>,
      );
    }
  });
  viderListe("liste-fin");

  return <div className="space-y-3">{elements}</div>;
}

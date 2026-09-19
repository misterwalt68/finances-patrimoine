import { readFile } from "node:fs/promises";
import path from "node:path";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { institutions } from "@/db/schema";
import { Carte, Badge } from "@/components/ui/carte";
import { MarkdownSimple } from "@/lib/markdown-simple";
import { CONNEXIONS_CONNUES, statutConnexion } from "@/lib/connexions";
import { connecterBanque } from "./actions";
import { ASPSP_PAR_BANQUE } from "./banques";
import { EB_SANDBOX } from "@/lib/enable-banking/client";

type CompteBancaireExterne = { uid: string; nom: string | null; iban: string | null; devise: string | null };

export default async function PageConnexions({
  searchParams,
}: {
  searchParams: Promise<{ enable_banking?: string }>;
}) {
  const [contenu, institutionsPsd2, { enable_banking: retourEnableBanking }] = await Promise.all([
    readFile(path.join(process.cwd(), "CONNEXIONS.md"), "utf-8"),
    db.select().from(institutions).orderBy(desc(institutions.createdAt)),
    searchParams,
  ]);

  // La vraie source de vérité, c'est la présence d'une session Enable Banking
  // active — pas l'étiquette `methodeConnexion`, qui peut être "psd2" sur un
  // établissement jamais réellement connecté (aspiration) ou rester "manuel"
  // sur un établissement pourtant déjà connecté (donnée pré-existante).
  const banquesConnectees = institutionsPsd2.filter((i) => Boolean(i.enableBankingSessionId));

  return (
    <div className="space-y-6">
      {retourEnableBanking === "ok" && (
        <Carte>
          <p className="text-sm text-positive">Banque connectée avec succès.</p>
        </Carte>
      )}
      {retourEnableBanking === "erreur" && (
        <Carte>
          <p className="text-sm text-negative">
            La connexion a échoué ou a été annulée — réessaie.
          </p>
        </Carte>
      )}

      <div className="grid grid-cols-2 gap-3">
        {CONNEXIONS_CONNUES.map((def) => {
          const ok = statutConnexion(def);
          return (
            <Carte key={def.cle}>
              <p className="font-medium text-foreground">{def.nom}</p>
              <p className={`mt-1 text-sm ${ok ? "text-positive" : "text-muted"}`}>
                {ok ? "Configuré" : "Pas configuré"}
              </p>
            </Carte>
          );
        })}
      </div>

      <Carte>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">Connexion bancaire (DSP2)</p>
            <p className="mt-1 text-sm text-muted">
              {EB_SANDBOX
                ? "Mode développement — connecte la banque de test, jamais une vraie banque."
                : "Redirige vers ta banque pour autoriser la lecture de tes comptes."}
            </p>
          </div>
          <form action={connecterBanque} className="flex shrink-0 gap-2">
            <select
              name="banque"
              defaultValue="boursobank"
              className="h-10 rounded-lg border border-line bg-surface px-3 text-sm text-foreground"
            >
              {Object.entries(ASPSP_PAR_BANQUE).map(([cle, def]) => (
                <option key={cle} value={cle}>
                  {def.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-10 rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground"
            >
              Connecter{EB_SANDBOX ? " (test)" : ""}
            </button>
          </form>
        </div>

        {banquesConnectees.length > 0 && (
          <div className="mt-4 space-y-3 border-t border-line pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Comptes connectés
            </p>
            {banquesConnectees.map((b) => {
              const comptesExternes = (b.enableBankingComptes as CompteBancaireExterne[] | null) ?? [];
              return (
                <div key={b.id}>
                  <p className="flex items-center gap-2 font-medium text-foreground">
                    {b.nom}
                    <Badge>{b.consentementEtat ?? "actif"}</Badge>
                  </p>
                  {b.consentementExpireLe && (
                    <p className="mt-0.5 text-xs text-muted">
                      Consentement valable jusqu&apos;au{" "}
                      {new Date(b.consentementExpireLe).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                  {comptesExternes.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {comptesExternes.map((c) => (
                        <li key={c.uid} className="text-sm text-muted">
                          {c.nom ?? "Compte sans nom"}
                          {c.iban ? ` · ${c.iban}` : ""}
                          {c.devise ? ` · ${c.devise}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Carte>

      <Carte>
        <MarkdownSimple contenu={contenu} />
      </Carte>
    </div>
  );
}

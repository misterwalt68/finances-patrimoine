import { readFile } from "node:fs/promises";
import path from "node:path";
import { Carte } from "@/components/ui/carte";
import { MarkdownSimple } from "@/lib/markdown-simple";
import { CONNEXIONS_CONNUES, statutConnexion } from "@/lib/connexions";

export default async function PageConnexions() {
  const contenu = await readFile(path.join(process.cwd(), "CONNEXIONS.md"), "utf-8");

  return (
    <div className="space-y-6">
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
        <MarkdownSimple contenu={contenu} />
      </Carte>
    </div>
  );
}

export const metadata = {
  title: "Conditions d'utilisation — Patrimoine",
};

export default function PageConditions() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 pb-safe pt-safe">
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
        Conditions d&apos;utilisation
      </h1>

      <p className="text-sm text-muted">
        Application personnelle de suivi patrimonial et budgétaire,
        développée et utilisée par une seule personne, Maxime Walter, à des
        fins strictement privées et non commerciales. Elle n&apos;est ni
        distribuée, ni proposée à d&apos;autres utilisateurs.
      </p>

      <section className="space-y-2">
        <h2 className="font-medium text-foreground">Fonctionnement</h2>
        <p className="text-sm text-muted">
          L&apos;application se connecte, avec le consentement de son
          utilisateur, à des comptes bancaires et financiers externes en
          lecture seule, afin d&apos;en afficher une vue consolidée. Aucune
          opération de paiement, de virement ou de transaction n&apos;est
          initiée depuis l&apos;application.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium text-foreground">Responsabilité</h2>
        <p className="text-sm text-muted">
          Les données affichées (cours, soldes, calculs) sont fournies à
          titre indicatif, sans garantie d&apos;exactitude en temps réel, et
          ne constituent ni un conseil financier ni un document officiel.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium text-foreground">Contact</h2>
        <p className="text-sm text-muted">
          maxime.walter1994@gmail.com
        </p>
      </section>
    </main>
  );
}

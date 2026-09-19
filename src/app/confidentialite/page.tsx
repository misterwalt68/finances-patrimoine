export const metadata = {
  title: "Confidentialité — Patrimoine",
};

export default function PageConfidentialite() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 pb-safe pt-safe">
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
        Politique de confidentialité
      </h1>

      <p className="text-sm text-muted">
        Application personnelle, à usage strictement individuel et non
        commercial. Elle n&apos;a qu&apos;un seul utilisateur : son
        développeur, Maxime Walter.
      </p>

      <section className="space-y-2">
        <h2 className="font-medium text-foreground">Quelles données sont collectées</h2>
        <p className="text-sm text-muted">
          L&apos;application se connecte, avec le consentement explicite de
          son unique utilisateur, aux comptes bancaires, crypto et de courtage
          qu&apos;il choisit de rattacher (via des connexions en lecture seule
          type DSP2/API, par exemple Enable Banking ou Coinbase). Les données
          récupérées sont limitées aux soldes, positions et transactions de
          ces comptes.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium text-foreground">Comment elles sont utilisées</h2>
        <p className="text-sm text-muted">
          Uniquement pour afficher, à son seul utilisateur, une vue
          consolidée de son propre patrimoine et de ses dépenses. Aucune
          donnée n&apos;est vendue, partagée ou transmise à un tiers, et
          aucune capacité d&apos;initiation de paiement ou de virement
          n&apos;est implémentée : l&apos;accès aux comptes est strictement
          en lecture.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium text-foreground">Où elles sont stockées</h2>
        <p className="text-sm text-muted">
          Dans une base de données privée (Supabase, hébergée dans l&apos;Union
          européenne), accessible uniquement après authentification par lien
          magique envoyé à l&apos;adresse email de l&apos;utilisateur.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium text-foreground">Révocation</h2>
        <p className="text-sm text-muted">
          Chaque connexion bancaire peut être révoquée à tout moment, aussi
          bien depuis l&apos;application que directement depuis
          l&apos;espace client de la banque ou du fournisseur concerné.
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

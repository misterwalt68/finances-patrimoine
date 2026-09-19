# Connexions externes — journal de bord

Ce document existe pour un seul cas d'usage : **le jour où une connexion casse ou que tu es perdu**, tu ouvres ce fichier et tu as tout — ce qui a été fait, pourquoi, et comment recommencer si besoin. Il est volontairement en dehors de l'app (fichier du dépôt) : si l'app elle-même est en panne à cause d'une connexion cassée, tu dois quand même pouvoir le lire.

Il est aussi affiché dans l'app, dans **Réglages → Connexions**, avec le statut en direct de chaque service.

Aucun secret n'est écrit ici — uniquement des identifiants publics (URL, noms de projet, ID d'organisation) et des instructions. Les vraies clés vivent uniquement dans `.env.local` (jamais commité).

---

## Supabase (base de données + authentification)

**À quoi ça sert** : héberge la base de données Postgres et gère la connexion par lien magique.

**Compte** : [supabase.com/dashboard](https://supabase.com/dashboard), organisation "misterwalt68's Org".
**Projet** : "Patrimoine", référence `qxeqaxiuldtocgbreojx`, région `eu-west-3` (Paris).

**Ce qui a été configuré** :
- Base de données Postgres, connectée en mode "Transaction pooler" (port 6543) — obligatoire pour un environnement serverless comme Vercel.
- Auth par lien magique (email), un seul compte autorisé : `maxime.walter1994@gmail.com` (vérifié en plus par l'app elle-même, dans `src/proxy.ts`).
- URL de redirection autorisée après clic sur le lien magique : `http://localhost:3000/auth/callback` (à ajouter aussi l'URL de production le jour du déploiement — Authentication → URL Configuration → Redirect URLs).

**Variables dans `.env.local`** : `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`.

**Pièges connus** :
- Le mailer gratuit de Supabase (partagé, pas de compte email dédié) limite l'envoi à quelques emails de connexion par heure. Si le lien magique ne part plus : c'est probablement ça, attendre ~1h. La solution définitive serait de configurer un SMTP personnalisé (Authentication → Emails → SMTP Settings) — pas fait, pas prioritaire pour un usage solo.
- Un lien magique est à **usage unique** et doit être ouvert **dans le même navigateur** que celui qui l'a demandé (contrainte technique du protocole PKCE). L'ouvrir depuis un autre appareil/navigateur/app Mail donne une erreur "otp_expired" qui n'a rien à voir avec une vraie expiration.
- Supabase a renommé ses clés API mi-2026 : "anon key" → "publishable key", "service_role key" → "secret key" (nouveau format `sb_publishable_...` / `sb_secret_...`). Si un jour la doc ou l'interface parle encore d'"anon key", c'est l'ancien nom.

**Pour recréer la clé si besoin** : Project Settings → API Keys → "New publishable key" / "New secret key".

**Mis en place le** : 2026-09-19.

---

## Coinbase (lecture seule — soldes crypto)

**À quoi ça sert** : synchronise automatiquement les positions crypto (Bitcoin, etc.) détenues sur Coinbase — bouton "Synchroniser" sur l'écran Patrimoine.

**Compte** : [coinbase.com/settings/api](https://www.coinbase.com/settings/api), organisation CDP `b4ba34c9-71ad-4089-9d1c-a31239b7b87e`.

**Ce qui a été configuré** :
- Une clé API "CDP" (Coinbase Developer Platform), permissions **lecture seule** uniquement (jamais de trading, virement ou retrait).
- Type de clé : **ECDSA** (courbe P-256, format PEM). **Important : pas Ed25519** — c'est le piège le plus probable si ça recasse un jour.

**Variables dans `.env.local`** : `COINBASE_CDP_KEY_NAME` (identifiant, pas secret), `COINBASE_CDP_PRIVATE_KEY` (la clé privée PEM, secrète).

**Comment ça marche techniquement** : chaque appel à l'API Coinbase est signé avec un jeton JWT (algorithme ES256) généré à la volée par `src/lib/coinbase/jwt.ts`, valable 2 minutes. Pas de bibliothèque JWT ajoutée — signature faite à la main avec le module `crypto` intégré à Node.

**Pièges connus** :
- Coinbase propose deux types de clés à la création : **ECDSA** et **Ed25519**. Seul ECDSA fonctionne pour lire les soldes des comptes personnels (`/api/v3/brokerage/accounts`) — Ed25519 est réservé à d'autres produits Coinbase (portefeuilles on-chain). La première clé créée le 2026-09-19 était en Ed25519 et ne fonctionnait pas ; il a fallu la recréer en ECDSA.
- La synchronisation ignore volontairement les cryptos dont la valeur estimée est sous un seuil ("poussière" — réglage `parametres.seuil_poussiere_crypto`, 5 € par défaut) : les petits reliquats illiquides (ex. GALA, VeChain à quelques centimes) ne polluent pas le portefeuille.
- Les fonds "stakés"/bloqués sont inclus dans le calcul (solde disponible + solde bloqué additionnés), pas seulement le solde immédiatement vendable.
- Si un solde disparaît de Coinbase (vendu) ou repasse sous le seuil, la position correspondante est supprimée automatiquement à la prochaine synchronisation — Coinbase fait toujours foi.

**Pour recréer la clé si besoin** : supprimer l'ancienne sur coinbase.com/settings/api, en créer une nouvelle avec **ECDSA** et permissions lecture seule, donner le fichier de clé à Claude (il l'enregistre dans `.env.local` puis supprime le fichier — ne jamais le laisser traîner dans le dossier du projet).

**Mis en place le** : 2026-09-19.

---

## À venir (pas encore configurés)

- **Vercel** (hébergement) — SPEC.md §12.
- **Enable Banking** (DSP2 — BoursoBank, Crédit Mutuel) — SPEC.md §5.1.
- **Twelve Data** (cours actions/ETF) — SPEC.md §5.2.
- **Fournisseur de cours des métaux** (or) — SPEC.md §5.2, pas encore choisi.
- **Console Anthropic** (IA — dictée, photo de ticket, bilan mensuel) — SPEC.md §3.

Ce fichier sera complété au fur et à mesure que chacun sera mis en place.

---

## Cours de l'or (goldprice.dev)

**À quoi ça sert** : valorise automatiquement l'or physique (SPEC.md §5.6) une fois le poids saisi une fois.

**Compte** : aucun — gratuit, sans clé API, sans inscription. Vérifié en direct (`curl`) avant intégration.

**Endpoint** : `https://api.goldprice.dev/v1/prices?symbol=XAU-EUR-SPOT`. Renvoie le prix au comptant en once troy ; converti en €/gramme dans `src/lib/pricing/adaptateurs/metaux.ts` (÷ 31,1034768).

**Pas de variable d'environnement** — rien à configurer, ni à casser.

**Mis en place le** : 2026-09-19.

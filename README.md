# Patrimoine

Application patrimoniale et budgétaire personnelle. Voir [SPEC.md](./SPEC.md) (cahier des charges) et [CONTEXTE.md](./CONTEXTE.md) (pourquoi ce projet existe) avant toute modification.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind v4 · Drizzle ORM · PostgreSQL (Supabase) · Auth magic link (Supabase) · PWA installable.

## Comptes à créer (une seule fois, par toi)

Je ne peux ni créer de comptes externes ni saisir de mot de passe à ta place. Voici l'ordre, tiré de `SPEC.md` §12 :

1. **Vercel** — https://vercel.com/signup (hébergement).
2. **Supabase** — https://supabase.com/dashboard (base de données Postgres + auth + storage). Choisis une région Europe (ex. `eu-west-3`).
3. **Enable Banking** — https://enablebanking.com, mode *Restricted Production*.
4. **Twelve Data** — https://twelvedata.com (cours actions/ETF, palier gratuit).
5. Un fournisseur de cours des métaux (palier gratuit — à choisir).
6. **Coinbase** — créer une clé API en **lecture seule** uniquement.
7. **Console Anthropic** — https://console.anthropic.com (clé API).

## Configuration locale

```bash
cp .env.example .env.local
```

Remplis `.env.local` avec les clés obtenues ci-dessus (jamais commité — déjà dans `.gitignore`).

## Base de données

```bash
npm run db:generate   # génère une migration SQL à partir de src/db/schema.ts
npm run db:migrate    # applique les migrations à la base (DATABASE_URL requis)
npm run db:studio     # interface web pour inspecter les données
```

## Développement

```bash
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000). Le premier écran demande un email + mot de passe — seules les adresses listées dans `OWNER_EMAILS` (.env.local, séparées par des virgules) sont autorisées.

## Où en est le projet

Voir la fin de chaque lot de livraison (`SPEC.md` §11) pour le détail. Lot 0 en cours : schéma de base, authentification, coquille PWA, écrans de réglages (établissements, comptes, enveloppes, actifs, catégories, personnes).

# Cahier des charges — application patrimoniale et budgétaire personnelle

Document de référence du projet. À lire intégralement avant d'écrire la moindre ligne de code.

---

## 1. Ce qu'on construit

Une application web personnelle, hébergée, installée sur iPhone en PWA, qui remplace un tableau Excel de suivi patrimonial.

Elle sert trois objectifs, dans cet ordre de priorité :

1. **Savoir ce que coûte une vie.** Capturer chaque dépense avec son contexte, et ramener le coût de la vie à un chiffre quotidien compréhensible.
2. **Suivre le patrimoine en temps réel** sans saisie manuelle récurrente.
3. **Piloter** : écarts à l'allocation cible, compteurs fiscaux, mémoire des décisions passées, projections.

Utilisateur unique : Maxime. Consultation à 95 % sur iPhone.

---

## 2. Règle d'architecture n°1 : rien n'est codé en dur

**C'est la contrainte la plus importante du projet. Toute violation est un bug bloquant.**

Aucun des éléments suivants ne doit apparaître dans le code source, ni dans un `enum`, ni dans une union de types littéraux, ni dans un `switch`, ni dans une constante :

- nom d'établissement (BoursoBank, Trade Republic, AXA, Coinbase, Crédit Mutuel…)
- nom ou symbole d'actif (BTC, ETH, un ISIN, un ticker…)
- type d'enveloppe (PEA, PER, assurance-vie, Livret A…)
- catégorie de dépense
- bien immobilier, société, personne

Tout cela vit en base de données, est créé et modifié **depuis l'interface**, sans déploiement.

Conséquences concrètes à vérifier en recette :

- Ajouter Solana au portefeuille = choisir le type `crypto`, saisir le symbole, sélectionner une source de prix. Zéro ligne de code.
- Ajouter une nouvelle banque = créer l'établissement, lancer la connexion. Zéro ligne de code.
- Ajouter une SCPI, un PEA-PME, un nouveau bien locatif, une nouvelle personne = formulaire. Zéro ligne de code.
- Créer, renommer, fusionner ou supprimer une catégorie de dépense = formulaire.

Les **règles fiscales** (plafonds de livrets, durée de maturité d'une enveloppe, abattements) sont également des **données**, stockées dans une table `regles_fiscales` versionnée par date d'effet, jamais des constantes. Un changement de plafond se corrige par une ligne en base.

Le **moteur de prix** est un registre d'adaptateurs. Chaque actif porte une source (`coingecko`, `twelvedata`, `metaux`, `manuel`…) et un identifiant dans cette source. Ajouter un actif n'exige jamais de toucher au moteur ; ajouter une *source* est la seule opération qui demande du code, et elle doit consister à écrire un adaptateur respectant une interface unique.

---

## 3. Stack

- **Front** : Next.js (App Router) + TypeScript + Tailwind. PWA installable, manifeste, service worker, notifications push Web (iOS 16.4+ sur app installée sur l'écran d'accueil).
- **Base** : PostgreSQL managé (Supabase ou Neon). Migrations versionnées.
- **Hébergement** : Vercel. Jobs planifiés via cron.
- **Auth** : simple et robuste, un seul compte. Magic link ou passkey. Pas de mot de passe stocké.
- **IA** : API Anthropic, clé côté serveur uniquement, jamais exposée au client.

Toutes les clés et secrets en variables d'environnement. Aucun secret dans le dépôt, jamais, même en commentaire ou en exemple.

---

## 4. Modèle de données

Schéma indicatif. Les noms peuvent évoluer, la généricité ne peut pas.

**`personnes`** — Maxime, Amélie, Couple. Extensible (enfants à venir).

**`institutions`** — nom, type (`banque`, `courtier`, `assureur`, `plateforme_crypto`, `autre`), méthode de connexion (`psd2`, `api`, `email`, `manuel`), état et date d'expiration du consentement.

**`comptes`** — rattaché à une institution et à une personne. Porte un `type_enveloppe` (clé étrangère vers `enveloppes`), une devise, une date d'ouverture, un état actif/clos.

**`enveloppes`** — table de référence éditable : libellé, fiscalité applicable, plafond éventuel, durée de maturité éventuelle, liquidité. C'est ici que vivent PEA, PER, AV, Livret A, CTO, compte courant, et tout ce qui viendra.

**`actifs`** — libellé, type (`action`, `etf`, `crypto`, `metal`, `fonds`, `immobilier`, `cash`, `autre`), identifiant externe (ISIN, ticker, symbole), devise, source de prix, identifiant dans cette source.

**`positions`** — compte, actif, quantité, prix de revient moyen. La quantité est la vérité ; la valeur est toujours calculée, jamais stockée.

**`cours`** — série temporelle : actif, horodatage, prix, source. Sert aux graphiques et à l'historique.

**`mouvements`** — achat, vente, apport, retrait, dividende, intérêt, frais, impôt. Porte compte, actif éventuel, quantité, montant, date, source (`psd2`, `email`, `manuel`, `estime`) et un niveau de confiance.

**`plans_investissement`** — achats programmés : compte, actif, montant, périodicité, jour d'exécution, date de début et de fin.

**`transactions`** — dépenses et revenus du quotidien : montant, date, compte, personne, catégorie, commerçant, note libre, pièce jointe, récurrent ou non, source, statut (`a_categoriser`, `categorise`).

**`categories`** — arborescentes, éditables, avec une catégorie parente optionnelle.

**`regles_categorisation`** — apprises ou saisies : motif de libellé, commerçant, catégorie cible, personne par défaut.

**`biens`** et **`credits`** — immobilier : valeur estimée, quote-part de détention par personne, capital restant dû, taux, mensualité, date de fin, loyers, charges, régime fiscal.

**`objectifs`** — libellé, montant cible optionnel, échéance optionnelle, comptes ou actifs concernés.

**`decisions`** — journal des arbitrages : date, description, montant, raisonnement libre, positions concernées, date de relecture programmée.

**`regles_fiscales`** — versionnées par date d'effet.

**`parametres`** — TMI, allocation cible par type d'actif, seuils d'alerte, préférences.

---

## 5. Sources de données et automatisation

### 5.1 Comptes bancaires — DSP2

Fournisseur : **Enable Banking**, mode *Restricted Production* (gratuit, réservé à ses propres comptes). Inscription auto-servie.

Périmètre initial : BoursoBank, Crédit Mutuel. Le système doit accepter n'importe quel établissement supplémentaire sans modification de code.

Récupération deux fois par jour. Toute opération entrante devient une `transaction` au statut `a_categoriser`, sauf si une règle de catégorisation s'applique.

Le consentement DSP2 expire au bout de 90 jours. L'application doit :

- afficher en permanence l'état et la date d'expiration de chaque connexion ;
- notifier 7 jours avant expiration ;
- offrir un bouton de reconnexion en un geste ;
- ne jamais échouer silencieusement.

### 5.2 Cours de marché

Rafraîchissement toutes les 15 minutes en heures de marché, moins fréquemment sinon.

- Crypto : CoinGecko ou équivalent gratuit.
- Actions et ETF : Twelve Data ou équivalent, avec mapping ISIN vers ticker stocké en base, pas en code.
- Métaux : API cours de l'or en euros par gramme.
- Fonds et unités de compte : valeur liquidative par ISIN.

Chaque appel est mis en cache, les échecs sont retentés avec backoff, et l'app affiche toujours la date du dernier cours connu plutôt qu'un chiffre faussement frais.

### 5.3 Trade Republic

**À vérifier au lot 0, avant de coder quoi que ce soit :**

1. Trade Republic Bank GmbH figure-t-elle dans la liste des établissements d'Enable Banking ? Si oui, connecter le compte espèces, ce qui donne virements, intérêts et paiements carte. La DSP2 ne couvre jamais le portefeuille titres.
2. Les avis d'exécution arrivent-ils par e-mail, ou uniquement dans l'espace Documents de l'application ? Inspecter la boîte Gmail réelle.

**Mécanisme principal — quantités reconstituées.** La valeur d'une ligne est toujours quantité multipliée par cours. Le cours est automatique. Seule la quantité doit être suivie, et elle ne change qu'à l'exécution d'un ordre.

- Amorçage : import ponctuel du relevé de portefeuille, ou lecture de captures d'écran par l'IA. Opération unique.
- Ensuite, chaque exécution est captée depuis les avis (e-mail si disponible, sinon relevé mensuel déposé dans l'app), parsée par l'IA, et met à jour la position.

**Achats programmés.** Les plans déclarés dans `plans_investissement` sont anticipés : à la date d'exécution prévue, l'app crée un mouvement `estime` avec la quantité calculée au cours du jour, marqué comme provisoire dans l'interface. À réception de l'avis réel, le mouvement est remplacé par sa version confirmée. La position n'est donc jamais en retard, et devient exacte après confirmation.

**Interdit :** toute bibliothèque non officielle imitant l'application mobile Trade Republic. Cela viole les conditions d'utilisation et expose le compte à une restriction.

### 5.4 Coinbase

API officielle, clé en **lecture seule**, jamais de permission de retrait ou de trading. Récupération des soldes et de l'historique.

### 5.5 PER AXA

Pas d'API. Traitement identique à Trade Republic :

- unités de compte : nombre de parts saisi une fois, valorisation automatique par ISIN ;
- fonds en euros : pas de cours quotidien, l'app capitalise au taux de l'année précédente et se recale au relevé annuel ;
- versements : captés automatiquement côté compte bancaire émetteur.

### 5.6 Or physique

Poids en grammes saisi une fois. Valorisation automatique au cours. Totalement automatique.

### 5.7 Immobilier

Saisie manuelle de la valeur estimée, révisable quand l'utilisateur le décide. Loyers et charges captés côté bancaire quand ils transitent par un compte connecté.

---

## 6. Capture des dépenses

C'est la fonctionnalité qui décide du succès du projet. Deux filets complémentaires.

### Filet 1 — instantané

Raccourci iOS déclenché par l'automatisation **Wallet / Transaction**, réglée sur exécution immédiate. Il envoie montant et commerçant à un webhook authentifié par jeton.

L'app crée une transaction provisoire et envoie une notification push. Un appui ouvre l'écran de complément, qui propose trois modes :

- **dictée** : champ texte, micro du clavier iOS. La phrase est envoyée à l'IA avec la liste des catégories existantes et renvoie montant, catégorie, commerçant, bénéficiaire, note ;
- **photo du ticket** : `capture="environment"`, stockage de l'image, lecture par l'IA pour extraire montant, commerçant et date ;
- **manuel** : grille de gros boutons de catégories.

Un second raccourci, posé sur le bouton Action, ouvre directement l'écran de capture pour les paiements hors Apple Pay, les espèces et les virements.

Le webhook est authentifié par un jeton secret en en-tête, avec limitation de débit. Il ne fait jamais confiance au contenu reçu pour autre chose que créer une transaction en attente.

### Filet 2 — rattrapage

Le flux DSP2 garantit l'exhaustivité. Toute opération sans contexte alimente une file « à catégoriser », avec un rappel quotidien en fin de journée si la file n'est pas vide.

### Réconciliation

Les captures instantanées et les opérations bancaires sont rapprochées par montant et fenêtre de date, avec validation de l'utilisateur en cas d'ambiguïté. Aucun double comptage.

### Apprentissage

Chaque catégorisation manuelle alimente `regles_categorisation`. Au bout de quelques semaines, la majorité des opérations récurrentes est classée sans intervention. Les règles sont consultables et modifiables.

---

## 7. Écrans

### Accueil, dans cet ordre exact

1. **« Ta vie te coûte X € par jour »** — moyenne des dépenses réelles sur 3 mois glissants ramenée au jour. Chiffre dominant, lisible en une seconde.
2. **« Ta vie te rapporte Y € par jour »** — revenus du travail, revenus locatifs et performance des placements, ramenés au jour, ventilés.
3. **Le delta**, en vert ou rouge.
4. Dépenses du mois en cours comparées à la moyenne, et trois premiers postes.
5. Patrimoine net total et variation du mois.
6. Allocation en barre horizontale avec écart à la cible.

### Patrimoine

Vue par établissement, par enveloppe, par type d'actif, par personne. Détail ligne par ligne.

Séparation stricte et permanente entre **apports** et **performance** : « tu as mis X de ta poche, l'argent a généré Y tout seul ». Au global, par enveloppe et par ligne. TRI annualisé.

Indicateur de fraîcheur sur chaque valeur : date du dernier cours, et marquage visible des positions provisoires.

### Dépenses

File « à catégoriser » en tête. Historique filtrable. Vue par catégorie, par personne, par mois. Comparaison au même mois de l'année précédente.

**Détection de fuites** : abonnements dormants, dépenses récurrentes en hausse de plus de 20 % sur 3 mois, postes qui dérivent.

### Immobilier

Par bien : valeur, quote-part, capital restant dû, valeur nette, LTV, cash-flow mensuel, rentabilité brute et nette, échéancier de prêt.

Gère la détention indirecte : une SCI où l'utilisateur détient une fraction des parts, et où une autre personne du foyer en détient une autre.

### Fiscalité

Compteurs calculés automatiquement à partir de `regles_fiscales` : maturité des enveloppes, abattements disponibles, plafond PER restant et économie d'impôt selon la TMI, remplissage des livrets, imposition estimée en cas de sortie.

### Journal de décisions

Saisie d'un arbitrage avec son raisonnement. Relecture automatique à 3, 6 et 12 mois, avec le résultat réel chiffré présenté à côté du raisonnement d'origine.

### Simulateurs

Projection à N années paramétrable en rendement et en effort d'épargne. Simulateur d'objectif : combien il faut, à quelle date, selon la trajectoire actuelle. Impact fiscal d'un versement PER.

### Réglages

Établissements et connexions, actifs, enveloppes, catégories, personnes, allocation cible, seuils d'alerte, règles fiscales, plans d'investissement, export complet.

### Bilan mensuel

Généré par l'IA : ce qui a été investi et dépensé, ventilé, et ce qui change par rapport à l'habitude. Ton factuel, pas moralisateur.

---

## 8. Ce que l'application ne fait pas

Pas de recommandation d'achat ou de vente de titres. Pas de signal de market timing. Pas de prédiction de crise. Pas de conseil en investissement personnalisé.

L'app mesure des écarts par rapport aux cibles définies par l'utilisateur lui-même, et lui rappelle ses propres décisions passées avec leur résultat. C'est de l'arithmétique sur ses règles, pas une opinion de marché.

---

## 9. Design

Sobre et dense, entre Trade Republic et Finary. Fond sombre par défaut. Typographie nette, chiffres qui respirent. Très peu de couleurs : le vert est la couleur d'accent principale (utilisée aussi pour les variations positives), le rouge reste réservé aux variations négatives. Pas d'emoji dans l'interface.

*Mise à jour du 2026-09-19, décision de Maxime après avoir vu une maquette de référence :* une légère lueur (halo doux, dégradé discret) est autorisée sur les cartes clés d'un écran (ex. la carte de solde/coût du jour en haut de l'accueil) pour un rendu plus premium. Ça reste l'exception, pas la norme : pas de dégradé ni d'ombre sur les cartes secondaires, les listes, ou les écrans de réglages.

Une touche de personnalité dans les micro-textes et les états vides, jamais dans les chiffres.

Mobile d'abord, cible 390 px de large. Safe-areas iOS respectées. Cibles tactiles de 44 px minimum. `inputmode="decimal"` sur tout champ monétaire. Utilisable d'une seule main, au pouce.

---

## 10. Sécurité

- Clés API uniquement côté serveur. Jamais dans le bundle client.
- Coinbase en lecture seule. Enable Banking en lecture seule. Aucune capacité d'initiation de paiement, nulle part.
- Webhook du raccourci iOS authentifié par jeton et limité en débit.
- Chiffrement des jetons de consentement au repos.
- Journal d'audit des synchronisations et des erreurs.
- Export complet des données à la demande, en CSV et en JSON. L'utilisateur doit toujours pouvoir partir avec ses données.
- Sauvegarde automatique de la base.

---

## 11. Lots de livraison

**Lot 0 — vérifications et socle.** Répondre aux deux questions ouvertes sur Trade Republic. Créer les comptes de service. Schéma de base, migrations, authentification, coquille PWA installable. Écrans de réglages permettant de créer établissements, comptes, enveloppes, actifs, catégories et personnes.

**Lot 1 — patrimoine.** Moteur de prix et ses adaptateurs. Positions et mouvements. Séparation apports et performance. TRI. Connexion Coinbase. Amorçage des positions Trade Republic et AXA. Or.

**Lot 2 — dépenses.** Connexion DSP2. Raccourci iOS et webhook. Les trois modes de capture. File à catégoriser. Règles apprises. Réconciliation.

**Lot 3 — accueil.** Coût et gain quotidiens. Allocation et écart à la cible. Détection de fuites. Notifications push.

**Lot 4 — pilotage.** Fiscalité. Immobilier et SCI. Journal de décisions. Bilan mensuel par l'IA.

**Lot 5 — projection.** Simulateurs. Import de l'historique Excel existant.

Chaque lot doit être déployé et utilisable avant d'attaquer le suivant.

---

## 12. Comptes à créer, dans l'ordre

1. Compte d'hébergement (Vercel) et dépôt Git.
2. Base de données managée (Supabase ou Neon).
3. Enable Banking, mode Restricted Production. Demande une page de conditions d'utilisation et une politique de confidentialité, même minimales, pour un usage personnel non commercial.
4. Fournisseur de cours actions et ETF, palier gratuit.
5. Fournisseur de cours métaux, palier gratuit.
6. Coinbase : clé API en lecture seule.
7. Console Anthropic : clé API.

---

## 13. Méthode de travail attendue

Poser les questions bloquantes en début de lot, sous forme de liste courte et numérotée, jamais toutes d'un coup. Pour tout le reste, faire des choix par défaut raisonnables et les signaler en fin de lot.

Écrire des tests sur ce qui compte : moteur de prix, calcul du TRI, séparation apports et performance, réconciliation des dépenses, compteurs fiscaux.

Ne jamais introduire une valeur en dur qui aurait dû être une donnée. En cas de doute, c'est une donnée.

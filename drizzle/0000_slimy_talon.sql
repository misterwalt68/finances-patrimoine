CREATE TABLE "actifs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"libelle" text NOT NULL,
	"type" text NOT NULL,
	"identifiant_externe" text,
	"devise" text DEFAULT 'EUR' NOT NULL,
	"source_prix" text NOT NULL,
	"identifiant_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "biens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"libelle" text NOT NULL,
	"valeur_estimee" numeric(14, 2),
	"valeur_estimee_mise_a_jour_le" date,
	"regime_fiscal" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "biens_detentions" (
	"bien_id" uuid NOT NULL,
	"personne_id" uuid NOT NULL,
	"quote_part" numeric(5, 2) NOT NULL,
	CONSTRAINT "biens_detentions_bien_id_personne_id_pk" PRIMARY KEY("bien_id","personne_id")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"libelle" text NOT NULL,
	"parent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comptes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution_id" uuid NOT NULL,
	"personne_id" uuid NOT NULL,
	"enveloppe_id" uuid NOT NULL,
	"libelle" text NOT NULL,
	"devise" text DEFAULT 'EUR' NOT NULL,
	"date_ouverture" date,
	"actif" boolean DEFAULT true NOT NULL,
	"enable_banking_account_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actif_id" uuid NOT NULL,
	"horodatage" timestamp with time zone NOT NULL,
	"prix" numeric(18, 6) NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bien_id" uuid NOT NULL,
	"capital_restant_du" numeric(14, 2) NOT NULL,
	"taux" numeric(6, 4),
	"mensualite" numeric(10, 2),
	"date_fin" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"description" text NOT NULL,
	"montant" numeric(14, 2),
	"raisonnement" text,
	"date_relecture_programmee" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enveloppes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"libelle" text NOT NULL,
	"fiscalite_description" text,
	"plafond" numeric(14, 2),
	"duree_maturite_mois" integer,
	"liquidite" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nom" text NOT NULL,
	"type" text NOT NULL,
	"methode_connexion" text NOT NULL,
	"consentement_etat" text,
	"consentement_expire_le" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evenement" text NOT NULL,
	"niveau" text DEFAULT 'info' NOT NULL,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mouvements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"compte_id" uuid NOT NULL,
	"actif_id" uuid,
	"type" text NOT NULL,
	"quantite" numeric(24, 8),
	"montant" numeric(14, 2) NOT NULL,
	"date" date NOT NULL,
	"source" text NOT NULL,
	"niveau_confiance" text DEFAULT 'confirme' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "objectifs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"libelle" text NOT NULL,
	"montant_cible" numeric(14, 2),
	"echeance" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parametres" (
	"cle" text PRIMARY KEY NOT NULL,
	"valeur" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personnes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"libelle" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans_investissement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"compte_id" uuid NOT NULL,
	"actif_id" uuid NOT NULL,
	"montant" numeric(14, 2) NOT NULL,
	"periodicite" text NOT NULL,
	"jour_execution" integer,
	"date_debut" date NOT NULL,
	"date_fin" date,
	"actif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"compte_id" uuid NOT NULL,
	"actif_id" uuid NOT NULL,
	"quantite" numeric(24, 8) NOT NULL,
	"prix_revient_moyen" numeric(14, 4),
	"provisoire" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regles_categorisation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"motif_libelle" text,
	"commercant" text,
	"categorie_id" uuid NOT NULL,
	"personne_defaut_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regles_fiscales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cle" text NOT NULL,
	"valeur" jsonb NOT NULL,
	"date_effet" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"compte_id" uuid,
	"personne_id" uuid,
	"categorie_id" uuid,
	"montant" numeric(14, 2) NOT NULL,
	"date" date NOT NULL,
	"commercant" text,
	"note" text,
	"piece_jointe_url" text,
	"recurrent" boolean DEFAULT false NOT NULL,
	"source" text NOT NULL,
	"statut" text DEFAULT 'a_categoriser' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "biens_detentions" ADD CONSTRAINT "biens_detentions_bien_id_biens_id_fk" FOREIGN KEY ("bien_id") REFERENCES "public"."biens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biens_detentions" ADD CONSTRAINT "biens_detentions_personne_id_personnes_id_fk" FOREIGN KEY ("personne_id") REFERENCES "public"."personnes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comptes" ADD CONSTRAINT "comptes_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comptes" ADD CONSTRAINT "comptes_personne_id_personnes_id_fk" FOREIGN KEY ("personne_id") REFERENCES "public"."personnes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comptes" ADD CONSTRAINT "comptes_enveloppe_id_enveloppes_id_fk" FOREIGN KEY ("enveloppe_id") REFERENCES "public"."enveloppes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cours" ADD CONSTRAINT "cours_actif_id_actifs_id_fk" FOREIGN KEY ("actif_id") REFERENCES "public"."actifs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credits" ADD CONSTRAINT "credits_bien_id_biens_id_fk" FOREIGN KEY ("bien_id") REFERENCES "public"."biens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mouvements" ADD CONSTRAINT "mouvements_compte_id_comptes_id_fk" FOREIGN KEY ("compte_id") REFERENCES "public"."comptes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mouvements" ADD CONSTRAINT "mouvements_actif_id_actifs_id_fk" FOREIGN KEY ("actif_id") REFERENCES "public"."actifs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans_investissement" ADD CONSTRAINT "plans_investissement_compte_id_comptes_id_fk" FOREIGN KEY ("compte_id") REFERENCES "public"."comptes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans_investissement" ADD CONSTRAINT "plans_investissement_actif_id_actifs_id_fk" FOREIGN KEY ("actif_id") REFERENCES "public"."actifs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_compte_id_comptes_id_fk" FOREIGN KEY ("compte_id") REFERENCES "public"."comptes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_actif_id_actifs_id_fk" FOREIGN KEY ("actif_id") REFERENCES "public"."actifs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regles_categorisation" ADD CONSTRAINT "regles_categorisation_categorie_id_categories_id_fk" FOREIGN KEY ("categorie_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regles_categorisation" ADD CONSTRAINT "regles_categorisation_personne_defaut_id_personnes_id_fk" FOREIGN KEY ("personne_defaut_id") REFERENCES "public"."personnes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_compte_id_comptes_id_fk" FOREIGN KEY ("compte_id") REFERENCES "public"."comptes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_personne_id_personnes_id_fk" FOREIGN KEY ("personne_id") REFERENCES "public"."personnes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_categorie_id_categories_id_fk" FOREIGN KEY ("categorie_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
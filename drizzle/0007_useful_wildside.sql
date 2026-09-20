CREATE TABLE "charges_revenus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"libelle" text NOT NULL,
	"periodicite" text NOT NULL,
	"personne_id" uuid NOT NULL,
	"fournisseur" text,
	"numero_client" text,
	"lien_suivi" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "charges_revenus_historique" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"charge_revenu_id" uuid NOT NULL,
	"montant" numeric(12, 2) NOT NULL,
	"date_effet" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "charges_revenus" ADD CONSTRAINT "charges_revenus_personne_id_personnes_id_fk" FOREIGN KEY ("personne_id") REFERENCES "public"."personnes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charges_revenus_historique" ADD CONSTRAINT "charges_revenus_historique_charge_revenu_id_charges_revenus_id_fk" FOREIGN KEY ("charge_revenu_id") REFERENCES "public"."charges_revenus"("id") ON DELETE cascade ON UPDATE no action;
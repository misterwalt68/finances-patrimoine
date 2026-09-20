CREATE TABLE "historique_patrimoine" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"horodatage" timestamp with time zone NOT NULL,
	"type" text NOT NULL,
	"valeur" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

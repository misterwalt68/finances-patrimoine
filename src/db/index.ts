import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { schema } from "./schema";

// Connexion créée à la première utilisation réelle, pas à l'import du module :
// Next.js importe les pages pendant `next build` (pour lire leur config) même
// si elles sont marquées `force-dynamic` — sans ce délai, le build échoue dès
// qu'une page touche `db`, avant même que DATABASE_URL n'existe (Lot 0, avant
// création du compte Supabase).
let instance: PostgresJsDatabase<typeof schema> | null = null;

function obtenirDb(): PostgresJsDatabase<typeof schema> {
  if (instance) return instance;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL manquant — voir .env.example");
  }

  // `prepare: false` est requis derrière le pooler Supabase (pgbouncer en mode transaction).
  const client = postgres(connectionString, { prepare: false });
  instance = drizzle(client, { schema });
  return instance;
}

export const db: PostgresJsDatabase<typeof schema> = new Proxy(
  {} as PostgresJsDatabase<typeof schema>,
  {
    get(_target, prop, receiver) {
      return Reflect.get(obtenirDb(), prop, receiver);
    },
  },
);

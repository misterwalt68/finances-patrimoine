import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { schema } from "./schema";

// Le driver `postgres` ne se connecte qu'à la première requête réelle (pas à
// l'import du module), donc pas besoin de retarder nous-mêmes la création du
// client : ça évitait un souci de build avant que DATABASE_URL n'existe
// (Lot 0), mais un `Proxy` maison cassait le `this` interne de Drizzle sur
// certaines méthodes (`$count` notamment). Toutes les routes sont
// `force-dynamic` (src/app/layout.tsx), donc aucune requête ne s'exécute au
// build de toute façon.
const client = postgres(process.env.DATABASE_URL ?? "", { prepare: false });

export const db = drizzle(client, { schema });

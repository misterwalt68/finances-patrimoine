"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { personnes } from "@/db/schema";

export async function creerPersonne(formData: FormData) {
  const libelle = String(formData.get("libelle") ?? "").trim();
  if (!libelle) return;

  await db.insert(personnes).values({ libelle });
  revalidatePath("/reglages/personnes");
}

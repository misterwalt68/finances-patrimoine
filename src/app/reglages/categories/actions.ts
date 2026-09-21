"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";

export async function creerCategorie(formData: FormData) {
  const libelle = String(formData.get("libelle") ?? "").trim();
  if (!libelle) return;

  const parentId = String(formData.get("parentId") ?? "").trim();
  const icone = String(formData.get("icone") ?? "").trim();

  await db.insert(categories).values({
    libelle,
    parentId: parentId || null,
    icone: icone || null,
  });
  revalidatePath("/reglages/categories");
  revalidatePath("/depenses");
}

export async function modifierCategorie(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const libelle = String(formData.get("libelle") ?? "").trim();
  if (!id || !libelle) return;

  const icone = String(formData.get("icone") ?? "").trim();

  await db
    .update(categories)
    .set({ libelle, icone: icone || null })
    .where(eq(categories.id, id));

  revalidatePath("/reglages/categories");
  revalidatePath("/depenses");
  revalidatePath("/depenses/trier");
}

"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { categories } from "@/db/schema";

export async function creerCategorie(formData: FormData) {
  const libelle = String(formData.get("libelle") ?? "").trim();
  if (!libelle) return;

  const parentId = String(formData.get("parentId") ?? "").trim();

  await db.insert(categories).values({
    libelle,
    parentId: parentId || null,
  });
  revalidatePath("/reglages/categories");
}

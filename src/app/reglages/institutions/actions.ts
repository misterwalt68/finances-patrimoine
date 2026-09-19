"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { institutions } from "@/db/schema";

export async function creerInstitution(formData: FormData) {
  const nom = String(formData.get("nom") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const methodeConnexion = String(formData.get("methodeConnexion") ?? "").trim();
  if (!nom || !type || !methodeConnexion) return;

  await db.insert(institutions).values({ nom, type, methodeConnexion });
  revalidatePath("/reglages/institutions");
}

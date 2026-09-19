"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { enveloppes } from "@/db/schema";

export async function creerEnveloppe(formData: FormData) {
  const libelle = String(formData.get("libelle") ?? "").trim();
  if (!libelle) return;

  const plafondBrut = String(formData.get("plafond") ?? "").trim();
  const dureeBrute = String(formData.get("dureeMaturiteMois") ?? "").trim();

  await db.insert(enveloppes).values({
    libelle,
    fiscaliteDescription: String(formData.get("fiscaliteDescription") ?? "").trim() || null,
    plafond: plafondBrut ? plafondBrut : null,
    dureeMaturiteMois: dureeBrute ? Number(dureeBrute) : null,
  });
  revalidatePath("/reglages/enveloppes");
}

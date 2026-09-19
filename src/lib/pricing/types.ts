export type PrixObtenu = {
  prix: number;
  devise: string;
  horodatage: Date;
};

/**
 * Interface unique que respecte chaque adaptateur — SPEC.md §2 : "ajouter
 * une source est la seule opération qui demande du code, et elle doit
 * consister à écrire un adaptateur respectant une interface unique."
 */
export interface AdaptateurPrix {
  obtenirPrix(identifiantSource: string, devise: string): Promise<PrixObtenu>;
}

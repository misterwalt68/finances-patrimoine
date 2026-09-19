import { randomBytes, sign as signerCrypto } from "node:crypto";

function base64url(entree: Buffer | string): string {
  return Buffer.from(entree).toString("base64url");
}

/**
 * JWT d'authentification Coinbase (CDP, clé ECDSA/ES256) — un jeton par
 * requête, valable 2 minutes. Signature au format IEEE P1363 (r||s), requis
 * par la spec JWS ES256 (Node produit du DER par défaut sans cette option).
 */
export function creerJwtCoinbase(params: {
  nomCle: string;
  clePriveePem: string;
  methode: string;
  chemin: string;
}): string {
  const maintenant = Math.floor(Date.now() / 1000);

  const entete = {
    alg: "ES256",
    kid: params.nomCle,
    typ: "JWT",
    nonce: randomBytes(16).toString("hex"),
  };

  const charge = {
    iss: "cdp",
    sub: params.nomCle,
    nbf: maintenant,
    exp: maintenant + 120,
    uri: `${params.methode} api.coinbase.com${params.chemin}`,
  };

  const baseSignature = `${base64url(JSON.stringify(entete))}.${base64url(JSON.stringify(charge))}`;

  const signature = signerCrypto("sha256", Buffer.from(baseSignature), {
    key: params.clePriveePem,
    dsaEncoding: "ieee-p1363",
  });

  return `${baseSignature}.${base64url(signature)}`;
}

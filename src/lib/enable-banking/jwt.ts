import { sign as signerCrypto } from "node:crypto";

function base64url(entree: Buffer | string): string {
  return Buffer.from(entree).toString("base64url");
}

/**
 * JWT d'authentification Enable Banking — RS256, valable 1h (le maximum
 * autorisé est 24h, mais un jeton généré à chaque appel évite d'avoir à
 * gérer un cache/expiration, comme pour le JWT Coinbase).
 */
export function creerJwtEnableBanking(params: { applicationId: string; clePrivee: string }): string {
  const maintenant = Math.floor(Date.now() / 1000);

  const entete = { alg: "RS256", kid: params.applicationId, typ: "JWT" };
  const charge = {
    iss: "enablebanking.com",
    aud: "api.enablebanking.com",
    iat: maintenant,
    exp: maintenant + 3600,
  };

  const baseSignature = `${base64url(JSON.stringify(entete))}.${base64url(JSON.stringify(charge))}`;
  const signature = signerCrypto("RSA-SHA256", Buffer.from(baseSignature), params.clePrivee);

  return `${baseSignature}.${base64url(signature)}`;
}

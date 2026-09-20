import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/login", "/auth/callback", "/confidentialite", "/conditions"];

/**
 * Garde d'accès globale — foyer à deux (Maxime + Amélie), jamais un compte
 * tiers. Au-delà de la session Supabase valide, on vérifie que l'email
 * figure dans OWNER_EMAILS (liste séparée par des virgules) : un compte créé
 * pour une autre adresse ne donne jamais accès à l'app.
 */
const emailsAutorises = (process.env.OWNER_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
export async function proxy(request: NextRequest) {
  // Auth désactivée temporairement en dev pour débloquer le développement
  // (envois d'email limités le temps de finaliser la config Supabase).
  // `NODE_ENV` vaut toujours "production" sur un build/déploiement réel
  // (Vercel, `next build`) — ce court-circuit ne peut donc pas se retrouver
  // en production par oubli. À retirer avant tout usage avec de vraies
  // données personnelles. Voir mémoire "project-finances-app-setup".
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicPath = PUBLIC_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );
  const isAuthorized = !!user && !!user.email && emailsAutorises.includes(user.email.toLowerCase());

  if (!isAuthorized && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isAuthorized && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Les routes /api/* gèrent leur propre authentification (jeton webhook,
  // secret de cron) — elles ne passent pas par la session Supabase.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/).*)",
  ],
};

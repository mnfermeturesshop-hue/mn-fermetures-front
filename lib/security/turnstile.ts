/**
 * Vérification d'un token Cloudflare Turnstile côté serveur (anti-bot).
 * Skip gracieux si non configuré (pas de secret) ou pas de token, pour ne pas
 * bloquer en dev. Renvoie `false` uniquement si la vérification échoue.
 */
export async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || !token) return true;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip: ip }),
    });
    const data: { success: boolean } = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

/**
 * Limiteur de débit en mémoire (par instance) — protège les points sensibles
 * (inscription, demande pro, création de paiement) contre l'abus (audit S7/S12).
 *
 * Note : en mémoire process, donc réinitialisé à chaque déploiement et non
 * partagé entre instances serverless. Suffisant comme première barrière ;
 * pour une limite stricte multi-instances, brancher un store type Upstash/Redis.
 */
const buckets = new Map<string, { n: number; reset: number }>();

export function rateLimit(key: string, limit = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const e = buckets.get(key);
  if (!e || e.reset < now) {
    buckets.set(key, { n: 1, reset: now + windowMs });
    return true;
  }
  if (e.n >= limit) return false;
  e.n++;
  return true;
}

/** Extrait l'IP client depuis les en-têtes proxy (Vercel). */
export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    ?? req.headers.get('x-real-ip')
    ?? '127.0.0.1';
}

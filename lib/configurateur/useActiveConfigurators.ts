'use client';

import { useEffect, useState } from 'react';

/** Slugs de configurateurs actifs (null = information indisponible → ne rien masquer). */
type ActiveSet = Set<string> | null;

let cache: ActiveSet | undefined;
let inflight: Promise<ActiveSet> | null = null;

async function load(): Promise<ActiveSet> {
  if (cache !== undefined) return cache;
  if (!inflight) {
    inflight = fetch('/api/configurateurs')
      .then((r) => (r.ok ? r.json() : { slugs: null }))
      .then((d) => {
        cache = Array.isArray(d?.slugs) ? new Set<string>(d.slugs) : null;
        return cache;
      })
      .catch(() => { cache = null; return cache; });
  }
  return inflight;
}

/** Un lien /configurateur/<slug> doit-il être masqué ? Seulement si on SAIT qu'il est
 *  inactif (jamais tant que l'info n'est pas chargée, pour éviter de cacher à tort). */
export function useActiveConfigurators() {
  const [active, setActive] = useState<ActiveSet | undefined>(cache);
  useEffect(() => {
    let cancelled = false;
    load().then((s) => { if (!cancelled) setActive(s); });
    return () => { cancelled = true; };
  }, []);

  const isConfigHidden = (href: string): boolean => {
    if (active == null) return false; // non chargé / indisponible → on affiche tout
    const prefix = '/configurateur/';
    if (!href.startsWith(prefix)) return false;
    const slug = href.slice(prefix.length).split('/')[0];
    return !active.has(slug);
  };

  return { isConfigHidden };
}

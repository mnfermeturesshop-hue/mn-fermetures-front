'use client';

import { useEffect } from 'react';
import { useSurchargeStore } from '@/lib/store/surcharge';

/** Charge une fois les surcharges temporaires (globales) au montage. */
export function SurchargeSync() {
  const load = useSurchargeStore((s) => s.load);
  useEffect(() => { void load(); }, [load]);
  return null;
}

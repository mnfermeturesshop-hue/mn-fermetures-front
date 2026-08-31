'use client';

import { useConsentStore } from '@/lib/consent';

/** Ré-ouvre le panneau de préférences cookies (révocation/modification du consentement). */
export function ManageCookiesLink({ style }: { style?: React.CSSProperties }) {
  const openPrefs = useConsentStore((s) => s.openPrefs);
  return (
    <button
      type="button"
      onClick={openPrefs}
      style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer', color: '#6b8fa8', ...style }}
    >
      Gérer les cookies
    </button>
  );
}

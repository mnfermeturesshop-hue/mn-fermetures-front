import { ImageResponse } from 'next/og';

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_ALT = 'MN Fermetures, fabricant de fermetures pour les professionnels en Occitanie';

/** Rendu partagé de l'image d'aperçu marque (og:image + twitter:image). */
export function renderBrandOg() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #10314f 0%, #0e2f4c 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <div style={{ fontSize: 150, fontWeight: 800, color: '#ffffff', letterSpacing: -4 }}>mn</div>
          <div style={{ fontSize: 54, fontWeight: 700, color: '#6f93ad', letterSpacing: 14, marginLeft: 16 }}>FERMETURES</div>
        </div>
        <div style={{ marginTop: 40, fontSize: 38, fontWeight: 700, color: '#ffffff', textAlign: 'center', maxWidth: 900 }}>
          Fabricant de fermetures pour les professionnels
        </div>
        <div style={{ marginTop: 14, fontSize: 26, fontWeight: 700, letterSpacing: 3, color: '#ffcb05' }}>
          OCCITANIE · DEPUIS 40 ANS
        </div>
      </div>
    ),
    OG_SIZE,
  );
}

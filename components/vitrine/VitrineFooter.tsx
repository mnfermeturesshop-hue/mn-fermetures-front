import Link from 'next/link';

/** Pied de page minimal du site vitrine. */
export function VitrineFooter() {
  return (
    <footer className="vt-footer">
      <div className="vt-wrap">
        <div className="vt-footer-cols">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span className="vt-logo">
              <b style={{ color: '#fff' }}>mn</b>
              <span style={{ color: 'var(--steel-400)' }}>FERMETURES</span>
            </span>
            <p style={{ fontSize: 14, maxWidth: 320, margin: 0 }}>
              Fabricant français de fermetures pour les professionnels depuis 40 ans : volets, blocs baie,
              portes de garage, portails, clôtures, moustiquaires et pièces détachées. Basés en Occitanie (Hérault).
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
            <h5>Sites de production</h5>
            <span>Chemin du Mas de Pastrou, 34560 Villeveyrac</span>
            <span>2066 Av. Marcel Pagnol, 34470 Pérols</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
            <h5>Contact</h5>
            <span>04 67 78 06 63</span>
            <span>contact@mnfermetures.com</span>
            <span style={{ marginTop: 6 }}>Zone : Hérault, Aude, Pyrénées-Orientales, Gard, Bouches-du-Rhône, Vaucluse, Drôme, Ardèche</span>
          </div>
        </div>
        <div className="vt-footer-legal">
          <span>Prix HT · Franco de port en Occitanie dès 400 € HT (forfait 26 € HT en deçà).</span>
          <span style={{ display: 'flex', gap: 16 }}>
            <Link href="/cgv">CGV</Link>
            <Link href="/mentions-legales">Mentions légales</Link>
            <Link href="/confidentialite">Confidentialité</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}

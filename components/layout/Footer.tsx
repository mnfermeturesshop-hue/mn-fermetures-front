import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
  return (
    <footer className="site">
      <div className="wrap">
        <div className="cols">
          <div>
            <Link href="/" className="logo-pill" style={{ display: 'inline-flex', marginBottom: 10 }}>
              <Image
                src="/logo.png"
                alt="MN Fermetures"
                width={140}
                height={52}
                className="logo-img"
              />
            </Link>
            <p>Volets roulants, battants, BSO, portails, pergolas et accessoires sur mesure.</p>
            <p>www.mnfermetures.com · 04 67 78 06 63</p>
          </div>
          <div>
            <h5>Production</h5>
            <p>Chemin du Mas de Pastrou — 34560 Villeveyrac</p>
            <p>2066 Av. Marcel Pagnol — 34470 Pérols</p>
          </div>
          <div>
            <h5>Commerciaux</h5>
            <p>Gard &amp; Vaucluse — 06 76 26 21 95</p>
            <p>Est‑Hérault — 06 52 96 52 14</p>
            <p>Ouest‑Hérault — 06 85 09 36 13</p>
            <p>Aude &amp; P.‑O. — 07 66 35 19 05</p>
          </div>
        </div>
        <div className="legal">
          Prix HT · Livraison franco en Occitanie dès 400 € HT (forfait 26 € HT en deçà).
          <Link href="/admin" style={{ marginLeft: 16, opacity: 0.25, fontSize: 10, letterSpacing: '.05em' }}>
            ⚙
          </Link>
        </div>
      </div>
    </footer>
  );
}

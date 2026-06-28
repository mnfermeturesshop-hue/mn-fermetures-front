import type { ReactNode } from 'react';

function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden>
      <path d={d} />
    </svg>
  );
}

interface Item { icon: ReactNode; label: string; sub: string }

const ITEMS: Item[] = [
  {
    icon: <Icon d="M5 8h14M5 8a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2M5 8V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2" />,
    label: 'Expédition 24-48h',
    sub: 'Stock disponible · départ jour ouvré',
  },
  {
    icon: <Icon d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM18.5 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />,
    label: 'Livraison offerte dès 400 € HT',
    sub: 'Livraison gratuite en Occitanie',
  },
  {
    icon: <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    label: 'Garantie Somfy 7 ans',
    sub: 'Garantie constructeur jusqu\'à 7 ans',
  },
  {
    icon: <Icon d="M2 10h20M2 14h20M6 6h1M17 6h1M5 18h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z" />,
    label: 'Paiement 3× ou 4×',
    sub: 'Sans frais · CB ou virement',
  },
  {
    icon: <Icon d="M19 11H5m14 0a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2m14 0V9a2 2 0 0 0-2-2M5 11V9a2 2 0 0 1 2-2m0 0V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M7 7h10" />,
    label: 'Paiement sécurisé',
    sub: 'Données chiffrées SSL',
  },
];

export function ReassuranceStrip({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`reassurance-strip ${compact ? 'reassurance-strip--compact' : ''}`}>
      {ITEMS.map((item) => (
        <div className="reassurance-item" key={item.label}>
          <span className="reassurance-icon">{item.icon}</span>
          <div>
            <div className="reassurance-label">{item.label}</div>
            {!compact && <div className="reassurance-sub">{item.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

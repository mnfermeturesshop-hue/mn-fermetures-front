'use client';

import { LOYALTY_TIERS, LOYALTY_MAX, computeLoyalty } from '@/lib/loyalty';

const euro = (n: number) =>
  n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €';

/**
 * Jauge du programme de fidélité B2B : CA annuel (BC expédiés/livrés),
 * palier actuel, jalons des 5 paliers et prochain objectif à atteindre
 * avant le 31 décembre de l'année en cours.
 */
export function LoyaltyGauge({ caHT, year }: { caHT: number; year: number }) {
  const { tier, next, remaining, progressPct } = computeLoyalty(caHT);

  return (
    <div className="loyalty-card">
      <div className="loyalty-head">
        <div>
          <div className="loyalty-title">Programme de fidélité {year}</div>
          <div className="loyalty-ca">
            {euro(Math.round(caHT))} <small>HT commandés cette année</small>
          </div>
        </div>
        {tier ? (
          <span className="loyalty-badge" style={{ background: tier.color }}>
            {tier.label}
          </span>
        ) : (
          <span className="loyalty-badge loyalty-badge--none">
            Aucun palier
          </span>
        )}
      </div>

      {/* Jauge 0 → 100 000 € avec les 5 jalons */}
      <div className="loyalty-bar">
        <div className="loyalty-bar-fill" style={{ width: `${progressPct}%` }} />
        {LOYALTY_TIERS.map((t) => {
          const reached = caHT >= t.threshold;
          return (
            <div
              key={t.slug}
              className={`loyalty-milestone ${reached ? 'reached' : ''}`}
              style={{ left: `${(t.threshold / LOYALTY_MAX) * 100}%` }}
            >
              <span className="loyalty-milestone-dot" style={reached ? { background: t.color, borderColor: t.color } : undefined} />
              <span className="loyalty-milestone-label" style={reached ? { color: t.color } : undefined}>
                {t.label}
                <small>{t.threshold / 1000} k€</small>
              </span>
            </div>
          );
        })}
      </div>

      {next ? (
        <p className="loyalty-next">
          Plus que <strong>{euro(Math.ceil(remaining))} HT</strong> avant le palier{' '}
          <strong style={{ color: next.color }}>{next.label}</strong> — à atteindre
          avant le <strong>31 décembre {year}</strong>.
        </p>
      ) : (
        <p className="loyalty-next loyalty-next--max">
          🏆 Palier <strong>Diamant</strong> atteint — félicitations, vous êtes au sommet du programme {year} !
        </p>
      )}

      <p className="loyalty-note">
        Chaque palier atteint donne droit à une attention de notre équipe commerciale.
      </p>
    </div>
  );
}

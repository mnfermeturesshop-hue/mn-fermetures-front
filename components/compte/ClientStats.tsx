'use client';

import { isValidatedBC } from '@/lib/loyalty';

/**
 * Statistiques de l'espace client pro — 12 derniers mois glissants :
 * compteurs (devis, bons de commande, volume validé, conversion) et
 * histogramme mensuel du volume € HT des BC validés (expédiés/livrés).
 * Calculé entièrement à partir des données déjà chargées par /compte.
 */

interface StatOrder {
  created_at: string;
  status: string;
  payment_method?: string;
  total_ht: number;
}

interface StatDevis {
  created_at: string;
  status: string;
}

const euro = (n: number) =>
  n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €';

/** Libellé compact d'un mois (année affichée en janvier et sur le 1er point). */
function monthLabel(d: Date, isFirst: boolean): string {
  const m = d.toLocaleDateString('fr-FR', { month: 'short' });
  return d.getMonth() === 0 || isFirst ? `${m} ${String(d.getFullYear()).slice(2)}` : m;
}

export function ClientStats({ orders, devis }: { orders: StatOrder[]; devis: StatDevis[] }) {
  // Fenêtre glissante : du 1er du mois il y a 11 mois → aujourd'hui
  const now = new Date();
  const windowStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const inWindow = (iso: string) => new Date(iso) >= windowStart;

  const windowDevis = devis.filter((d) => inWindow(d.created_at));
  const windowBC = orders.filter(
    (o) => o.payment_method === 'bon_de_commande' && o.status !== 'cancelled' && inWindow(o.created_at)
  );
  const validated = orders.filter((o) => isValidatedBC(o) && inWindow(o.created_at));

  const volumeHT = validated.reduce((s, o) => s + Number(o.total_ht), 0);
  const converted = windowDevis.filter((d) => d.status === 'converted').length;
  const conversionPct = windowDevis.length > 0
    ? Math.round((converted / windowDevis.length) * 100)
    : null;

  // Volume validé par mois (12 points)
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const total = validated
      .filter((o) => {
        const d = new Date(o.created_at);
        return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth();
      })
      .reduce((s, o) => s + Number(o.total_ht), 0);
    return { date, total };
  });
  const maxMonth = Math.max(...months.map((m) => m.total));

  return (
    <div className="stats-wrap">
      {/* Compteurs — 12 derniers mois */}
      <div className="stats-grid">
        <div className="stats-kpi">
          <div className="stats-kpi-value">{windowDevis.length}</div>
          <div className="stats-kpi-label">Devis</div>
        </div>
        <div className="stats-kpi">
          <div className="stats-kpi-value">{windowBC.length}</div>
          <div className="stats-kpi-label">Bons de commande</div>
        </div>
        <div className="stats-kpi">
          <div className="stats-kpi-value">{euro(Math.round(volumeHT))}</div>
          <div className="stats-kpi-label">Volume validé HT<br /><small>expédié ou livré</small></div>
        </div>
        <div className="stats-kpi">
          <div className="stats-kpi-value">{conversionPct === null ? '—' : `${conversionPct} %`}</div>
          <div className="stats-kpi-label">Devis convertis</div>
        </div>
      </div>

      {/* Histogramme mensuel du volume validé */}
      <div className="stats-chart-card">
        <div className="stats-chart-title">Volume commandé validé — 12 derniers mois (€ HT)</div>
        {maxMonth === 0 ? (
          <p className="stats-empty">
            Vos statistiques apparaîtront après vos premières commandes expédiées ou livrées.
          </p>
        ) : (
          <div className="stats-chart">
            {months.map((m, i) => {
              const pct = maxMonth > 0 ? (m.total / maxMonth) * 100 : 0;
              return (
                <div key={i} className="stats-bar" title={`${monthLabel(m.date, i === 0)} : ${euro(Math.round(m.total))} HT`}>
                  <span className="stats-bar-value">
                    {m.total > 0 ? `${(m.total / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}k` : ''}
                  </span>
                  <div className="stats-bar-track">
                    {m.total > 0 ? (
                      <div className="stats-bar-fill" style={{ height: `${Math.max(4, pct)}%` }} />
                    ) : (
                      <div className="stats-bar-zero" />
                    )}
                  </div>
                  <span className="stats-bar-month">{monthLabel(m.date, i === 0)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

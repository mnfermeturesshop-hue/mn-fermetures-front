'use client';

/**
 * Histogramme mensuel en CSS pur (12 barres) — partagé entre les
 * statistiques de l'espace client et le tableau de bord admin.
 * Réutilise les classes .stats-* de globals.css.
 */

export interface MonthPoint {
  date: Date;
  total: number;
}

const euro = (n: number) =>
  n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €';

/** Libellé compact d'un mois (année affichée en janvier et sur le 1er point). */
function monthLabel(d: Date, isFirst: boolean): string {
  const m = d.toLocaleDateString('fr-FR', { month: 'short' });
  return d.getMonth() === 0 || isFirst ? `${m} ${String(d.getFullYear()).slice(2)}` : m;
}

export function MonthlyBarChart({ months, title, emptyMessage }: {
  months: MonthPoint[];
  title: string;
  emptyMessage: string;
}) {
  const maxMonth = Math.max(...months.map((m) => m.total));

  return (
    <div className="stats-chart-card">
      <div className="stats-chart-title">{title}</div>
      {maxMonth === 0 ? (
        <p className="stats-empty">{emptyMessage}</p>
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
  );
}

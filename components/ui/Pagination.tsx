'use client';

interface Props {
  current: number;
  total: number;
  onChange: (page: number) => void;
}

export function Pagination({ current, total, onChange }: Props) {
  const pages: (number | '…')[] = [];

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push('…');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push('…');
    pages.push(total);
  }

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        className="pag-btn"
        type="button"
        disabled={current === 1}
        onClick={() => onChange(current - 1)}
        aria-label="Page précédente"
      >
        ←
      </button>

      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} className="pag-ellipsis">…</span>
        ) : (
          <button
            key={p}
            type="button"
            className={`pag-btn ${p === current ? 'active' : ''}`}
            onClick={() => onChange(p)}
            aria-current={p === current ? 'page' : undefined}
          >
            {p}
          </button>
        )
      )}

      <button
        className="pag-btn"
        type="button"
        disabled={current === total}
        onClick={() => onChange(current + 1)}
        aria-label="Page suivante"
      >
        →
      </button>
    </nav>
  );
}

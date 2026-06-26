import Link from 'next/link';

interface Crumb { label: string; href?: string }

export function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav className="breadcrumb" aria-label="Fil d'Ariane">
      {crumbs.map((c, i) => (
        <span key={i}>
          {i > 0 && <span className="bc-sep">›</span>}
          {c.href ? <Link href={c.href}>{c.label}</Link> : <span>{c.label}</span>}
        </span>
      ))}
    </nav>
  );
}

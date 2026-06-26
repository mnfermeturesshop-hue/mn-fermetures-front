import Link from 'next/link';
import { MENU } from '@/lib/catalog/mock';

export function MegaMenu() {
  return (
    <nav className="cats">
      <div className="wrap">
        {MENU.map((f) => (
          <div className="mi" key={f.categorySlug}>
            <Link href={`/catalogue/${f.categorySlug}`}>{f.name}</Link>
            <div className="mega">
              {f.sub.map((s) => (
                <Link href={`/catalogue/${f.categorySlug}`} key={s}>
                  {s}
                </Link>
              ))}
            </div>
          </div>
        ))}
        <div className="mi">
          <Link href="/catalogue/pieces-detachees" style={{ borderRight: 0, color: 'var(--somfy)' }}>
            Pièces détachées
          </Link>
        </div>
      </div>
    </nav>
  );
}

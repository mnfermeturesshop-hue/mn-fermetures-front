'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { MENU, isNavGroup } from '@/lib/catalog/mock';

export function MegaMenu() {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const pathname = usePathname();

  // Fermer le menu à chaque navigation
  useEffect(() => { setOpenKey(null); }, [pathname]);

  return (
    <nav className="cats">
      <div className="wrap">
        {MENU.map((item) => {
          const hasGroups = item.children?.some(isNavGroup) ?? false;
          const groups    = item.children?.filter(isNavGroup) ?? [];
          const orphans   = item.children?.filter((c) => !isNavGroup(c)) ?? [];
          const isOpen    = openKey === item.href;

          return (
            <div
              className={`mi${hasGroups ? ' mi-wide' : ''}`}
              key={item.href}
              onMouseEnter={() => item.children ? setOpenKey(item.href) : setOpenKey(null)}
              onMouseLeave={() => setOpenKey(null)}
            >
              <Link href={item.href} onClick={() => setOpenKey(null)}>
                {item.name}
              </Link>

              {item.children && isOpen && (
                <div className={`mega ${hasGroups ? 'mega-cols' : 'mega-simple'}`}>

                  {/* Liste simple (ex : Tabliers) */}
                  {!hasGroups && item.children.map((leaf) => (
                    <Link
                      href={leaf.href}
                      key={leaf.href}
                      className="mega-leaf-s"
                      onClick={() => setOpenKey(null)}
                    >
                      {leaf.name}
                    </Link>
                  ))}

                  {/* Colonnes groupées (ex : Kits axes, Pièces détachées) */}
                  {hasGroups && (
                    <>
                      <div className="mega-groups-row">
                        {groups.map((grp) => (
                          <div className="mega-group" key={grp.href}>
                            <Link href={grp.href} className="mega-group-hd" onClick={() => setOpenKey(null)}>
                              {grp.name}
                            </Link>
                            {grp.children.map((leaf) => (
                              <Link
                                href={leaf.href}
                                key={leaf.href}
                                className="mega-leaf"
                                onClick={() => setOpenKey(null)}
                              >
                                {leaf.name}
                              </Link>
                            ))}
                          </div>
                        ))}
                      </div>

                      {orphans.length > 0 && (
                        <div className="mega-orphans-row">
                          {orphans.map((o) => (
                            <Link
                              href={o.href}
                              key={o.href}
                              className="mega-orphan"
                              onClick={() => setOpenKey(null)}
                            >
                              {o.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}

      </div>
    </nav>
  );
}

import Link from 'next/link';
import { MENU, isNavGroup } from '@/lib/catalog/mock';

export function MegaMenu() {
  return (
    <nav className="cats">
      <div className="wrap">
        {MENU.map((item) => {
          const hasGroups = item.children?.some(isNavGroup) ?? false;
          const groups  = item.children?.filter(isNavGroup)  ?? [];
          const orphans = item.children?.filter((c) => !isNavGroup(c)) ?? [];

          return (
            <div className={`mi${hasGroups ? ' mi-wide' : ''}`} key={item.href}>
              <Link href={item.href}>{item.name}</Link>

              {item.children && (
                <div className={`mega ${hasGroups ? 'mega-cols' : 'mega-simple'}`}>

                  {/* Liste simple (ex : Tabliers) */}
                  {!hasGroups && item.children.map((leaf) => (
                    <Link href={leaf.href} key={leaf.href} className="mega-leaf-s">
                      {leaf.name}
                    </Link>
                  ))}

                  {/* Colonnes groupées (ex : Kits axes, Pièces détachées) */}
                  {hasGroups && (
                    <>
                      <div className="mega-groups-row">
                        {groups.map((grp) => (
                          <div className="mega-group" key={grp.href}>
                            <Link href={grp.href} className="mega-group-hd">{grp.name}</Link>
                            {grp.children.map((leaf) => (
                              <Link href={leaf.href} key={leaf.href} className="mega-leaf">{leaf.name}</Link>
                            ))}
                          </div>
                        ))}
                      </div>

                      {orphans.length > 0 && (
                        <div className="mega-orphans-row">
                          {orphans.map((o) => (
                            <Link href={o.href} key={o.href} className="mega-orphan">{o.name}</Link>
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

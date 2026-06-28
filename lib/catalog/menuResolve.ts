import { MENU, isNavGroup } from './mock';
import type { NavLeaf, NavGroup, NavTop } from './mock';

export interface NavItem { name: string; href: string; children?: NavItem[] }

export interface ResolvedPage {
  name: string;
  href: string;
  breadcrumbs: { label: string; href?: string }[];
  navChildren: NavItem[];
  /** Slug le plus proche ayant des produits (ex: 'motorisations') */
  categorySlug: string;
}

function toNavItem(n: NavLeaf | NavGroup): NavItem {
  if (isNavGroup(n)) return { name: n.name, href: n.href, children: n.children.map(toNavItem) };
  return { name: n.name, href: n.href };
}

export function resolveMenuPath(slug: string[]): ResolvedPage | null {
  const fullHref = '/catalogue/' + slug.join('/');

  for (const top of MENU) {
    // Niveau 1 — correspond à un NavTop
    if (top.href === fullHref) {
      return {
        name: top.name,
        href: top.href,
        breadcrumbs: [{ label: 'Accueil', href: '/' }, { label: top.name }],
        navChildren: (top.children ?? []).map(toNavItem),
        categorySlug: slug[0],
      };
    }

    if (!top.children) continue;

    for (const child of top.children) {
      // Niveau 2 — NavGroup enfant d'un NavTop
      if (child.href === fullHref) {
        return {
          name: child.name,
          href: child.href,
          breadcrumbs: [
            { label: 'Accueil', href: '/' },
            { label: top.name, href: top.href },
            { label: child.name },
          ],
          navChildren: isNavGroup(child) ? child.children.map(toNavItem) : [],
          categorySlug: slug[slug.length - 1],
        };
      }

      if (!isNavGroup(child)) continue;

      for (const leaf of child.children) {
        // Niveau 3 — NavLeaf enfant d'un NavGroup
        if (leaf.href === fullHref) {
          return {
            name: leaf.name,
            href: leaf.href,
            breadcrumbs: [
              { label: 'Accueil', href: '/' },
              { label: top.name, href: top.href },
              { label: child.name, href: child.href },
              { label: leaf.name },
            ],
            navChildren: [],
            categorySlug: slug[0],
          };
        }
      }
    }
  }

  return null;
}

/** Retourne tous les NavTop du MENU pour la sidebar globale */
export function topNavItems(): NavItem[] {
  return MENU.map((t) => ({
    name: t.name,
    href: t.href,
    children: (t.children ?? []).map(toNavItem),
  }));
}

/** Dérive le categorySlug depuis un menuPath.
 *  /catalogue/motorisations/somfy-filaires → 'motorisations'
 *  /catalogue/pieces-detachees → 'pieces-detachees'
 */
export function categorySlugFromHref(href: string): string {
  if (href === '/configurateur') return 'tabliers';
  const parts = href.replace('/catalogue/', '').split('/');
  return parts[0] ?? '';
}

/** Option pour le sélecteur admin (liste plate avec profondeur). */
export interface MenuOption {
  label: string;   // nom avec indentation visuelle
  href: string;    // valeur du champ menuPath
  depth: number;
  categorySlug: string;
}

/** Aplatit l'arbre MENU en liste pour un <select> admin. */
export function flatMenuOptions(): MenuOption[] {
  const result: MenuOption[] = [];
  const indent = ['', '  └ ', '    └ '];

  function traverse(items: NavItem[], depth: number) {
    for (const item of items) {
      result.push({
        label: (indent[depth] ?? '      ') + item.name,
        href: item.href,
        depth,
        categorySlug: categorySlugFromHref(item.href),
      });
      if (item.children?.length) traverse(item.children, depth + 1);
    }
  }

  traverse(topNavItems(), 0);
  return result;
}

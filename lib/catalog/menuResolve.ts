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

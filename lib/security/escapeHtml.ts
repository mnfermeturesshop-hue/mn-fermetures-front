/**
 * Échappe une valeur pour interpolation sûre dans du HTML (emails, etc.).
 * Neutralise l'injection de balises / contenu via des champs utilisateur
 * (nom, société, adresse, détail de ligne…) — audit S8.
 */
export function escapeHtml(input: unknown): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

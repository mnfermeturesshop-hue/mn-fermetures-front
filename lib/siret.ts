export interface CompanyInfo {
  nom: string;
  address?: string;
  postalCode?: string;
  city?: string;
}

export async function fetchCompanyBySiret(siret: string): Promise<CompanyInfo | null> {
  if (!/^\d{14}$/.test(siret)) return null;
  try {
    const res = await fetch(
      `https://recherche-entreprises.api.gouv.fr/search?q=${siret}&per_page=1`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const result = data.results?.[0];
    if (!result) return null;
    return {
      nom: result.nom_complet ?? result.nom_raison_sociale ?? '',
      address: result.siege?.adresse,
      postalCode: result.siege?.code_postal,
      city: result.siege?.libelle_commune,
    };
  } catch {
    return null;
  }
}

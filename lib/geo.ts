export interface CityOption {
  nom: string;
  code: string;
}

export async function fetchCitiesByPostalCode(postalCode: string): Promise<CityOption[]> {
  if (!/^\d{5}$/.test(postalCode)) return [];
  try {
    const res = await fetch(
      `https://geo.api.gouv.fr/communes?codePostal=${postalCode}&fields=nom,code&format=json`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

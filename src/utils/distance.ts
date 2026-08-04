// Haversine távolság-számítás (km-ben, 1 tizedesjegy)
export function haversineDistance(
  lat1: number | null,
  lon1: number | null,
  lat2: number | null,
  lon2: number | null
): number | null {
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) {
    return null;
  }

  const R = 6371; // Föld sugara km-ben
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // 1 tizedesjegyre kerekítés
}

// Város-név normalizálása: kisbetű, trim, ékezet-eltávolítás
export function normalizeCity(cityName: string): string {
  return cityName
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, ''); // Diakritikus jelek eltávolítása
}

// Város-referencia betöltése
export function loadCitiesReference(): Record<string, { lat: number; lon: number; name: string }> {
  return require('../data/cities.json');
}

// Város keresése és koordináták lekérése
export function lookupCity(
  cityName: string,
  citiesRef: Record<string, { lat: number; lon: number; name: string }>
): { lat: number | null; lon: number | null } {
  const normalized = normalizeCity(cityName);
  const city = citiesRef[normalized];

  if (city) {
    return { lat: city.lat, lon: city.lon };
  }

  return { lat: null, lon: null };
}

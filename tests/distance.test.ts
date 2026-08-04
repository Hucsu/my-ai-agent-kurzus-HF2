import { haversineDistance, normalizeCity } from '../src/utils/distance';

describe('távolság segédeszközök', () => {
  describe('haversineDistance', () => {
    test('Budapest-Bécs ~214 km', () => {
      const dist = haversineDistance(47.4979, 19.0402, 48.2082, 16.3738);
      expect(dist).toBeCloseTo(214.3, 0);
    });

    test('Budapest-Budapest 0 km', () => {
      const dist = haversineDistance(47.4979, 19.0402, 47.4979, 19.0402);
      expect(dist).toBeCloseTo(0, 1);
    });

    test('null koordináták null távolságot adnak vissza', () => {
      expect(haversineDistance(47.4979, 19.0402, null, null)).toBeNull();
      expect(haversineDistance(null, null, 48.2082, 16.3738)).toBeNull();
      expect(haversineDistance(null, 19.0402, 48.2082, 16.3738)).toBeNull();
    });

    test('távolság 1 tizedesjegyre kerekített', () => {
      const dist = haversineDistance(47.4979, 19.0402, 48.2082, 16.3738);
      expect(dist).toBeDefined();
      if (dist !== null) {
        const decimals = dist.toString().split('.')[1]?.length || 0;
        expect(decimals).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('normalizeCity', () => {
    test('kisbetűvé alakítja', () => {
      expect(normalizeCity('BUDAPEST')).toBe('budapest');
      expect(normalizeCity('Vienna')).toBe('vienna');
    });

    test('eltávolítja az elöl/végén lévő szóközöket', () => {
      expect(normalizeCity('  budapest  ')).toBe('budapest');
      expect(normalizeCity('\tprague\n')).toBe('prague');
    });

    test('eltávolítja a diakritikus jeleket', () => {
      expect(normalizeCity('Kraków')).toBe('krakow');
      expect(normalizeCity('Bécs')).toBe('becs');
      expect(normalizeCity('Pécs')).toBe('pecs');
    });

    test('kombinált átalakításokat kezel', () => {
      expect(normalizeCity('  KRAKÓW  ')).toBe('krakow');
      expect(normalizeCity('  Pécs  ')).toBe('pecs');
    });
  });
});

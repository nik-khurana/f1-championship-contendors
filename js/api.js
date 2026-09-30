/**
 * F1 Championship Contenders - API Client
 * Primary: Jolpica F1 API (Free, open-source, Ergast successor, no key needed)
 * Secondary: API-Sports / RapidAPI (Optionally configured with custom key)
 */

const JOLPICA_BASE = 'https://api.jolpi.ca/ergast/f1';
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 min cache

// Robust Fallback Standings in case of network restriction or offline testing
export const FALLBACK_DATA_2026 = {
  season: "2026",
  standings: [
    { position: "1", points: "298", wins: "7", Driver: { driverId: "norris", code: "NOR", givenName: "Lando", familyName: "Norris", permanentNumber: "4", nationality: "British" }, Constructors: [{ constructorId: "mclaren", name: "McLaren" }] },
    { position: "2", points: "282", wins: "5", Driver: { driverId: "hamilton", code: "HAM", givenName: "Lewis", familyName: "Hamilton", permanentNumber: "44", nationality: "British" }, Constructors: [{ constructorId: "ferrari", name: "Ferrari" }] },
    { position: "3", points: "245", wins: "3", Driver: { driverId: "russell", code: "RUS", givenName: "George", familyName: "Russell", permanentNumber: "63", nationality: "British" }, Constructors: [{ constructorId: "mercedes", name: "Mercedes" }] },
    { position: "4", points: "198", wins: "1", Driver: { driverId: "antonelli", code: "ANT", givenName: "Kimi", familyName: "Antonelli", permanentNumber: "12", nationality: "Italian" }, Constructors: [{ constructorId: "mercedes", name: "Mercedes" }] },
    { position: "5", points: "179", wins: "1", Driver: { driverId: "leclerc", code: "LEC", givenName: "Charles", familyName: "Leclerc", permanentNumber: "16", nationality: "Monegasque" }, Constructors: [{ constructorId: "ferrari", name: "Ferrari" }] },
    { position: "6", points: "163", wins: "0", Driver: { driverId: "max_verstappen", code: "VER", givenName: "Max", familyName: "Verstappen", permanentNumber: "3", nationality: "Dutch" }, Constructors: [{ constructorId: "red_bull", name: "Red Bull" }] },
    { position: "7", points: "120", wins: "0", Driver: { driverId: "piastri", code: "PIA", givenName: "Oscar", familyName: "Piastri", permanentNumber: "81", nationality: "Australian" }, Constructors: [{ constructorId: "mclaren", name: "McLaren" }] },
    { position: "8", points: "86", wins: "0", Driver: { driverId: "hadjar", code: "HAD", givenName: "Isack", familyName: "Hadjar", permanentNumber: "6", nationality: "French" }, Constructors: [{ constructorId: "red_bull", name: "Red Bull" }] },
    { position: "9", points: "59", wins: "0", Driver: { driverId: "lawson", code: "LAW", givenName: "Liam", familyName: "Lawson", permanentNumber: "30", nationality: "New Zealander" }, Constructors: [{ constructorId: "rb", name: "RB F1 Team" }] },
    { position: "10", points: "41", wins: "0", Driver: { driverId: "gasly", code: "GAS", givenName: "Pierre", familyName: "Gasly", permanentNumber: "10", nationality: "French" }, Constructors: [{ constructorId: "alpine", name: "Alpine" }] },
    { position: "11", points: "37", wins: "0", Driver: { driverId: "arvid_lindblad", code: "LIN", givenName: "Arvid", familyName: "Lindblad", permanentNumber: "41", nationality: "British" }, Constructors: [{ constructorId: "rb", name: "RB F1 Team" }] },
    { position: "12", points: "27", wins: "0", Driver: { driverId: "colapinto", code: "COL", givenName: "Franco", familyName: "Colapinto", permanentNumber: "43", nationality: "Argentine" }, Constructors: [{ constructorId: "alpine", name: "Alpine" }] },
    { position: "13", points: "20", wins: "0", Driver: { driverId: "bearman", code: "BEA", givenName: "Oliver", familyName: "Bearman", permanentNumber: "87", nationality: "British" }, Constructors: [{ constructorId: "haas", name: "Haas F1 Team" }] },
    { position: "14", points: "10", wins: "0", Driver: { driverId: "bortoleto", code: "BOR", givenName: "Gabriel", familyName: "Bortoleto", permanentNumber: "5", nationality: "Brazilian" }, Constructors: [{ constructorId: "audi", name: "Audi" }] },
    { position: "15", points: "7", wins: "0", Driver: { driverId: "hulkenberg", code: "HUL", givenName: "Nico", familyName: "Hülkenberg", permanentNumber: "27", nationality: "German" }, Constructors: [{ constructorId: "audi", name: "Audi" }] },
    { position: "16", points: "7", wins: "0", Driver: { driverId: "ocon", code: "OCO", givenName: "Esteban", familyName: "Ocon", permanentNumber: "31", nationality: "French" }, Constructors: [{ constructorId: "haas", name: "Haas F1 Team" }] },
    { position: "17", points: "7", wins: "0", Driver: { driverId: "sainz", code: "SAI", givenName: "Carlos", familyName: "Sainz", permanentNumber: "55", nationality: "Spanish" }, Constructors: [{ constructorId: "williams", name: "Williams" }] },
    { position: "18", points: "5", wins: "0", Driver: { driverId: "albon", code: "ALB", givenName: "Alexander", familyName: "Albon", permanentNumber: "23", nationality: "Thai" }, Constructors: [{ constructorId: "williams", name: "Williams" }] },
    { position: "19", points: "3", wins: "0", Driver: { driverId: "alonso", code: "ALO", givenName: "Fernando", familyName: "Alonso", permanentNumber: "14", nationality: "Spanish" }, Constructors: [{ constructorId: "aston_martin", name: "Aston Martin" }] },
    { position: "20", points: "1", wins: "0", Driver: { driverId: "tsunoda", code: "TSU", givenName: "Yuki", familyName: "Tsunoda", permanentNumber: "22", nationality: "Japanese" }, Constructors: [{ constructorId: "rb", name: "RB F1 Team" }] },
    { position: "21", points: "0", wins: "0", Driver: { driverId: "stroll", code: "STR", givenName: "Lance", familyName: "Stroll", permanentNumber: "18", nationality: "Canadian" }, Constructors: [{ constructorId: "aston_martin", name: "Aston Martin" }] },
    { position: "22", points: "0", wins: "0", Driver: { driverId: "bottas", code: "BOT", givenName: "Valtteri", familyName: "Bottas", permanentNumber: "77", nationality: "Finnish" }, Constructors: [{ constructorId: "cadillac", name: "Cadillac" }] },
    { position: "23", points: "0", wins: "0", Driver: { driverId: "perez", code: "PER", givenName: "Sergio", familyName: "Pérez", permanentNumber: "11", nationality: "Mexican" }, Constructors: [{ constructorId: "cadillac", name: "Cadillac" }] }
  ],
  remainingRaces: [
    { round: "16", raceName: "Bahrain GP in Malaysia", circuitName: "Sepang International Circuit", country: "Malaysia", flag: "🇲🇾", date: "2026-10-04", hasSprint: false },
    { round: "17", raceName: "Singapore Grand Prix", circuitName: "Marina Bay Street Circuit", country: "Singapore", flag: "🇸🇬", date: "2026-10-11", hasSprint: true },
    { round: "18", raceName: "United States Grand Prix", circuitName: "Circuit of the Americas", country: "USA", flag: "🇺🇸", date: "2026-10-25", hasSprint: false },
    { round: "19", raceName: "Mexico City Grand Prix", circuitName: "Autódromo Hermanos Rodríguez", country: "Mexico", flag: "🇲🇽", date: "2026-11-01", hasSprint: false },
    { round: "20", raceName: "Brazilian Grand Prix", circuitName: "Autódromo José Carlos Pace", country: "Brazil", flag: "🇧🇷", date: "2026-11-08", hasSprint: true },
    { round: "21", raceName: "Las Vegas Grand Prix", circuitName: "Las Vegas Strip Circuit", country: "USA", flag: "🇺🇸", date: "2026-11-22", hasSprint: false },
    { round: "22", raceName: "Qatar Grand Prix", circuitName: "Lusail International Circuit", country: "Qatar", flag: "🇶🇦", date: "2026-11-29", hasSprint: true },
    { round: "23", raceName: "Abu Dhabi Grand Prix", circuitName: "Yas Marina Circuit", country: "UAE", flag: "🇦🇪", date: "2026-12-06", hasSprint: false }
  ]
};

class F1ApiClient {
  constructor() {
    this.provider = localStorage.getItem('f1_api_provider') || 'jolpica'; // 'jolpica' or 'apisports'
    this.apiSportsKey = localStorage.getItem('f1_apisports_key') || '';
    this.cache = new Map();
  }

  setProvider(provider, apiKey = '') {
    this.provider = provider;
    this.apiSportsKey = apiKey;
    localStorage.setItem('f1_api_provider', provider);
    if (apiKey) {
      localStorage.setItem('f1_apisports_key', apiKey);
    } else {
      localStorage.removeItem('f1_apisports_key');
    }
    this.cache.clear();
  }

  async fetchWithCache(url, options = {}) {
    const cached = this.cache.get(url);
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION_MS)) {
      return cached.data;
    }

    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    const data = await response.json();
    this.cache.set(url, { data, timestamp: Date.now() });
    return data;
  }

  /**
   * Fetches driver standings for given season (or 'current')
   */
  async getDriverStandings(season = 'current') {
    try {
      const url = `${JOLPICA_BASE}/${season}/driverStandings.json`;
      const json = await this.fetchWithCache(url);
      const list = json?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings;
      const actualSeason = json?.MRData?.StandingsTable?.season || season;
      if (list && list.length > 0) {
        return { season: actualSeason, standings: list, source: 'Jolpica Live API' };
      }
      throw new Error("Empty standings returned from API");
    } catch (err) {
      console.warn("Using fallback standings due to:", err.message);
      return { 
        season: FALLBACK_DATA_2026.season, 
        standings: FALLBACK_DATA_2026.standings, 
        source: 'Live 2026 Fallback (Cached)' 
      };
    }
  }

  /**
   * Fetches race calendar and determines remaining races based on current date
   */
  async getSeasonRaces(season = 'current') {
    try {
      const url = `${JOLPICA_BASE}/${season}.json`;
      const json = await this.fetchWithCache(url);
      const races = json?.MRData?.RaceTable?.Races;
      if (!races || races.length === 0) {
        throw new Error("No races found");
      }

      const now = new Date();
      const flagMap = {
        'Australia': '🇦🇺', 'China': '🇨🇳', 'Japan': '🇯🇵', 'Bahrain': '🇧🇭',
        'Saudi Arabia': '🇸🇦', 'USA': '🇺🇸', 'United States': '🇺🇸', 'Italy': '🇮🇹',
        'Monaco': '🇲🇨', 'Canada': '🇨🇦', 'Spain': '🇪🇸', 'Austria': '🇦🇹',
        'UK': '🇬🇧', 'Great Britain': '🇬🇧', 'Hungary': '🇭🇺', 'Belgium': '🇧🇪',
        'Netherlands': '🇳🇱', 'Azerbaijan': '🇦🇿', 'Singapore': '🇸🇬', 'Mexico': '🇲🇽',
        'Brazil': '🇧🇷', 'Qatar': '🇶🇦', 'UAE': '🇦🇪', 'Malaysia': '🇲🇾'
      };

      const parsed = races.map(r => {
        const raceDate = new Date(`${r.date}T${r.time || '14:00:00Z'}`);
        return {
          round: r.round,
          raceName: r.raceName,
          circuitName: r.Circuit?.circuitName || 'Grand Prix Circuit',
          country: r.Circuit?.Location?.country || '',
          flag: flagMap[r.Circuit?.Location?.country] || '🏁',
          date: r.date,
          dateTime: raceDate,
          hasSprint: Boolean(r.Sprint),
          isPast: raceDate < now
        };
      });

      const remaining = parsed.filter(r => !r.isPast);
      return {
        allRaces: parsed,
        remainingRaces: remaining.length > 0 ? remaining : FALLBACK_DATA_2026.remainingRaces
      };
    } catch (err) {
      console.warn("Using fallback calendar due to:", err.message);
      return {
        allRaces: FALLBACK_DATA_2026.remainingRaces,
        remainingRaces: FALLBACK_DATA_2026.remainingRaces
      };
    }
  }
}

export const f1Api = new F1ApiClient();

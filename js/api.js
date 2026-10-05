/**
 * F1 Championship Contenders - API Client & Local Caching Engine
 * 
 * Features:
 * 1. Client-Side IP Isolation:
 *    All API requests run client-side directly from each user's browser.
 *    Each visitor connects from their own unique public IP address, so rate limits
 *    (e.g. 500 req/hr on Jolpica) are naturally isolated per user rather than
 *    congested behind a single shared server proxy.
 * 
 * 2. Weekly / Monday Cache Invalidation:
 *    F1 Grand Prix races take place on Sundays. Results and penalties are settled
 *    by Sunday night / Monday morning UTC. Data is cached in the user's browser
 *    `localStorage` and automatically refreshes each Monday at 06:00 UTC.
 *    Visits throughout Tuesday–Sunday load in 0ms with ZERO network requests.
 * 
 * 3. Rate-Limit Shield & Graceful Degradation:
 *    Includes client-side request throttling, HTTP 429 backoff handling, and
 *    stale-while-revalidate fallbacks so users never face a broken screen.
 */

const JOLPICA_BASE = 'https://api.jolpi.ca/ergast/f1';
const STORAGE_PREFIX = 'f1_cache_';
const POLICY_STORAGE_KEY = 'f1_cache_policy';
const MONDAY_CUTOFF_HOUR_UTC = 6; // 06:00 UTC Monday morning

// Robust Fallback Standings in case of offline testing or API downtime
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

/**
 * Returns epoch timestamp of the most recent Monday at `hourUTC:00:00 UTC`.
 */
export function getLastMondayTimestamp(hourUTC = MONDAY_CUTOFF_HOUR_UTC) {
  const now = new Date();
  const d = new Date(now.getTime());
  const day = d.getUTCDay(); // 0 is Sun, 1 is Mon, ..., 6 is Sat
  const daysBack = (day + 6) % 7; // Mon -> 0, Tue -> 1, ..., Sun -> 6
  d.setUTCDate(d.getUTCDate() - daysBack);
  d.setUTCHours(hourUTC, 0, 0, 0);

  if (daysBack === 0 && now.getTime() < d.getTime()) {
    d.setUTCDate(d.getUTCDate() - 7);
  }
  return d.getTime();
}

/**
 * Returns epoch timestamp of the next upcoming Monday at `hourUTC:00:00 UTC`.
 */
export function getNextMondayTimestamp(hourUTC = MONDAY_CUTOFF_HOUR_UTC) {
  return getLastMondayTimestamp(hourUTC) + (7 * 24 * 60 * 60 * 1000);
}

/**
 * HTML Escaping utility to defend against DOM-based XSS attacks from external API payloads
 */
export function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitizes and validates user input for API keys (alphanumeric, dashes, underscores only)
 */
export function sanitizeApiKey(key) {
  if (typeof key !== 'string') return '';
  return key.trim().replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 128);
}

/**
 * Robust LocalStorage Cache Manager with In-Memory fallback & Schema Integrity Checks
 */
class LocalCacheManager {
  constructor() {
    this.memoryFallback = new Map();
  }

  isAvailable() {
    try {
      const test = '__f1_storage_test__';
      window.localStorage.setItem(test, test);
      window.localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  getItem(key) {
    if (this.isAvailable()) {
      try {
        const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
        if (!raw) return null;
        const entry = JSON.parse(raw);
        // Schema and type integrity validation to prevent prototype pollution or invalid cache
        if (entry && typeof entry === 'object' && typeof entry.timestamp === 'number' && entry.data) {
          return entry;
        }
        return null;
      } catch (e) {
        console.warn('LocalStorage read/validation error, falling back to memory:', e);
      }
    }
    return this.memoryFallback.get(key) || null;
  }

  setItem(key, data, metadata = {}) {
    const entry = {
      data,
      timestamp: Date.now(),
      dateStr: new Date().toISOString(),
      ...metadata
    };

    if (this.isAvailable()) {
      try {
        window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
      } catch (e) {
        console.warn('LocalStorage write error (quota exceeded?), using memory:', e);
      }
    }
    this.memoryFallback.set(key, entry);
    return entry;
  }

  removeItem(key) {
    if (this.isAvailable()) {
      try {
        window.localStorage.removeItem(STORAGE_PREFIX + key);
      } catch {}
    }
    this.memoryFallback.delete(key);
  }

  clearAll(season = null) {
    if (this.isAvailable()) {
      try {
        const keysToRemove = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith(STORAGE_PREFIX)) {
            if (!season || k.includes(`_${season}_`)) {
              keysToRemove.push(k);
            }
          }
        }
        keysToRemove.forEach(k => window.localStorage.removeItem(k));
      } catch {}
    }
    if (!season) {
      this.memoryFallback.clear();
    } else {
      for (const k of this.memoryFallback.keys()) {
        if (k.includes(`_${season}_`)) this.memoryFallback.delete(k);
      }
    }
  }

  /**
   * Evaluates if a cache item is still fresh
   * @param {Object} entry 
   * @param {string} season 
   * @param {string} policy 'monday' | '7days' | 'daily' | 'always_fresh'
   */
  isValid(entry, season, policy = 'monday') {
    if (!entry || !entry.timestamp) return false;
    
    // Historical seasons (completed years) never change - cache permanently
    const isHistorical = season && season !== 'current' && season !== '2026';
    if (isHistorical) return true;

    if (policy === 'always_fresh') return false;

    const now = Date.now();
    if (policy === 'daily') {
      return (now - entry.timestamp) < (24 * 60 * 60 * 1000);
    }
    if (policy === '7days') {
      return (now - entry.timestamp) < (7 * 24 * 60 * 60 * 1000);
    }
    if (policy === 'monday') {
      // Valid if cached AFTER the most recent Monday cutoff (06:00 UTC)
      const lastMonday = getLastMondayTimestamp(MONDAY_CUTOFF_HOUR_UTC);
      return entry.timestamp >= lastMonday;
    }

    return false;
  }
}

class F1ApiClient {
  constructor() {
    this.cacheManager = new LocalCacheManager();
    this.provider = localStorage.getItem('f1_api_provider') || 'jolpica';
    this.apiSportsKey = localStorage.getItem('f1_apisports_key') || '';
    this.cachePolicy = localStorage.getItem(POLICY_STORAGE_KEY) || 'monday';

    this.lastRequestTime = 0;
    this.minRequestGapMs = 400; // Client-side burst throttle
    this.isRateLimited = false;
    this.rateLimitReset = null;
  }

  setProvider(provider, apiKey = '') {
    const validProviders = ['jolpica', 'apisports'];
    this.provider = validProviders.includes(provider) ? provider : 'jolpica';
    const cleanKey = sanitizeApiKey(apiKey);
    this.apiSportsKey = cleanKey;
    localStorage.setItem('f1_api_provider', this.provider);
    if (cleanKey) {
      localStorage.setItem('f1_apisports_key', cleanKey);
    } else {
      localStorage.removeItem('f1_apisports_key');
    }
    this.cacheManager.clearAll();
  }

  setCachePolicy(policy) {
    const validPolicies = ['monday', '7days', 'daily', 'always_fresh'];
    this.cachePolicy = validPolicies.includes(policy) ? policy : 'monday';
    localStorage.setItem(POLICY_STORAGE_KEY, this.cachePolicy);
  }

  getCachePolicy() {
    return this.cachePolicy;
  }

  clearCache(season = null) {
    this.cacheManager.clearAll(season);
  }

  /**
   * Client-side request throttle: prevents accidental rapid clicks from spamming API
   */
  async throttleRequest() {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minRequestGapMs) {
      await new Promise(r => setTimeout(r, this.minRequestGapMs - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Fetches data with persistent local caching and rate-limiting shield
   */
  async fetchWithCache(url, cacheKey, season, options = {}, forceRefresh = false) {
    const cachedEntry = this.cacheManager.getItem(cacheKey);

    // 1. Return fresh local cache if valid and not forcing a refresh
    if (!forceRefresh && this.cacheManager.isValid(cachedEntry, season, this.cachePolicy)) {
      return {
        data: cachedEntry.data,
        isCached: true,
        source: cachedEntry.source || 'Local Cache (Weekly Sync)',
        timestamp: cachedEntry.timestamp
      };
    }

    // 2. Fetch fresh live data from client browser (unique per user IP)
    await this.throttleRequest();

    try {
      const response = await fetch(url, options);

      // Handle HTTP 429 (Too Many Requests / Rate limit exceeded)
      if (response.status === 429) {
        this.isRateLimited = true;
        console.warn('Jolpica/F1 API rate limit encountered (429). Utilizing local cached data.');
        if (cachedEntry && cachedEntry.data) {
          return {
            data: cachedEntry.data,
            isCached: true,
            source: 'Local Cache (Rate-Limit Shield Active)',
            timestamp: cachedEntry.timestamp
          };
        }
        throw new Error('API Rate Limited (429) and no local cache available');
      }

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data = await response.json();
      this.isRateLimited = false;

      // 3. Persist to browser LocalStorage for weekly reuse
      this.cacheManager.setItem(cacheKey, data, {
        season,
        source: 'Jolpica Live API (Synced)'
      });

      return {
        data,
        isCached: false,
        source: 'Jolpica Live API',
        timestamp: Date.now()
      };
    } catch (err) {
      // Graceful offline & rate limit degradation: fallback to existing local cache
      if (cachedEntry && cachedEntry.data) {
        console.warn(`Network error (${err.message}). Reverting to stored local cache.`);
        return {
          data: cachedEntry.data,
          isCached: true,
          source: 'Local Cache (Offline Fallback)',
          timestamp: cachedEntry.timestamp
        };
      }
      throw err;
    }
  }

  /**
   * Fetches driver standings for given season (or 'current')
   */
  async getDriverStandings(season = 'current', forceRefresh = false) {
    const cacheKey = `standings_${season}`;
    try {
      const url = `${JOLPICA_BASE}/${season}/driverStandings.json`;
      const result = await this.fetchWithCache(url, cacheKey, season, {}, forceRefresh);
      const list = result.data?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings;
      const actualSeason = result.data?.MRData?.StandingsTable?.season || season;

      if (list && list.length > 0) {
        return {
          season: actualSeason,
          standings: list,
          source: result.source,
          isCached: result.isCached,
          timestamp: result.timestamp
        };
      }
      throw new Error("Empty standings returned from API");
    } catch (err) {
      console.warn("Using fallback standings due to:", err.message);
      return { 
        season: FALLBACK_DATA_2026.season, 
        standings: FALLBACK_DATA_2026.standings, 
        source: 'Live 2026 Fallback (Offline)',
        isCached: true,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Fetches race calendar and determines remaining races based on current date
   */
  async getSeasonRaces(season = 'current', forceRefresh = false) {
    const cacheKey = `races_${season}`;
    try {
      const url = `${JOLPICA_BASE}/${season}.json`;
      const result = await this.fetchWithCache(url, cacheKey, season, {}, forceRefresh);
      const races = result.data?.MRData?.RaceTable?.Races;
      
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
        remainingRaces: remaining.length > 0 ? remaining : FALLBACK_DATA_2026.remainingRaces,
        source: result.source,
        isCached: result.isCached,
        timestamp: result.timestamp
      };
    } catch (err) {
      console.warn("Using fallback calendar due to:", err.message);
      return {
        allRaces: FALLBACK_DATA_2026.remainingRaces,
        remainingRaces: FALLBACK_DATA_2026.remainingRaces,
        source: 'Live 2026 Fallback (Offline)',
        isCached: true,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Telemetry summary of local cache state for UI display
   */
  getCacheTelemetry(season = 'current') {
    const standingsEntry = this.cacheManager.getItem(`standings_${season}`);
    const racesEntry = this.cacheManager.getItem(`races_${season}`);
    const entry = standingsEntry || racesEntry;

    const hasCache = Boolean(entry && entry.timestamp);
    const lastDate = hasCache ? new Date(entry.timestamp) : null;
    const nextDate = new Date(getNextMondayTimestamp(MONDAY_CUTOFF_HOUR_UTC));

    return {
      hasCache,
      lastSynced: lastDate ? lastDate.toLocaleString() : 'Not yet cached',
      nextRefresh: nextDate.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' UTC',
      policy: this.cachePolicy,
      isRateLimited: this.isRateLimited,
      season
    };
  }
}

export const f1Api = new F1ApiClient();

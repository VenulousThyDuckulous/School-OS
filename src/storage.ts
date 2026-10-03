// Storage abstraction: localStorage now, IndexedDB/backend swappable later.
const KEY = 'schoolos-v1';
export const storage = {
  load<T>(fallback: T): T {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return fallback;
      return { ...fallback, ...JSON.parse(raw) };
    } catch { return fallback; }
  },
  save(data: unknown) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* quota — toast handled by caller */ }
  },
  clear() { try { localStorage.removeItem(KEY); } catch { /* noop */ } },
};
// Future backend interface (documented for migration):
export interface Backend {
  get<T>(collection: string): Promise<T[]>;
  put<T>(collection: string, item: T): Promise<void>;
}
export const SESSION_KEY = 'schoolos-session';
export const THEME_KEY = 'schoolos-theme';

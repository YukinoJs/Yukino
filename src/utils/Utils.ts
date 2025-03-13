import { URL } from 'url';

/**
 * Check if a string is a valid URL
 */
export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format milliseconds to a human-readable format
 */
export function formatTime(ms: number): string {
  if (isNaN(ms) || ms <= 0) return '00:00';
  
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Create a timeout promise
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Merge default options with user-provided ones
 */
export function mergeDefault<T>(def: T, given: Partial<T>): T {
  if (!given) return def;
  const merged = { ...def };
  for (const key in given) {
    const value = given[key];
    if (value === null) continue;
    if (typeof value === 'object' && !Array.isArray(value)) {
      merged[key] = mergeDefault(merged[key] as any, value as any);
    } else {
      merged[key] = value as any;
    }
  }
  return merged;
}

/**
 * Generate a random string
 */
export function generateRandomString(length: number): string {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

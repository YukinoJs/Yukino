/**
 * Check if a string is a valid URL
 */
export declare function isValidURL(url: string): boolean;
/**
 * Format milliseconds to a human-readable format
 */
export declare function formatTime(ms: number): string;
/**
 * Create a timeout promise
 */
export declare function wait(ms: number): Promise<void>;
/**
 * Merge default options with user-provided ones
 */
export declare function mergeDefault<T>(def: T, given: Partial<T>): T;
/**
 * Generate a random string
 */
export declare function generateRandomString(length: number): string;
//# sourceMappingURL=Utils.d.ts.map
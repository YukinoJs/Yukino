import { EqualizerBand, FilterOptions, CustomFilter, KaraokeOptions, TimescaleOptions, FrequencyDepthOptions, RotationOptions, DistortionOptions, ChannelMixOptions, LowPassOptions } from '../types/interfaces.js';
export declare class FilterUtil {
    /**
     * Creates an equalizer band array with flat bands
     */
    static createFlatEQ(): EqualizerBand[];
    /**
     * Creates a bass boost equalizer with the specified gain
     * @param gain The gain to use (-0.25 to 1.0)
     */
    static createBassBoostEQ(gain?: number): EqualizerBand[];
    /**
     * Creates a nightcore-like timescale preset
     */
    static nightcorePreset(): {
        timescale: {
            speed: number;
            pitch: number;
            rate: number;
        };
    };
    /**
     * Creates a vaporwave-like timescale preset
     */
    static vaporwavePreset(): {
        timescale: {
            speed: number;
            pitch: number;
            rate: number;
        };
    };
    /**
     * Creates an 8D audio-like preset
     */
    static eightDimensionalPreset(): {
        rotation: {
            rotationHz: number;
        };
    };
    /**
     * Creates a night mode filter preset that enhances bass and reduces treble
     */
    static nightModePreset(): FilterOptions;
    /**
     * Creates a vocal enhancer filter preset
     */
    static enhancedVocalsPreset(): FilterOptions;
    /**
     * Validates filter values to ensure they are within acceptable ranges
     * @param filters The filters to validate
     */
    static validateFilters(filters: FilterOptions): void;
    /**
     * Linear interpolation between two numbers
     */
    static lerp(start: number, end: number, fraction: number): number;
    /**
     * Interpolates between filter values
     * @param current Current filter values
     * @param target Target filter values
     * @param fraction Interpolation fraction (0-1)
     */
    static interpolateFilterValues(current: FilterOptions, target: FilterOptions, fraction: number): FilterOptions;
    /**
     * Combines multiple filters into a single filter
     * @param filters Array of filters to combine
     */
    static combineFilters(...filters: FilterOptions[]): FilterOptions;
    /**
     * Creates a dynamic filter based on parameters
     * @param params Parameters to create the filter
     */
    static createDynamicFilter(params: {
        bassBoost?: number;
        trebleBoost?: number;
        vibrato?: number;
        tempo?: number;
    }): FilterOptions;
    /**
     * Returns a FilterOptions object for karaoke
     */
    static karaoke(options: KaraokeOptions): FilterOptions;
    /**
     * Returns a FilterOptions object for timescale
     */
    static timescale(options: TimescaleOptions): FilterOptions;
    /**
     * Returns a FilterOptions object for tremolo
     */
    static tremolo(options: FrequencyDepthOptions): FilterOptions;
    /**
     * Returns a FilterOptions object for vibrato
     */
    static vibrato(options: FrequencyDepthOptions): FilterOptions;
    /**
     * Returns a FilterOptions object for rotation
     */
    static rotation(options: RotationOptions): FilterOptions;
    /**
     * Returns a FilterOptions object for distortion
     */
    static distortion(options: DistortionOptions): FilterOptions;
    /**
     * Returns a FilterOptions object for channel mix
     */
    static channelMix(options: ChannelMixOptions): FilterOptions;
    /**
     * Returns a FilterOptions object for low pass
     */
    static lowPass(options: LowPassOptions): FilterOptions;
    /**
     * Returns a FilterOptions object for equalizer
     */
    static equalizer(bands: EqualizerBand[]): FilterOptions;
}
/**
 * Manager for custom audio filters
 */
export declare class CustomFilterManager {
    private filters;
    private lastUpdate;
    private readonly updateInterval;
    private eventHandlers;
    constructor();
    /**
     * Adds a custom filter to the manager
     * @param name Filter name
     * @param filters Filter options
     * @param description Optional description
     * @param tags Optional tags for categorization
     */
    addFilter(name: string, filters: FilterOptions, description?: string, tags?: string[]): void;
    /**
     * Gets a filter by name
     * @param name Filter name
     */
    getFilter(name: string): CustomFilter;
    /**
     * Removes a filter by name
     * @param name Filter name
     */
    removeFilter(name: string): boolean;
    /**
     * Updates an existing filter
     * @param name Filter name
     * @param filters New filter options
     * @param description Optional new description
     * @param tags Optional new tags
     */
    updateFilter(name: string, filters: FilterOptions, description?: string, tags?: string[]): void;
    /**
     * Get all filter names
     */
    getFilterNames(): string[];
    /**
     * Get all filters
     */
    getAllFilters(): CustomFilter[];
    /**
     * Find filters by tag
     * @param tag Tag to search for
     */
    findFiltersByTag(tag: string): CustomFilter[];
    /**
     * Clear all filters
     */
    clearFilters(): void;
    /**
     * Apply a filter to a player
     * @param player Player instance
     * @param name Filter name
     */
    applyFilter(player: any, name: string): Promise<void>;
    /**
     * Interpolates between current player filters and target filters
     * @param player Player instance
     * @param targetFilters Target filter values
     * @param options Interpolation options
     */
    interpolateFilters(player: any, targetFilters: FilterOptions, options?: {
        steps?: number;
        duration?: number;
    }): Promise<void>;
    /**
     * Register event handler
     * @param event Event name
     * @param callback Callback function
     */
    on(event: string, callback: Function): void;
    /**
     * Remove event handler
     * @param event Event name
     * @param callback Callback function
     */
    off(event: string, callback: Function): void;
    /**
     * Emit event
     * @param event Event name
     * @param data Event data
     */
    private emit;
}
/**
 * Filter chain system for applying multiple filters in sequence
 */
export declare class FilterChain {
    private filters;
    private name?;
    /**
     * Create a new filter chain
     * @param name Optional name for the chain
     */
    constructor(name?: string);
    /**
     * Add a filter to the chain
     * @param filter Filter to add
     */
    add(filter: FilterOptions): FilterChain;
    /**
     * Add a named filter from a CustomFilterManager
     * @param manager Filter manager
     * @param name Filter name
     */
    addNamed(manager: CustomFilterManager, name: string): FilterChain;
    /**
     * Apply the filter chain to a player
     * @param player Player to apply filters to
     */
    apply(player: any): Promise<void>;
    /**
     * Combine all filters in the chain
     */
    combine(): FilterOptions;
    /**
     * Reset the chain
     */
    reset(): FilterChain;
    /**
     * Get the name of the chain
     */
    getName(): string | undefined;
    /**
     * Set the name of the chain
     * @param name New name
     */
    setName(name: string): FilterChain;
}
/**
 * Cached filter manager for performance optimization
 */
export declare class CachedFilterManager {
    private cache;
    private ttl;
    private timestamps;
    /**
     * Create a new cached filter manager
     * @param ttl Time to live in milliseconds (default: 1 hour)
     */
    constructor(ttl?: number);
    /**
     * Get a filter from the cache, or generate it if not cached
     * @param key Cache key
     * @param generator Function to generate the filter if not cached
     */
    getFilter(key: string, generator: () => FilterOptions): FilterOptions;
    /**
     * Manually add a filter to the cache
     * @param key Cache key
     * @param filter Filter to cache
     */
    cacheFilter(key: string, filter: FilterOptions): void;
    /**
     * Remove a filter from the cache
     * @param key Cache key
     */
    invalidate(key: string): boolean;
    /**
     * Clear the entire cache
     */
    clear(): void;
    /**
     * Clean expired cache entries
     */
    private cleanExpired;
    /**
     * Set the TTL for cache entries
     * @param ttl New TTL in milliseconds
     */
    setTTL(ttl: number): void;
}
//# sourceMappingURL=FilterUtil.d.ts.map
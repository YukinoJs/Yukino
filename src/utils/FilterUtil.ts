import { EqualizerBand, FilterOptions, CustomFilter } from '../types/interfaces.ts';
import { Events } from '../types/constants.ts';

export class FilterUtil {
  /**
   * Creates an equalizer band array with flat bands
   */
  public static createFlatEQ(): EqualizerBand[] {
    const bands: EqualizerBand[] = [];
    for (let i = 0; i < 15; i++) {
      bands.push({ band: i, gain: 0.0 });
    }
    return bands;
  }
  
  /**
   * Creates a bass boost equalizer with the specified gain
   * @param gain The gain to use (-0.25 to 1.0)
   */
  public static createBassBoostEQ(gain = 0.5): EqualizerBand[] {
    const bands = this.createFlatEQ();
    // Adjust the first 5 bands for bass boost
    for (let i = 0; i < 5; i++) {
      bands[i].gain = gain;
    }
    return bands;
  }

  /**
   * Creates a nightcore-like timescale preset
   */
  public static nightcorePreset() {
    return {
      timescale: {
        speed: 1.2,
        pitch: 1.2,
        rate: 1.0
      }
    };
  }

  /**
   * Creates a vaporwave-like timescale preset
   */
  public static vaporwavePreset() {
    return {
      timescale: {
        speed: 0.8,
        pitch: 0.8,
        rate: 1.0
      }
    };
  }

  /**
   * Creates an 8D audio-like preset
   */
  public static eightDimensionalPreset() {
    return {
      rotation: {
        rotationHz: 0.2
      }
    };
  }

  /**
   * Creates a night mode filter preset that enhances bass and reduces treble
   */
  public static nightModePreset(): FilterOptions {
    return {
      equalizer: [
        { band: 0, gain: 0.3 },
        { band: 1, gain: 0.3 },
        { band: 2, gain: 0.2 },
        { band: 3, gain: 0.1 },
        { band: 4, gain: -0.1 },
        { band: 5, gain: -0.2 },
        { band: 6, gain: -0.3 },
        { band: 7, gain: -0.3 },
        { band: 8, gain: -0.3 },
        { band: 9, gain: -0.3 },
        { band: 10, gain: -0.2 },
        { band: 11, gain: -0.2 },
        { band: 12, gain: -0.2 },
        { band: 13, gain: -0.1 },
        { band: 14, gain: 0.0 }
      ],
      lowPass: {
        smoothing: 15.0
      }
    };
  }

  /**
   * Creates a vocal enhancer filter preset
   */
  public static enhancedVocalsPreset(): FilterOptions {
    return {
      equalizer: [
        { band: 0, gain: -0.2 },
        { band: 1, gain: -0.2 },
        { band: 2, gain: -0.1 },
        { band: 3, gain: 0.0 },
        { band: 4, gain: 0.3 },
        { band: 5, gain: 0.4 },
        { band: 6, gain: 0.4 },
        { band: 7, gain: 0.3 },
        { band: 8, gain: 0.0 },
        { band: 9, gain: -0.1 },
        { band: 10, gain: -0.2 },
        { band: 11, gain: -0.2 },
        { band: 12, gain: -0.3 },
        { band: 13, gain: -0.3 },
        { band: 14, gain: -0.3 }
      ]
    };
  }

  /**
   * Validates filter values to ensure they are within acceptable ranges
   * @param filters The filters to validate
   */
  public static validateFilters(filters: FilterOptions): void {
    if (filters.volume !== undefined) {
      if (filters.volume < 0 || filters.volume > 1000) {
        throw new Error('Volume must be between 0 and 1000');
      }
    }
    
    if (filters.equalizer) {
      for (const band of filters.equalizer) {
        if (band.gain < -0.25 || band.gain > 1.0) {
          throw new Error('Equalizer gain must be between -0.25 and 1.0');
        }
      }
    }

    if (filters.timescale) {
      const { speed, pitch, rate } = filters.timescale;
      if ((speed && (speed <= 0 || speed > 10)) || 
          (pitch && (pitch <= 0 || pitch > 10)) ||
          (rate && (rate <= 0 || rate > 10))) {
        throw new Error('Timescale values must be between 0 and 10');
      }
    }
  }

  /**
   * Linear interpolation between two numbers
   */
  public static lerp(start: number, end: number, fraction: number): number {
    return start + (end - start) * fraction;
  }

  /**
   * Interpolates between filter values
   * @param current Current filter values
   * @param target Target filter values
   * @param fraction Interpolation fraction (0-1)
   */
  public static interpolateFilterValues(
    current: FilterOptions,
    target: FilterOptions,
    fraction: number
  ): FilterOptions {
    const result: FilterOptions = {};
    
    // Interpolate volume
    if (target.volume !== undefined) {
      result.volume = this.lerp(
        current.volume ?? 100,
        target.volume,
        fraction
      );
    }
    
    // Interpolate equalizer
    if (target.equalizer) {
      result.equalizer = target.equalizer.map((band, i) => ({
        band: band.band,
        gain: this.lerp(
          current.equalizer?.[i]?.gain ?? 0,
          band.gain,
          fraction
        )
      }));
    }
    
    // Interpolate timescale
    if (target.timescale) {
      result.timescale = {
        speed: target.timescale.speed !== undefined 
          ? this.lerp(current.timescale?.speed ?? 1.0, target.timescale.speed, fraction)
          : current.timescale?.speed,
        pitch: target.timescale.pitch !== undefined 
          ? this.lerp(current.timescale?.pitch ?? 1.0, target.timescale.pitch, fraction)
          : current.timescale?.pitch,
        rate: target.timescale.rate !== undefined 
          ? this.lerp(current.timescale?.rate ?? 1.0, target.timescale.rate, fraction)
          : current.timescale?.rate
      };
    }
    
    return result;
  }
  
  /**
   * Combines multiple filters into a single filter
   * @param filters Array of filters to combine
   */
  public static combineFilters(...filters: FilterOptions[]): FilterOptions {
    return filters.reduce((acc, filter) => {
      const result: FilterOptions = { ...acc, ...filter };
      
      // Special handling for equalizer bands
      if (acc.equalizer && filter.equalizer) {
        result.equalizer = Array(15).fill(0).map((_, i) => ({
          band: i,
          gain: (acc.equalizer?.find(x => x.band === i)?.gain || 0) +
                (filter.equalizer?.find(x => x.band === i)?.gain || 0)
        }));
      }
      
      return result;
    }, {} as FilterOptions);
  }
  
  /**
   * Creates a dynamic filter based on parameters
   * @param params Parameters to create the filter
   */
  public static createDynamicFilter(params: {
    bassBoost?: number;
    trebleBoost?: number;
    vibrato?: number;
    tempo?: number;
  }): FilterOptions {
    const filter: FilterOptions = {};
    
    // Apply bass boost if specified
    if (params.bassBoost !== undefined) {
      filter.equalizer = Array(15).fill(0).map((_, i) => ({
        band: i,
        gain: i < 5 ? params.bassBoost! * 0.2 : 0
      }));
    }
    
    // Apply treble boost if specified
    if (params.trebleBoost !== undefined) {
      if (!filter.equalizer) filter.equalizer = Array(15).fill(0).map((_, i) => ({ band: i, gain: 0 }));
      for (let i = 10; i < 15; i++) {
        filter.equalizer[i].gain += params.trebleBoost * 0.2;
      }
    }
    
    // Apply vibrato if specified
    if (params.vibrato !== undefined) {
      filter.vibrato = {
        frequency: params.vibrato * 10,
        depth: 0.5
      };
    }
    
    // Apply tempo change if specified
    if (params.tempo !== undefined) {
      filter.timescale = {
        speed: params.tempo,
        pitch: 1.0,
        rate: 1.0
      };
    }
    
    return filter;
  }
}

/**
 * Manager for custom audio filters
 */
export class CustomFilterManager {
  private filters: Map<string, CustomFilter>;
  private lastUpdate: number = 0;
  private readonly updateInterval: number = 50; // ms
  private eventHandlers: Map<string, Function[]> = new Map();
  
  constructor() {
    this.filters = new Map();
  }

  /**
   * Adds a custom filter to the manager
   * @param name Filter name
   * @param filters Filter options
   * @param description Optional description
   * @param tags Optional tags for categorization
   */
  public addFilter(name: string, filters: FilterOptions, description?: string, tags?: string[]): void {
    FilterUtil.validateFilters(filters);
    this.filters.set(name, { name, filters, description, tags });
    this.emit('filterAdded', { name, filters, description, tags });
  }

  /**
   * Gets a filter by name
   * @param name Filter name
   */
  public getFilter(name: string): CustomFilter {
    const filter = this.filters.get(name);
    if (!filter) throw new Error(`Filter "${name}" not found`);
    return filter;
  }
  
  /**
   * Removes a filter by name
   * @param name Filter name
   */
  public removeFilter(name: string): boolean {
    const result = this.filters.delete(name);
    if (result) {
      this.emit('filterRemoved', { name });
    }
    return result;
  }
  
  /**
   * Updates an existing filter
   * @param name Filter name
   * @param filters New filter options
   * @param description Optional new description
   * @param tags Optional new tags
   */
  public updateFilter(name: string, filters: FilterOptions, description?: string, tags?: string[]): void {
    if (!this.filters.has(name)) {
      throw new Error(`Filter "${name}" not found`);
    }
    
    FilterUtil.validateFilters(filters);
    const existingFilter = this.filters.get(name)!;
    
    this.filters.set(name, {
      name,
      filters,
      description: description ?? existingFilter.description,
      tags: tags ?? existingFilter.tags
    });
    
    this.emit('filterUpdated', { name, filters, description, tags });
  }
  
  /**
   * Get all filter names
   */
  public getFilterNames(): string[] {
    return Array.from(this.filters.keys());
  }
  
  /**
   * Get all filters
   */
  public getAllFilters(): CustomFilter[] {
    return Array.from(this.filters.values());
  }
  
  /**
   * Find filters by tag
   * @param tag Tag to search for
   */
  public findFiltersByTag(tag: string): CustomFilter[] {
    return this.getAllFilters().filter(filter => 
      filter.tags?.includes(tag)
    );
  }
  
  /**
   * Clear all filters
   */
  public clearFilters(): void {
    this.filters.clear();
    this.emit('filtersCleared', {});
  }

  /**
   * Apply a filter to a player
   * @param player Player instance
   * @param name Filter name
   */
  public async applyFilter(player: any, name: string): Promise<void> {
    const filter = this.getFilter(name);
    await player.setFilters(filter.filters);
    this.emit('filterApplied', { player, name, filter });
  }

  /**
   * Interpolates between current player filters and target filters
   * @param player Player instance
   * @param targetFilters Target filter values
   * @param options Interpolation options
   */
  public async interpolateFilters(
    player: any,
    targetFilters: FilterOptions,
    options: { steps?: number; duration?: number } = {}
  ): Promise<void> {
    const { steps = 10, duration = 500 } = options;
    const stepDuration = duration / steps;
    const currentFilters = player.filters;
    
    for (let i = 1; i <= steps; i++) {
      const fraction = i / steps;
      const interpolated = FilterUtil.interpolateFilterValues(
        currentFilters,
        targetFilters,
        fraction
      );
      
      const now = Date.now();
      if (now - this.lastUpdate >= this.updateInterval) {
        this.lastUpdate = now;
        await player.setFilters(interpolated);
      }
      
      await new Promise(r => setTimeout(r, stepDuration));
    }
    
    this.emit('filterInterpolationComplete', { player, targetFilters });
  }
  
  /**
   * Register event handler
   * @param event Event name
   * @param callback Callback function
   */
  public on(event: string, callback: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(callback);
  }
  
  /**
   * Remove event handler
   * @param event Event name
   * @param callback Callback function
   */
  public off(event: string, callback: Function): void {
    if (!this.eventHandlers.has(event)) return;
    const handlers = this.eventHandlers.get(event)!;
    const index = handlers.indexOf(callback);
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }
  
  /**
   * Emit event
   * @param event Event name
   * @param data Event data
   */
  private emit(event: string, data: any): void {
    if (!this.eventHandlers.has(event)) return;
    const handlers = this.eventHandlers.get(event)!;
    for (const handler of handlers) {
      handler(data);
    }
  }
}

/**
 * Filter chain system for applying multiple filters in sequence
 */
export class FilterChain {
  private filters: FilterOptions[] = [];
  private name?: string;
  
  /**
   * Create a new filter chain
   * @param name Optional name for the chain
   */
  constructor(name?: string) {
    this.name = name;
  }
  
  /**
   * Add a filter to the chain
   * @param filter Filter to add
   */
  public add(filter: FilterOptions): FilterChain {
    this.filters.push(filter);
    return this;
  }
  
  /**
   * Add a named filter from a CustomFilterManager
   * @param manager Filter manager
   * @param name Filter name
   */
  public addNamed(manager: CustomFilterManager, name: string): FilterChain {
    const filter = manager.getFilter(name);
    this.filters.push(filter.filters);
    return this;
  }
  
  /**
   * Apply the filter chain to a player
   * @param player Player to apply filters to
   */
  public async apply(player: any): Promise<void> {
    const combined = this.combine();
    await player.setFilters(combined);
  }
  
  /**
   * Combine all filters in the chain
   */
  public combine(): FilterOptions {
    return this.filters.reduce(
      (acc, filter) => FilterUtil.combineFilters(acc, filter),
      {} as FilterOptions
    );
  }
  
  /**
   * Reset the chain
   */
  public reset(): FilterChain {
    this.filters = [];
    return this;
  }
  
  /**
   * Get the name of the chain
   */
  public getName(): string | undefined {
    return this.name;
  }
  
  /**
   * Set the name of the chain
   * @param name New name
   */
  public setName(name: string): FilterChain {
    this.name = name;
    return this;
  }
}

/**
 * Cached filter manager for performance optimization
 */
export class CachedFilterManager {
  private cache: Map<string, FilterOptions> = new Map();
  private ttl: number;
  private timestamps: Map<string, number> = new Map();
  
  /**
   * Create a new cached filter manager
   * @param ttl Time to live in milliseconds (default: 1 hour)
   */
  constructor(ttl: number = 3600000) {
    this.ttl = ttl;
  }
  
  /**
   * Get a filter from the cache, or generate it if not cached
   * @param key Cache key
   * @param generator Function to generate the filter if not cached
   */
  public getFilter(key: string, generator: () => FilterOptions): FilterOptions {
    this.cleanExpired();
    
    if (!this.cache.has(key)) {
      const filter = generator();
      this.cache.set(key, filter);
      this.timestamps.set(key, Date.now());
    }
    
    return this.cache.get(key)!;
  }
  
  /**
   * Manually add a filter to the cache
   * @param key Cache key
   * @param filter Filter to cache
   */
  public cacheFilter(key: string, filter: FilterOptions): void {
    this.cache.set(key, filter);
    this.timestamps.set(key, Date.now());
  }
  
  /**
   * Remove a filter from the cache
   * @param key Cache key
   */
  public invalidate(key: string): boolean {
    if (this.timestamps.has(key)) {
      this.timestamps.delete(key);
    }
    return this.cache.delete(key);
  }
  
  /**
   * Clear the entire cache
   */
  public clear(): void {
    this.cache.clear();
    this.timestamps.clear();
  }
  
  /**
   * Clean expired cache entries
   */
  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, timestamp] of this.timestamps.entries()) {
      if (now - timestamp > this.ttl) {
        this.cache.delete(key);
        this.timestamps.delete(key);
      }
    }
  }
  
  /**
   * Set the TTL for cache entries
   * @param ttl New TTL in milliseconds
   */
  public setTTL(ttl: number): void {
    this.ttl = ttl;
  }
}

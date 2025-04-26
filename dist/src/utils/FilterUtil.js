export class FilterUtil {
    /**
     * Creates an equalizer band array with flat bands
     */
    static createFlatEQ() {
        const bands = [];
        for (let i = 0; i < 15; i++) {
            bands.push({ band: i, gain: 0.0 });
        }
        return bands;
    }
    /**
     * Creates a bass boost equalizer with the specified gain
     * @param gain The gain to use (-0.25 to 1.0)
     */
    static createBassBoostEQ(gain = 0.5) {
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
    static nightcorePreset() {
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
    static vaporwavePreset() {
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
    static eightDimensionalPreset() {
        return {
            rotation: {
                rotationHz: 0.2
            }
        };
    }
    /**
     * Creates a night mode filter preset that enhances bass and reduces treble
     */
    static nightModePreset() {
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
    static enhancedVocalsPreset() {
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
    static validateFilters(filters) {
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
    static lerp(start, end, fraction) {
        return start + (end - start) * fraction;
    }
    /**
     * Interpolates between filter values
     * @param current Current filter values
     * @param target Target filter values
     * @param fraction Interpolation fraction (0-1)
     */
    static interpolateFilterValues(current, target, fraction) {
        const result = {};
        // Interpolate volume
        if (target.volume !== undefined) {
            result.volume = this.lerp(current.volume ?? 100, target.volume, fraction);
        }
        // Interpolate equalizer
        if (target.equalizer) {
            result.equalizer = target.equalizer.map((band, i) => ({
                band: band.band,
                gain: this.lerp(current.equalizer?.[i]?.gain ?? 0, band.gain, fraction)
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
    static combineFilters(...filters) {
        return filters.reduce((acc, filter) => {
            const result = { ...acc, ...filter };
            // Special handling for equalizer bands
            if (acc.equalizer && filter.equalizer) {
                result.equalizer = Array(15).fill(0).map((_, i) => ({
                    band: i,
                    gain: (acc.equalizer?.find(x => x.band === i)?.gain || 0) +
                        (filter.equalizer?.find(x => x.band === i)?.gain || 0)
                }));
            }
            return result;
        }, {});
    }
    /**
     * Creates a dynamic filter based on parameters
     * @param params Parameters to create the filter
     */
    static createDynamicFilter(params) {
        const filter = {};
        // Apply bass boost if specified
        if (params.bassBoost !== undefined) {
            filter.equalizer = Array(15).fill(0).map((_, i) => ({
                band: i,
                gain: i < 5 ? params.bassBoost * 0.2 : 0
            }));
        }
        // Apply treble boost if specified
        if (params.trebleBoost !== undefined) {
            if (!filter.equalizer)
                filter.equalizer = Array(15).fill(0).map((_, i) => ({ band: i, gain: 0 }));
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
    /**
     * Returns a FilterOptions object for karaoke
     */
    static karaoke(options) {
        return { karaoke: options };
    }
    /**
     * Returns a FilterOptions object for timescale
     */
    static timescale(options) {
        return { timescale: options };
    }
    /**
     * Returns a FilterOptions object for tremolo
     */
    static tremolo(options) {
        return { tremolo: options };
    }
    /**
     * Returns a FilterOptions object for vibrato
     */
    static vibrato(options) {
        return { vibrato: options };
    }
    /**
     * Returns a FilterOptions object for rotation
     */
    static rotation(options) {
        return { rotation: options };
    }
    /**
     * Returns a FilterOptions object for distortion
     */
    static distortion(options) {
        return { distortion: options };
    }
    /**
     * Returns a FilterOptions object for channel mix
     */
    static channelMix(options) {
        return { channelMix: options };
    }
    /**
     * Returns a FilterOptions object for low pass
     */
    static lowPass(options) {
        return { lowPass: options };
    }
    /**
     * Returns a FilterOptions object for equalizer
     */
    static equalizer(bands) {
        return { equalizer: bands };
    }
}
/**
 * Manager for custom audio filters
 */
export class CustomFilterManager {
    constructor() {
        this.lastUpdate = 0;
        this.updateInterval = 50; // ms
        this.eventHandlers = new Map();
        this.filters = new Map();
    }
    /**
     * Adds a custom filter to the manager
     * @param name Filter name
     * @param filters Filter options
     * @param description Optional description
     * @param tags Optional tags for categorization
     */
    addFilter(name, filters, description, tags) {
        FilterUtil.validateFilters(filters);
        this.filters.set(name, { name, filters, description, tags });
        this.emit('filterAdded', { name, filters, description, tags });
    }
    /**
     * Gets a filter by name
     * @param name Filter name
     */
    getFilter(name) {
        const filter = this.filters.get(name);
        if (!filter)
            throw new Error(`Filter "${name}" not found`);
        return filter;
    }
    /**
     * Removes a filter by name
     * @param name Filter name
     */
    removeFilter(name) {
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
    updateFilter(name, filters, description, tags) {
        if (!this.filters.has(name)) {
            throw new Error(`Filter "${name}" not found`);
        }
        FilterUtil.validateFilters(filters);
        const existingFilter = this.filters.get(name);
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
    getFilterNames() {
        return Array.from(this.filters.keys());
    }
    /**
     * Get all filters
     */
    getAllFilters() {
        return Array.from(this.filters.values());
    }
    /**
     * Find filters by tag
     * @param tag Tag to search for
     */
    findFiltersByTag(tag) {
        return this.getAllFilters().filter(filter => filter.tags?.includes(tag));
    }
    /**
     * Clear all filters
     */
    clearFilters() {
        this.filters.clear();
        this.emit('filtersCleared', {});
    }
    /**
     * Apply a filter to a player
     * @param player Player instance
     * @param name Filter name
     */
    async applyFilter(player, name) {
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
    async interpolateFilters(player, targetFilters, options = {}) {
        const { steps = 10, duration = 500 } = options;
        const stepDuration = duration / steps;
        const currentFilters = player.filters;
        for (let i = 1; i <= steps; i++) {
            const fraction = i / steps;
            const interpolated = FilterUtil.interpolateFilterValues(currentFilters, targetFilters, fraction);
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
    on(event, callback) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(callback);
    }
    /**
     * Remove event handler
     * @param event Event name
     * @param callback Callback function
     */
    off(event, callback) {
        if (!this.eventHandlers.has(event))
            return;
        const handlers = this.eventHandlers.get(event);
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
    emit(event, data) {
        if (!this.eventHandlers.has(event))
            return;
        const handlers = this.eventHandlers.get(event);
        for (const handler of handlers) {
            handler(data);
        }
    }
}
/**
 * Filter chain system for applying multiple filters in sequence
 */
export class FilterChain {
    /**
     * Create a new filter chain
     * @param name Optional name for the chain
     */
    constructor(name) {
        this.filters = [];
        this.name = name;
    }
    /**
     * Add a filter to the chain
     * @param filter Filter to add
     */
    add(filter) {
        this.filters.push(filter);
        return this;
    }
    /**
     * Add a named filter from a CustomFilterManager
     * @param manager Filter manager
     * @param name Filter name
     */
    addNamed(manager, name) {
        const filter = manager.getFilter(name);
        this.filters.push(filter.filters);
        return this;
    }
    /**
     * Apply the filter chain to a player
     * @param player Player to apply filters to
     */
    async apply(player) {
        const combined = this.combine();
        await player.setFilters(combined);
    }
    /**
     * Combine all filters in the chain
     */
    combine() {
        return this.filters.reduce((acc, filter) => FilterUtil.combineFilters(acc, filter), {});
    }
    /**
     * Reset the chain
     */
    reset() {
        this.filters = [];
        return this;
    }
    /**
     * Get the name of the chain
     */
    getName() {
        return this.name;
    }
    /**
     * Set the name of the chain
     * @param name New name
     */
    setName(name) {
        this.name = name;
        return this;
    }
}
/**
 * Cached filter manager for performance optimization
 */
export class CachedFilterManager {
    /**
     * Create a new cached filter manager
     * @param ttl Time to live in milliseconds (default: 1 hour)
     */
    constructor(ttl = 3600000) {
        this.cache = new Map();
        this.timestamps = new Map();
        this.ttl = ttl;
    }
    /**
     * Get a filter from the cache, or generate it if not cached
     * @param key Cache key
     * @param generator Function to generate the filter if not cached
     */
    getFilter(key, generator) {
        this.cleanExpired();
        if (!this.cache.has(key)) {
            const filter = generator();
            this.cache.set(key, filter);
            this.timestamps.set(key, Date.now());
        }
        return this.cache.get(key);
    }
    /**
     * Manually add a filter to the cache
     * @param key Cache key
     * @param filter Filter to cache
     */
    cacheFilter(key, filter) {
        this.cache.set(key, filter);
        this.timestamps.set(key, Date.now());
    }
    /**
     * Remove a filter from the cache
     * @param key Cache key
     */
    invalidate(key) {
        if (this.timestamps.has(key)) {
            this.timestamps.delete(key);
        }
        return this.cache.delete(key);
    }
    /**
     * Clear the entire cache
     */
    clear() {
        this.cache.clear();
        this.timestamps.clear();
    }
    /**
     * Clean expired cache entries
     */
    cleanExpired() {
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
    setTTL(ttl) {
        this.ttl = ttl;
    }
}
//# sourceMappingURL=FilterUtil.js.map
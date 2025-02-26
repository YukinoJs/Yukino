import { EventEmitter } from 'events';
import { TrackData, Filters } from '../../types';
import { Events, LoadTypes } from '../../constants';
import { Rest } from './Rest';

export class Queue extends EventEmitter {
    private tracks: TrackData[] = [];
    private current: TrackData | null = null;
    private previous: TrackData[] = [];
    private loop = 'off';
    private maxSize: number;
    private filters: Filters = {};
    private rest?: Rest;

    constructor(maxSize = 1000, rest?: Rest) {
        super();
        this.maxSize = maxSize;
        this.rest = rest;
    }

    public async addFromUrl(url: string): Promise<void> {
        if (!this.rest) throw new Error('Rest client not configured');

        try {
            const result = await this.rest.loadTracks(url);
            
            switch (result.loadType) {
                case LoadTypes.TRACK_LOADED:
                    await this.add(result.data[0]);
                    break;
                case LoadTypes.PLAYLIST_LOADED:
                    for (const track of result.data) {
                        await this.add(track);
                    }
                    break;
                case LoadTypes.SEARCH_RESULT:
                    await this.add(result.data[0]);
                    break;
                case LoadTypes.NO_MATCHES:
                    throw new Error('No matches found');
                case LoadTypes.LOAD_FAILED:
                    throw new Error('Failed to load track');
            }
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to load track: ${error.message}`);
            } else {
                throw new Error('Failed to load track: unknown error');
            }
        }
    }

    public setRest(rest: Rest): void {
        this.rest = rest;
    }

    public async search(query: string, source: string = 'youtube'): Promise<TrackData[]> {
        if (!this.rest) throw new Error('Rest client not configured');
        return this.rest.search(query, source);
    }

    public setFilters(filters: Filters): void {
        this.filters = { ...this.filters, ...filters };
        this.emit('filtersUpdate', this.filters);
    }

    public clearFilters(): void {
        this.filters = {};
        this.emit('filtersUpdate', this.filters);
    }

    public getFilters(): Filters {
        return { ...this.filters };
    }

    public async add(track: TrackData): Promise<TrackData> {
        if (typeof track === 'string') {
            const result = await this.rest?.loadTracks(track);
            if (!result) throw new Error('Rest client not configured');

            switch (result.loadType) {
                case LoadTypes.TRACK_LOADED:
                case LoadTypes.SEARCH_RESULT:
                    track = result.data[0];
                    break;
                case LoadTypes.PLAYLIST_LOADED:
                    track = result.data[0];
                    break;
                case LoadTypes.NO_MATCHES:
                    throw new Error('No tracks found');
                case LoadTypes.LOAD_FAILED:
                    throw new Error('Track load failed');
                default:
                    throw new Error('Invalid load type');
            }
        }

        this.tracks.push(track);
        this.emit(Events.QUEUE_ADD, track);
        return track;
    }

    public remove(index: number): TrackData | undefined {
        if (index < 0 || index >= this.tracks.length) return undefined;
        const removed = this.tracks.splice(index, 1)[0];
        this.emit(Events.QUEUE_UPDATE, this.tracks);
        return removed;
    }

    public clear(includeCurrent = false): void {
        this.tracks = [];
        if (includeCurrent) this.current = null;
        this.emit(Events.QUEUE_UPDATE, this.tracks);
    }

    public shuffle(): void {
        for (let i = this.tracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]];
        }
        this.emit(Events.QUEUE_UPDATE, this.tracks);
    }

    public shuffleRemaining(): void {
        const currentIndex = this.tracks.length;
        for (let i = currentIndex - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]];
        }
        this.emit(Events.QUEUE_SHUFFLE, this.tracks);
    }

    public next(): TrackData | null {
        if (this.loop === 'track' && this.current) {
            return this.current;
        }

        const next = this.tracks.shift();
        if (!next) {
            if (this.loop === 'queue' && this.previous.length) {
                this.tracks = [...this.previous];
                this.previous = [];
                return this.tracks.shift() || null;
            }
            this.emit(Events.QUEUE_END);
            return null;
        }

        if (this.current) {
            this.previous.push(this.current);
        }
        this.current = next;
        this.emit(Events.QUEUE_UPDATE, this.tracks);
        return next;
    }

    public setLoop(type: 'off' | 'track' | 'queue'): void {
        this.loop = type;
    }

    public get size(): number {
        return this.tracks.length;
    }

    public get totalSize(): number {
        return this.tracks.length + this.previous.length + (this.current ? 1 : 0);
    }

    public get currentTrack(): TrackData | null {
        return this.current;
    }

    public get previousTrack(): TrackData | null {
        return this.previous[this.previous.length - 1] || null;
    }

    public get upcoming(): TrackData[] {
        return [...this.tracks];
    }

    public get history(): TrackData[] {
        return [...this.previous];
    }

    public moveTrack(from: number, to: number): boolean {
        if (from < 0 || to < 0 || from >= this.tracks.length || to >= this.tracks.length) {
            return false;
        }

        const track = this.tracks.splice(from, 1)[0];
        this.tracks.splice(to, 0, track);
        this.emit(Events.QUEUE_UPDATE, this.tracks);
        return true;
    }

    public addNext(track: TrackData): void {
        this.tracks.unshift(track);
        this.emit(Events.QUEUE_UPDATE, this.tracks);
    }

    public removeRange(start: number, end: number): TrackData[] {
        const removed = this.tracks.splice(start, end - start);
        this.emit(Events.QUEUE_UPDATE, this.tracks);
        return removed;
    }

    public get isEmpty(): boolean {
        return this.tracks.length === 0 && !this.current;
    }

    public get duration(): number {
        return this.tracks.reduce((acc, track) => acc + (track.info.length || 0), 0);
    }

    public getTrack(index: number): TrackData | null {
        return this.tracks[index] || null;
    }
}
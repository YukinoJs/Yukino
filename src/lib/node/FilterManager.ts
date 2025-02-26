import { Filters, EqualizerBand, TimescaleFilter } from '../../types';
import { Player } from './Player';

export class FilterManager {
    private readonly player: Player;
    private filters: Filters = {};

    constructor(player: Player) {
        this.player = player;
    }

    public async setVolume(volume: number): Promise<void> {
        this.filters.volume = Math.max(0, Math.min(1000, volume)) / 100;
        await this.apply();
    }

    public async setEqualizer(bands: EqualizerBand[]): Promise<void> {
        this.filters.equalizer = bands.map(band => ({
            band: Math.min(Math.max(0, band.band), 14),
            gain: Math.min(Math.max(-0.25, band.gain), 1.0)
        }));
        await this.apply();
    }

    public async setKaraoke(level?: number, monoLevel?: number, filterBand?: number, filterWidth?: number): Promise<void> {
        this.filters.karaoke = {
            level,
            monoLevel,
            filterBand,
            filterWidth
        };
        await this.apply();
    }

    public async setTimescale({ speed, pitch, rate }: TimescaleFilter): Promise<void> {
        this.filters.timescale = {
            speed,
            pitch,
            rate
        };
        await this.apply();
    }

    public async setTremolo(frequency?: number, depth?: number): Promise<void> {
        this.filters.tremolo = {
            frequency,
            depth
        };
        await this.apply();
    }

    public async setVibrato(frequency?: number, depth?: number): Promise<void> {
        this.filters.vibrato = {
            frequency,
            depth
        };
        await this.apply();
    }

    public async setRotation(rotationHz?: number): Promise<void> {
        this.filters.rotation = {
            rotationHz
        };
        await this.apply();
    }

    public async setDistortion(
        sinOffset?: number,
        sinScale?: number,
        cosOffset?: number,
        cosScale?: number,
        tanOffset?: number,
        tanScale?: number,
        offset?: number,
        scale?: number
    ): Promise<void> {
        this.filters.distortion = {
            sinOffset,
            sinScale,
            cosOffset,
            cosScale,
            tanOffset,
            tanScale,
            offset,
            scale
        };
        await this.apply();
    }

    public async setChannelMix(
        leftToLeft?: number,
        leftToRight?: number,
        rightToLeft?: number,
        rightToRight?: number
    ): Promise<void> {
        this.filters.channelMix = {
            leftToLeft,
            leftToRight,
            rightToLeft,
            rightToRight
        };
        await this.apply();
    }

    public async setLowPass(smoothing?: number): Promise<void> {
        this.filters.lowPass = {
            smoothing
        };
        await this.apply();
    }

    public async clearFilters(): Promise<void> {
        this.filters = {};
        await this.apply();
    }

    private async apply(): Promise<void> {
        await this.player.setFilters(this.filters);
    }

    public getFilters(): Filters {
        return { ...this.filters };
    }
}
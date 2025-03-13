import { QueueOptions, Track } from '../types/interfaces';

export class Queue {
  public tracks: Track[];
  public current: Track | null;
  public previous: Track | null;
  public options: Required<QueueOptions>;

  constructor(options: QueueOptions = {}) {
    this.tracks = [];
    this.current = null;
    this.previous = null;
    this.options = {
      maxSize: 1000,
      defaultVolume: 100,
      durationType: 'ms',
      ...options
    };
  }

  /**
   * Get the total size of the queue including current track
   */
  public get size(): number {
    return this.tracks.length + (this.current ? 1 : 0);
  }

  /**
   * Get the total duration of all tracks in the queue
   */
  public get duration(): number {
    const currentDuration = this.current ? this.current.info.length : 0;
    const queueDuration = this.tracks.reduce((acc, track) => acc + track.info.length, 0);
    
    return currentDuration + queueDuration;
  }

  /**
   * Add a track or tracks to the queue
   */
  public add(track: Track | Track[]): void {
    if (Array.isArray(track)) {
      if (this.tracks.length + track.length > this.options.maxSize) {
        throw new Error(`Queue size limit reached (${this.options.maxSize})`);
      }
      this.tracks.push(...track);
    } else {
      if (this.tracks.length >= this.options.maxSize) {
        throw new Error(`Queue size limit reached (${this.options.maxSize})`);
      }
      this.tracks.push(track);
    }
  }

  /**
   * Get the next track in the queue
   */
  public next(): Track | null {
    const track = this.tracks.shift() || null;
    if (this.current) {
      this.previous = this.current;
    }
    this.current = track;
    return track;
  }

  /**
   * Remove a track from the queue at the specified position
   */
  public remove(position: number): Track | null {
    if (position < 0 || position >= this.tracks.length) return null;
    
    return this.tracks.splice(position, 1)[0] || null;
  }

  /**
   * Clear all tracks from the queue
   */
  public clear(): void {
    this.tracks = [];
  }

  /**
   * Shuffle the queue
   */
  public shuffle(): void {
    for (let i = this.tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]];
    }
  }

  /**
   * Move a track in the queue to a new position
   */
  public move(from: number, to: number): boolean {
    if (
      from < 0 ||
      to < 0 ||
      from >= this.tracks.length ||
      to >= this.tracks.length
    ) return false;
    
    const track = this.tracks.splice(from, 1)[0];
    this.tracks.splice(to, 0, track);
    return true;
  }
}

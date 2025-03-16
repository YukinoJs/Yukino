import { EqualizerBand } from '../types/interfaces';

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
}

import type { Preset } from 'unocss';
import type { PresetMcOptions } from './types';
import { rules } from './rules';

export function presetMagicolor(_options?: PresetMcOptions): Preset {
  return {
    name: 'unocss-preset-magicolor',
    layer: 'unocss-preset-magicolor',
    layers: { 'unocss-preset-magicolor': -100 },
    rules,
  };
};

export * from './types';

export default presetMagicolor;

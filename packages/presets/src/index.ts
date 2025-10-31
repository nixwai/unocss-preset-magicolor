import type { Preset } from 'unocss';
import type { PresetOptions } from './types';
import { rules } from './rules';

export function presetMagicolor(_options?: PresetOptions): Preset {
  return {
    name: 'unocss-preset-magicolor',
    layer: 'unocss-preset-magicolor',
    layers: { 'unocss-preset-magicolor': -100 },
    rules,
  };
};

export * from './types';

export default presetMagicolor;

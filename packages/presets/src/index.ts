import type { Preset } from 'unocss';
import type { Theme } from 'unocss/preset-mini';
import type { PresetOptions } from './types';
import { rules } from './rules';

export function presetMagicolor(_options?: PresetOptions): Preset<Theme> {
  return {
    name: 'unocss-preset-magicolor',
    layer: 'unocss-preset-magicolor',
    layers: { 'unocss-preset-magicolor': -100 },
    rules,
  };
};

export * from './types';

export default presetMagicolor;

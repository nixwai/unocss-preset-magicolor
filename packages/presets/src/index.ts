import type { Preset } from 'unocss';
import type { PresetMcOptions } from './types';
import { preflights } from './preflights';
import { rules } from './rules';

export function presetMagicolor(options: PresetMcOptions = {}): Preset {
  return {
    name: 'unocss-preset-magicolor',
    layer: 'unocss-preset-magicolor',
    layers: { 'unocss-preset-magicolor': -100 },
    rules,
    preflights: preflights(options),
  };
};

export * from './types';

export default presetMagicolor;

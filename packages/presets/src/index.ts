import type { Preset } from 'unocss';
import type { PresetMcOptions } from './types';
import type { MagicColorContext } from './usage';
import { preflights } from './preflights';
import { createRules } from './rules';
import { createMagicColorUsage } from './usage';

export function presetMagicolor(options: PresetMcOptions = {}): Preset {
  const usage = createMagicColorUsage();
  const context: MagicColorContext = {
    getUsage: usage.getUsage,
    getDefinedUsage: usage.getDefinedUsage,
    getUsageNames: usage.getUsageNames,
    isDefined: usage.isDefined,
  };

  return {
    name: 'unocss-preset-magicolor',
    layer: 'unocss-preset-magicolor',
    layers: { 'unocss-preset-magicolor': -100 },
    extractors: [usage.extractor],
    rules: createRules(context),
    preflights: preflights(options, context),
  };
};

export * from './types';

export default presetMagicolor;

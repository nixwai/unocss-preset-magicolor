import type { Preset } from 'unocss';
import type { PresetMcOptions } from './types';
import type { MagicColorContext } from './typing';
import { preflights } from './preflights';
import { createRules } from './rules';
import { MagicColorUsage } from './usages';
import { variants } from './variants';

/**
 * Creates the UnoCSS preset instance and wires a shared usage tracker through
 * extractors, rules, and preflights for this generator.
 */
export function presetMagicolor(options: PresetMcOptions = {}): Preset {
  const usage = new MagicColorUsage(options);
  const context: MagicColorContext = {
    options,
    usage,
  };

  return {
    name: 'unocss-preset-magicolor',
    layer: 'unocss-preset-magicolor',
    layers: { 'unocss-preset-magicolor': -100 },
    extractors: [usage.extractor],
    variants: variants(),
    rules: createRules(context),
    preflights: preflights(context),
  };
};

export * from './types';

export default presetMagicolor;

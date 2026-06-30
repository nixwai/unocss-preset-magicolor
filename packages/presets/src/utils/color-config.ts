import type { Theme } from '@unocss/preset-wind4';
import type { PresetMcColorValue } from '../types';
import type { MagicColorContext } from '../typing';
import { resolveSpecialColor } from '@unocss-preset-magicolor/utils';
import { hasParseableColor } from '@unocss/preset-wind4/utils';

export interface ResolvedColorConfig {
  color?: string
  lightnessReverse: boolean
}

export function resolveColorConfig(config?: PresetMcColorValue): ResolvedColorConfig {
  if (!config) {
    return { color: undefined, lightnessReverse: false };
  }
  if (typeof config === 'string') {
    return { color: config, lightnessReverse: false };
  }
  return {
    color: config.color,
    lightnessReverse: config.lightnessReverse === true,
  };
}

export function resolveMixtureColorConfig(
  name: string,
  theme: Theme,
  context?: MagicColorContext,
  preferDark?: boolean,
): ResolvedColorConfig {
  if (preferDark) {
    const darkColor = resolveColorConfig(context?.options.dark?.[name]);
    if (darkColor.color) {
      return darkColor;
    }
  }

  const optionColor = resolveColorConfig(context?.options.colors?.[name]);
  if (optionColor.color) {
    return optionColor;
  }

  if (!resolveSpecialColor(name) && hasParseableColor(name, theme)) {
    return { color: name, lightnessReverse: false };
  }

  return { color: undefined, lightnessReverse: false };
}

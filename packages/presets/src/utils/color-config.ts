import type { Theme } from '@unocss/preset-wind4';
import type { PresetMcColorValue } from '../types';
import type { MagicColorContext } from '../typing';
import { resolveSpecialColor } from '@unocss-preset-magicolor/utils';
import { hasParseableColor } from '@unocss/preset-wind4/utils';
import { isLiteralColor } from './color-variable';

export interface ResolvedColorConfig {
  color?: string
  lightnessReverse: boolean
}

/** Normalizes string and object color options into one internal shape. */
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

/**
 * Resolves a color by checking dark options, light options, and finally UnoCSS
 * theme colors in that priority order.
 */
export function resolveMixtureColorConfig(
  name: string,
  theme: Theme,
  context?: MagicColorContext,
  preferDark?: boolean,
): ResolvedColorConfig {
  if (resolveSpecialColor(name) || isLiteralColor(name)) {
    return { color: undefined, lightnessReverse: false };
  }

  if (preferDark) {
    // Dark aliases only win when the selector is being generated for a dark variant.
    const darkColor = resolveColorConfig(context?.options.dark?.[name]);
    if (darkColor.color) {
      return darkColor;
    }
  }

  const optionColor = resolveColorConfig(context?.options.colors?.[name]);
  if (optionColor.color) {
    return optionColor;
  }

  if (hasParseableColor(name, theme)) {
    // Plain theme colors can be used without being declared in preset options.
    return { color: name, lightnessReverse: false };
  }

  return { color: undefined, lightnessReverse: false };
}

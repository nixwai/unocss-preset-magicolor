import type { Theme } from '@unocss/preset-wind4';
import type { MagicColorOptions, PresetMcColorOptions, PresetMcColorValue, PresetMcOptions } from '../types';
import type { MagicColorContext } from '../typing';
import { resolveSpecialColor } from '@unocss-preset-magicolor/utils';
import { hasParseableColor } from '@unocss/preset-wind4/utils';
import { isLiteralColor } from './color-variable';

function kebabCaseColorName(name: string) {
  return name
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

/** Normalizes string and object color options into one internal shape. */
function normalizeColorConfig(config: PresetMcColorValue): PresetMcColorOptions {
  if (typeof config === 'string') {
    return { color: config };
  }
  return config;
}

function normalizeColorConfigs(colors?: Record<string, PresetMcColorValue>) {
  if (!colors) {
    return;
  }

  const normalized: Record<string, PresetMcColorOptions> = {};
  for (const [name, value] of Object.entries(colors)) {
    const colorConfig = normalizeColorConfig(value);
    normalized[name] = colorConfig;

    if (resolveSpecialColor(name)) {
      continue;
    }

    const alias = kebabCaseColorName(name);
    if (alias !== name && !(alias in normalized)) {
      normalized[alias] = colorConfig;
    }
  }
  return normalized;
}

/** Adds kebab-case aliases for camelCase color option keys without mutating user options. */
export function normalizePresetMcOptions(options: PresetMcOptions = {}): MagicColorOptions {
  return {
    ...options,
    colors: normalizeColorConfigs(options.colors),
    dark: normalizeColorConfigs(options.dark),
  };
}

/**
 * Resolves a color by checking dark options, light options, and finally UnoCSS
 * theme colors in that priority order.
 */
export function resolveMixtureColorConfig(
  name: string,
  theme: Theme,
  context: MagicColorContext,
  preferDark?: boolean,
): Partial<PresetMcColorOptions> {
  if (resolveSpecialColor(name) || isLiteralColor(name)) {
    return { color: undefined, lightnessReverse: false };
  }

  if (preferDark) {
    // Dark aliases only win when the selector is being generated for a dark variant.
    const darkColor = context.options.dark?.[name];
    if (darkColor?.color) {
      return darkColor;
    }
  }

  const optionColor = context.options.colors?.[name];
  if (optionColor?.color) {
    return optionColor;
  }

  if (hasParseableColor(name, theme)) {
    // Plain theme colors can be used without being declared in preset options.
    return { color: name, lightnessReverse: false };
  }

  return { color: undefined, lightnessReverse: false };
}

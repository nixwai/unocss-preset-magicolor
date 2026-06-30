import type { ResolvedColorParts, ThemeDepthColorOptions } from '@unocss-preset-magicolor/utils';
import type { Theme } from '@unocss/preset-wind4';
import type { CSSColorValue } from '@unocss/preset-wind4/utils';
import type { CSSObject } from 'unocss';
import type { ThemeKey } from '../typing';
import type { MagicColorDepth } from './color-variable';
import { getMcThemeMetaColors, getThemeDepthColor, isInvalidColor, resolveSpecialColor, themeMetaList, toOklch } from '@unocss-preset-magicolor/utils';
import { parseColor } from '@unocss/preset-wind4/utils';
import { BASE_COLOR_DEPTH, generateColorName } from './color-variable';

/**
 * Builds the full magic-color theme scale for a source color.
 *
 * UnoCSS theme colors take priority for standard depth keys; any missing keys
 * are generated from the base color with `magic-color`.
 */
function getThemeMetaColors(colorParts: ResolvedColorParts, theme: Theme) {
  const { originColor } = colorParts;

  if (!originColor || isInvalidColor(originColor)) {
    return;
  }

  const themeMetaColors: Partial<Record<ThemeKey, CSSColorValue>> = {};
  let hasEmptyColor = false;

  // Give priority to colors configured by the host UnoCSS theme.
  for (const themeMeta of themeMetaList) {
    const cssColor = parseColor(`${originColor}-${themeMeta}`, theme)?.cssColor;
    if (cssColor) {
      themeMetaColors[themeMeta] = cssColor;
    }
    else {
      hasEmptyColor = true;
    }
  }

  // Generate only missing depths from the parsed base color.
  if (hasEmptyColor) {
    let parsedOriginColor = parseColor(originColor, theme);
    if (!parsedOriginColor?.color) {
      parsedOriginColor = parseColor(`[${originColor}]`, theme); // It is compatible with or without []
    }
    if (parsedOriginColor?.color) {
      const mcThemeMetaColors = getMcThemeMetaColors(parsedOriginColor.color);
      for (const themeMeta of themeMetaList) {
        if (!themeMetaColors[themeMeta] && mcThemeMetaColors[themeMeta]) {
          themeMetaColors[themeMeta] = mcThemeMetaColors[themeMeta];
        }
      }
    }
  }

  // Store generated variables in one color space to keep output predictable.
  for (const themeMeta of themeMetaList) {
    themeMetaColors[themeMeta] = toOklch(themeMetaColors[themeMeta]);
  }

  return themeMetaColors;
}

/** Resolves the base variable value, honoring special colors and inline depth suffixes. */
function getBaseColor(
  colorParts: ResolvedColorParts,
  theme: Theme,
  themeMetaColors?: Partial<Record<ThemeKey, CSSColorValue>>,
  options: ThemeDepthColorOptions = {},
) {
  const { originColor, bodyNo } = colorParts;
  if (!originColor || isInvalidColor(originColor)) {
    return;
  }

  // Special colors are valid CSS keywords and do not need theme resolution.
  const specialColor = resolveSpecialColor(originColor);
  if (specialColor) {
    return specialColor;
  }

  if (!bodyNo) {
    let parsedColor = parseColor(originColor, theme)?.color;
    if (!parsedColor) {
      parsedColor = parseColor(`[${originColor}]`, theme)?.color; // It is compatible with or without []
    }
    return parsedColor;
  }

  themeMetaColors = themeMetaColors ?? getThemeMetaColors(colorParts, theme);
  if (!themeMetaColors) {
    return;
  }
  return getThemeDepthColor(themeMetaColors, bodyNo, options);
}

/**
 * Resolves the CSS variables needed for one magic color name.
 *
 * The usage tracker controls which depths are emitted so unused color scales do
 * not inflate the generated CSS.
 */
export function resolveThemeColorVariable(
  name: string,
  colorParts: ResolvedColorParts,
  theme: Theme = {},
  usage: Set<MagicColorDepth>,
  options: ThemeDepthColorOptions = {},
  generateVariableName: (name: string, depth?: string | number) => string = generateColorName,
) {
  const css: CSSObject = {};

  // Apply special color keywords to every requested variable depth.
  const specialColor = resolveSpecialColor(colorParts.originColor);
  if (specialColor) {
    for (const depth of usage) {
      css[generateVariableName(name, depth)] = specialColor;
    }
    return css;
  }

  const themeMetaColors = getThemeMetaColors(colorParts, theme);
  if (!themeMetaColors) {
    return css;
  }

  for (const depth of usage) {
    const color = depth === BASE_COLOR_DEPTH
      ? getBaseColor(colorParts, theme, themeMetaColors, options)
      : getThemeDepthColor(themeMetaColors, depth, options);
    if (color) {
      css[generateVariableName(name, depth)] = color;
    }
  }

  return css;
}

/** Resolves a single color value for non-variable utility fallbacks. */
export function resolveThemeColorValue(colorParts: ResolvedColorParts, theme: Theme = {}, options: ThemeDepthColorOptions = {}) {
  return getBaseColor(colorParts, theme, undefined, options);
}

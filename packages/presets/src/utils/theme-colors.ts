import type { ResolvedColorParts, ThemeDepthOptions } from '@unocss-preset-magicolor/utils';
import type { Theme } from '@unocss/preset-wind4';
import type { CSSColorValue } from '@unocss/preset-wind4/utils';
import type { CSSObject } from 'unocss';
import type { ThemeKey } from '../typing';
import type { MagicColorDepth } from './color-variable';
import { getMcThemeMetaColors, getThemeDepthColor, isInvalidColor, resolveSpecialColor, themeMetaList, toOklch } from '@unocss-preset-magicolor/utils';
import { parseColor } from '@unocss/preset-wind4/utils';
import { BASE_COLOR_DEPTH, createTargetColorVariableName } from './color-variable';

/**
 * Builds the full magic-color theme scale for a source color.
 *
 * UnoCSS theme colors take priority for standard depth keys;
 * any missing keys are generated from the base color with `magic-color`.
 */
function getThemeMetaColors(color: string, theme: Theme) {
  const themeMetaColors: Partial<Record<ThemeKey, CSSColorValue>> = {};
  let hasEmptyColor = false;

  // Give priority to colors configured by the host UnoCSS theme.
  for (const themeMeta of themeMetaList) {
    const cssColor = parseColor(`${color}-${themeMeta}`, theme)?.cssColor;
    if (cssColor) {
      themeMetaColors[themeMeta] = cssColor;
    }
    else {
      hasEmptyColor = true;
    }
  }

  // Generate only missing depths from the parsed base color.
  if (hasEmptyColor) {
    let parsedOriginColor = parseColor(color, theme);
    if (!parsedOriginColor?.color) {
      parsedOriginColor = parseColor(`[${color}]`, theme); // It is compatible with or without []
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
  options: ThemeDepthOptions = {},
) {
  const { originColor, originDepth } = colorParts;
  if (!originColor || isInvalidColor(originColor)) {
    return;
  }

  // Special colors are valid CSS keywords and do not need theme resolution.
  const specialColor = resolveSpecialColor(originColor);
  if (specialColor) {
    return specialColor;
  }

  if (!originDepth) {
    let parsedColor = parseColor(originColor, theme)?.color;
    if (!parsedColor) {
      parsedColor = parseColor(`[${originColor}]`, theme)?.color; // It is compatible with or without []
    }
    return parsedColor;
  }

  themeMetaColors = themeMetaColors ?? getThemeMetaColors(originColor, theme);
  if (!themeMetaColors) {
    return;
  }
  return getThemeDepthColor(themeMetaColors, originDepth, options);
}

/**
 * Resolves the CSS variables needed for one magic color name.
 *
 * The usage tracker controls which depths are emitted so unused color scales do
 * not inflate the generated CSS.
 */
export function resolveThemeColorCss(
  name: string,
  colorParts: ResolvedColorParts,
  theme: Theme = {},
  depths?: Set<MagicColorDepth>,
  options: ThemeDepthOptions = {},
  createVariableName: (name: string, depth?: string | number) => string = createTargetColorVariableName,
) {
  const css: CSSObject = {};

  if (!depths?.size) {
    return css;
  }

  const { originColor } = colorParts;

  // Early exit if the source color is invalid.
  if (!originColor || isInvalidColor(originColor)) {
    return css;
  }

  // Apply special color keywords to every requested variable depth.
  const specialColor = resolveSpecialColor(originColor);
  if (specialColor) {
    for (const depth of depths) {
      css[createVariableName(name, depth)] = specialColor;
    }
    return css;
  }

  const themeDepths = Array.from(depths).filter(depth => depth !== BASE_COLOR_DEPTH);
  const themeMetaColors = themeDepths.length ? getThemeMetaColors(originColor, theme) : undefined;

  if (depths.has(BASE_COLOR_DEPTH)) {
    const color = getBaseColor(colorParts, theme, themeMetaColors, options);
    if (color) {
      css[createVariableName(name, BASE_COLOR_DEPTH)] = color;
    }
  }

  if (!themeMetaColors) {
    return css;
  }

  themeDepths.forEach((depth) => {
    const color = getThemeDepthColor(themeMetaColors, depth, options);
    if (color) {
      css[createVariableName(name, depth)] = color;
    }
  });

  return css;
}

/** Resolves a single color value for non-variable utility fallbacks. */
export function resolveThemeColorValue(colorParts: ResolvedColorParts, theme: Theme = {}, options: ThemeDepthOptions = {}) {
  return getBaseColor(colorParts, theme, undefined, options);
}

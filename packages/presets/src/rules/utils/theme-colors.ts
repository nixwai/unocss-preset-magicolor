import type { ResolvedColorParts, ThemeDepthColorOptions } from '@unocss-preset-magicolor/utils';
import type { Theme } from '@unocss/preset-wind4';
import type { CSSColorValue } from '@unocss/preset-wind4/utils';
import type { CSSObject } from 'unocss';
import type { MagicColorContext, ThemeKey } from '../../typing';
import { getMcThemeMetaColors, getThemeDepthColor, isInvalidColor, themeMetaList, toOklch } from '@unocss-preset-magicolor/utils';
import { parseColor } from '@unocss/preset-wind4/utils';
import { BASE_COLOR_DEPTH } from '../../usages';

/**
 * get themeMetaColors
 * @param colorParts parsed color origin and depth
 * @param theme unocss theme
 * @returns themeMetaColors
 */
function getThemeMetaColors(colorParts: ResolvedColorParts, theme: Theme) {
  const { originColor } = colorParts;

  if (!originColor || isInvalidColor(originColor)) {
    return;
  }

  const themeMetaColors: Partial<Record<ThemeKey, CSSColorValue>> = {};
  let hasEmptyColor = false;

  // give priority to using the colors configured by the theme
  for (const themeMeta of themeMetaList) {
    const cssColor = parseColor(`${originColor}-${themeMeta}`, theme)?.cssColor;
    if (cssColor) {
      themeMetaColors[themeMeta] = cssColor;
    }
    else {
      hasEmptyColor = true;
    }
  }

  // use 'mc.theme' to supplement the colors
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

  // uniform use oklch
  for (const themeMeta of themeMetaList) {
    themeMetaColors[themeMeta] = toOklch(themeMetaColors[themeMeta]);
  }

  return themeMetaColors;
}

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
 * resolve color variable
 * @param name color name
 * @param colorParts parsed color origin and depth
 * @param theme unocss theme
 * @param context magic color context
 * @returns css variables
 */
export function resolveThemeColorVariable(
  name: string,
  colorParts: ResolvedColorParts,
  theme: Theme = {},
  context?: MagicColorContext,
  options: ThemeDepthColorOptions = {},
) {
  const css: CSSObject = {};

  const usage = context?.usage.getUsage(name);
  if (!usage) {
    return css;
  }

  const themeMetaColors = getThemeMetaColors(colorParts, theme);
  if (!themeMetaColors) {
    return css;
  }

  for (const depth of usage) {
    if (depth === BASE_COLOR_DEPTH) {
      const color = getBaseColor(colorParts, theme, themeMetaColors, options);
      if (color) {
        css[`--mc-${name}-color`] = color;
      }
      continue;
    }

    const color = getThemeDepthColor(themeMetaColors, depth, options);
    if (color) {
      css[`--mc-${name}-${depth}-color`] = color;
    }
  }

  return css;
}

export function resolveThemeColorValue(colorParts: ResolvedColorParts, theme: Theme = {}, options: ThemeDepthColorOptions = {}) {
  return getBaseColor(colorParts, theme, undefined, options);
}

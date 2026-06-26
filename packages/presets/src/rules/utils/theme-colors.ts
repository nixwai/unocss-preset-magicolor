import type { Theme } from '@unocss/preset-wind4';
import type { CSSColorValue } from '@unocss/preset-wind4/utils';
import type { CSSObject } from 'unocss';
import type { MagicColorContext, ThemeKey } from '../../typing';
import {
  getThemeDepthColor,
  isInvalidColor,
  normalizeColorDepth,
  resolveColorDepth,
  resolveColorOrigin,
  splitColorParts,
  themeMetaList,
  toOklch,
} from '@unocss-preset-magicolor/utils';
import { parseColor } from '@unocss/preset-wind4/utils';
import { mc } from 'magic-color';
import { BASE_COLOR_DEPTH } from '../../usages';

/**
 * get themeMetaColors
 * @param bodyColor `color-depth`: can be theme color or css color
 * @param theme unocss theme
 * @returns themeMetaColors
 */
function getThemeMetaColors(bodyColor: string, theme: Theme) {
  bodyColor = normalizeColorDepth(bodyColor);
  const originColor = resolveColorOrigin(bodyColor);

  if (isInvalidColor(originColor)) {
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
    try {
      let parsedOriginColor = parseColor(originColor, theme);
      if (!parsedOriginColor?.color) {
        parsedOriginColor = parseColor(`[${originColor}]`, theme); // It is compatible with or without []
      }
      if (parsedOriginColor?.color && mc.valid(parsedOriginColor.color)) {
        const themeColor = mc.theme(parsedOriginColor.color, { type: 'hex' });
        for (const themeMeta of themeMetaList) {
          if (!themeMetaColors[themeMeta]) {
            themeMetaColors[themeMeta] = { type: 'hex', components: [themeColor[themeMeta]], alpha: 1 };
          }
        }
      }
    }
    catch (e) {
      console.error(`[unocss-preset-margicolor] get ${originColor} theme fail, please use another color.`);
      console.error(e);
    }
  }

  // uniform use oklch
  for (const themeMeta of themeMetaList) {
    themeMetaColors[themeMeta] = toOklch(themeMetaColors[themeMeta]);
  }

  return themeMetaColors;
}

function getBaseColor(
  bodyColor: string,
  theme: Theme,
  themeMetaColors?: Partial<Record<ThemeKey, CSSColorValue>>,
) {
  bodyColor = normalizeColorDepth(bodyColor);
  let parsedColor = parseColor(bodyColor, theme)?.color;
  const bodyNo = resolveColorDepth(bodyColor);
  if (!parsedColor && !bodyNo) {
    parsedColor = parseColor(`[${bodyColor}]`, theme)?.color; // It is compatible with or without []
  }
  if (parsedColor) {
    return parsedColor;
  }
  if (!bodyNo) {
    return;
  }
  themeMetaColors = themeMetaColors ?? getThemeMetaColors(bodyColor, theme);
  if (!themeMetaColors) {
    return;
  }
  return getThemeDepthColor(themeMetaColors, bodyNo);
}

/**
 * resolve color variable
 * @param name color name
 * @param hue `color-depth`: color can be theme color or css color
 * @param theme unocss theme
 * @param context magic color context
 * @returns css variables
 */
export function resolveThemeColorVariable(name: string, hue: string, theme: Theme = {}, context?: MagicColorContext) {
  const css: CSSObject = {};

  const usage = context?.usage.getUsage(name);
  if (!usage) {
    return css;
  }

  const [bodyColor] = splitColorParts(hue);
  const themeMetaColors = getThemeMetaColors(bodyColor, theme);
  if (!themeMetaColors) {
    return css;
  }

  for (const depth of usage) {
    if (depth === BASE_COLOR_DEPTH) {
      const color = getBaseColor(bodyColor, theme, themeMetaColors);
      if (color) {
        css[`--mc-${name}-color`] = color;
      }
      continue;
    }

    const color = getThemeDepthColor(themeMetaColors, depth);
    if (color) {
      css[`--mc-${name}-${depth}-color`] = color;
    }
  }

  return css;
}

export function resolveThemeColorValue(bodyColor: string, theme: Theme = {}) {
  return getBaseColor(bodyColor, theme);
}

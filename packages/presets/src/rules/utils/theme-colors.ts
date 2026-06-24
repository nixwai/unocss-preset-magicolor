import type { Theme } from '@unocss/preset-wind4';
import type { CSSColorValue } from '@unocss/preset-wind4/utils';
import type { CSSObject } from 'unocss';
import type { ThemeKey } from '../../typing';
import type { MagicColorUsage } from '../../usage';
import { parseColor } from '@unocss/preset-wind4/utils';
import { mc } from 'magic-color';
import { BASE_COLOR_DEPTH } from '../../usage';
import { getThemeDepthColor, isInvalidColor, themeMetaList, toOklch } from '../../utils';

/**
 * get themeMetaColors
 * @param bodyColor `color-depth`: can be theme color or css color
 * @param theme unocss theme
 * @returns themeMetaColors
 */
function getThemeMetaColors(bodyColor: string, theme: Theme) {
  const originColor = bodyColor?.split(/-\d+-?/)[0];

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

/**
 * get theme color variables
 * @param name color name
 * @param bodyColor `color-depth`: can be theme color or css color
 * @param themeMetaColors themeMetaColors
 * @param theme unocss theme
 * @returns css variables
 */
function getThemeColorVariables(
  name: string,
  bodyColor: string,
  themeMetaColors: Partial<Record<ThemeKey, CSSColorValue>>,
  theme: Theme,
  usage?: MagicColorUsage,
) {
  const bodyNo = bodyColor.match(/.*-(\d+)/)?.[1];
  const css: CSSObject = {};

  if (!usage) {
    return css;
  }

  for (const depth of usage.depths) {
    if (depth === BASE_COLOR_DEPTH) {
      const color = getBaseColor(bodyColor, bodyNo, themeMetaColors, theme);
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

function getBaseColor(
  bodyColor: string,
  bodyNo: string | undefined,
  themeMetaColors: Partial<Record<ThemeKey, CSSColorValue>>,
  theme: Theme,
) {
  let parsedColor = parseColor(bodyColor, theme)?.color;
  if (!parsedColor && !bodyNo) {
    parsedColor = parseColor(`[${bodyColor}]`, theme)?.color; // It is compatible with or without []
  }
  if (parsedColor) {
    return parsedColor;
  }
  if (bodyNo) {
    return getThemeDepthColor(themeMetaColors, bodyNo);
  }
}

/**
 * resolve color variable
 * @param name color name
 * @param hue `color-depth`: color can be theme color or css color
 * @param theme unocss theme
 * @returns css variables
 */
export function resolveThemeColorVariable(name: string, hue: string, theme: Theme = {}, usage?: MagicColorUsage) {
  const [bodyColor] = hue.split(/[:/]/);
  // can not use another color name configured by the theme
  if (name !== bodyColor && parseColor(name, theme)?.color) {
    console.error(`[unocss-preset-margicolor] The color name '${name}' has been configured in the theme, please use the another name.`);
    return;
  }

  const themeMetaColors = getThemeMetaColors(bodyColor, theme);
  if (themeMetaColors) {
    return getThemeColorVariables(name, bodyColor, themeMetaColors, theme, usage);
  }
}

export function resolveThemeColorValue(hue: string, theme: Theme = {}) {
  const [bodyColor] = hue.split(/[:/]/);
  const bodyNo = bodyColor.match(/.*-(\d+)/)?.[1];
  let parsedColor = parseColor(bodyColor, theme)?.color;

  if (!parsedColor && !bodyNo) {
    parsedColor = parseColor(`[${bodyColor}]`, theme)?.color;
  }

  if (parsedColor) {
    return parsedColor;
  }

  const themeMetaColors = getThemeMetaColors(bodyColor, theme);
  if (themeMetaColors && bodyNo) {
    return getThemeDepthColor(themeMetaColors, bodyNo);
  }
}

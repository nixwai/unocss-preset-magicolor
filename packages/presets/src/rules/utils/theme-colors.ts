import type { Theme } from '@unocss/preset-wind4';
import type { CSSColorValue } from '@unocss/preset-wind4/utils';
import type { CSSObject } from 'unocss';
import type { ThemeKey } from '../../typing';
import type { MagicColorUsage } from '../../usage';
import { parseColor } from '@unocss/preset-wind4/utils';
import { mc } from 'magic-color';
import { countDiffColor, generateOklchVariable, isInvalidColor, resolveDepth, roundNum, themeMetaList, toNum, toOklch } from '../../utils';

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
  // set body color
  let parsedColor = parseColor(bodyColor, theme)?.color;
  if (!parsedColor && !bodyNo) {
    parsedColor = parseColor(`[${bodyColor}]`, theme)?.color; // It is compatible with or without []
  }
  if (parsedColor) {
    css[`--mc-${name}-color`] = parsedColor;
  }
  else if (bodyNo) {
    const { originDepth, beforeDepth, afterDepth } = resolveDepth(bodyNo);
    if (themeMetaColors[beforeDepth] && themeMetaColors[afterDepth]) {
      css[`--mc-${name}-color`] = countDiffColor({
        originDepth,
        beforeDepth,
        beforeComponents: themeMetaColors[beforeDepth].components,
        afterComponents: themeMetaColors[afterDepth].components,
      });
    }
  }

  if (!usage) {
    // set all depth colors
    const colorVariables = generateOklchVariable(name, themeMetaColors);

    return Object.assign(css, colorVariables);
  }

  for (const depth of usage.depths) {
    const colorVar = `--mc-${name}-${depth}-color`;
    const { originDepth, beforeDepth, afterDepth } = resolveDepth(depth.toString());
    const beforeColor = themeMetaColors[beforeDepth];
    const afterColor = themeMetaColors[afterDepth];

    if (!beforeColor || !afterColor) {
      continue;
    }

    if (originDepth === beforeDepth || originDepth === afterDepth) {
      const depthColor = themeMetaColors[originDepth];
      if (depthColor && !css[`--mc-${name}-${originDepth}-l`]) {
        Object.assign(css, getOklchVariable(name, originDepth, depthColor));
      }
    }
    else {
      if (!css[`--mc-${name}-${beforeDepth}-l`]) {
        Object.assign(css, getOklchVariable(name, beforeDepth, beforeColor));
      }
      if (!css[`--mc-${name}-${afterDepth}-l`]) {
        Object.assign(css, getOklchVariable(name, afterDepth, afterColor));
      }
    }

    css[colorVar] = getDepthColor(name, originDepth, beforeDepth, afterDepth);
  }

  return css;
}

function getOklchVariable(name: string, depth: ThemeKey, color: CSSColorValue) {
  const colorComponents = color.components;
  return {
    [`--mc-${name}-${depth}-l`]: roundNum(toNum(colorComponents[0])),
    [`--mc-${name}-${depth}-c`]: roundNum(toNum(colorComponents[1])),
    [`--mc-${name}-${depth}-h`]: roundNum(toNum(colorComponents[2])),
  };
}

function getDepthColor(name: string, originDepth: ThemeKey, beforeDepth: ThemeKey, afterDepth: ThemeKey) {
  const colorVarL = `--mc-${name}-${originDepth}-l`;
  const colorVarC = `--mc-${name}-${originDepth}-c`;
  const colorVarH = `--mc-${name}-${originDepth}-h`;

  if (originDepth === beforeDepth || originDepth === afterDepth) {
    return `oklch(var(${colorVarL}) var(${colorVarC}) var(${colorVarH}))`;
  }

  const transitionRatio = (originDepth - beforeDepth) / ((originDepth < 100 || originDepth > 900) ? 50 : 100);
  const [calcL, calcC, calcH] = ['l', 'c', 'h'].map((key) => {
    const beforeVar = `var(--mc-${name}-${beforeDepth}-${key})`;
    const afterVar = `var(--mc-${name}-${afterDepth}-${key})`;
    return `calc(${beforeVar} + ${transitionRatio} * (${afterVar} - ${beforeVar}))`;
  });

  return `oklch(${calcL} ${calcC} ${calcH})`;
}

/**
 * resolve color variable
 * @param name color name
 * @param hue `color-depth`: color can be theme color or css color
 * @param theme unocss theme
 * @returns css variables
 */
export function resolveThemeColorVariable(name: string, hue: string, theme: Theme = {}, usage?: MagicColorUsage) {
  // can not use the color name configured by the theme
  if (parseColor(name, theme)?.color) {
    console.error(`[unocss-preset-margicolor] The color name '${name}' has been configured in the theme, please use the another name.`);
    return;
  }
  const [bodyColor] = hue.split(/[:/]/);
  const themeMetaColors = getThemeMetaColors(bodyColor, theme);
  if (themeMetaColors) {
    return getThemeColorVariables(name, bodyColor, themeMetaColors, theme, usage);
  }
}

import type { CSSColorValue } from '@unocss/preset-wind4/utils';
import type { CSSObject } from 'unocss';
import type { ThemeKey } from '../typing';
import { roundNum, toNum, toOklch } from './transforms';

export const themeMetaList: ThemeKey[] = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

export function resolveDepth(no: string) {
  // origin depth
  let originDepth = Number(no) as ThemeKey;
  originDepth = originDepth <= 50 ? 50 : originDepth;
  originDepth = originDepth >= 950 ? 950 : originDepth;
  // get before depth, can not be less than 50
  let beforeDepth = Math.floor(originDepth / 100) * 100 as ThemeKey;
  beforeDepth = beforeDepth <= 50 ? 50 : beforeDepth;
  // get after depth, can not be greater than 950
  let afterDepth = Math.floor((originDepth + 100) / 100) * 100 as ThemeKey;
  afterDepth = afterDepth >= 950 ? 950 : afterDepth;
  return { originDepth, beforeDepth, afterDepth };
}

/**
 * is invalid color
 */
export function isInvalidColor(color?: string) {
  if (!color || !Number.isNaN(Number(color))) {
    console.error(`[unocss-preset-margicolor] The color '${color}' is invalid.`);
    return true;
  }
  return false;
}

export function countDiffColor(params: {
  originDepth: number
  beforeDepth: number
  beforeComponents: (string | number)[]
  afterComponents: (string | number)[]
}) {
  const { originDepth, beforeDepth, beforeComponents, afterComponents } = params;
  const transitionRatio = (originDepth - beforeDepth) / ((originDepth < 100 || originDepth > 900) ? 50 : 100);
  const resultColor = Array.from({ length: 3 }).map((_, i) => {
    const value = toNum(beforeComponents[i]) + (toNum(afterComponents[i]) - toNum(beforeComponents[i])) * transitionRatio;
    return roundNum(value);
  });
  return `oklch(${resultColor.join(' ')})`;
}

export function stringifyOklchColor(cssColor?: CSSColorValue) {
  const color = toOklch(cssColor);
  if (!color) {
    return;
  }

  const components = color.components.map(value => roundNum(toNum(value)));
  const alpha = color.alpha != null && color.alpha !== 1 ? ` / ${color.alpha}` : '';

  return `oklch(${components.join(' ')}${alpha})`;
}

export function getThemeDepthColor(themeMetaColors: Partial<Record<ThemeKey, CSSColorValue>>, no: string | number) {
  const { originDepth, beforeDepth, afterDepth } = resolveDepth(no.toString());
  const originColor = themeMetaColors[originDepth];

  if (originDepth === beforeDepth || originDepth === afterDepth) {
    return stringifyOklchColor(originColor);
  }

  const beforeColor = themeMetaColors[beforeDepth];
  const afterColor = themeMetaColors[afterDepth];

  if (!beforeColor || !afterColor) {
    return;
  }

  return countDiffColor({
    originDepth,
    beforeDepth,
    beforeComponents: beforeColor.components,
    afterComponents: afterColor.components,
  });
}

export function generateOklchColorVariables(name: string, themeMetaColors: Partial<Record<ThemeKey, CSSColorValue>>) {
  const css: CSSObject = {};
  // set all depth colors
  for (const themeMeta of themeMetaList) {
    const color = stringifyOklchColor(themeMetaColors[themeMeta]);
    if (color) {
      css[`--mc-${name}-${themeMeta}-color`] = color;
    }
  }
  return css;
}

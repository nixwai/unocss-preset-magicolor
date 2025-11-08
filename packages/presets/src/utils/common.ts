import type { CSSColorValue } from '@unocss/preset-wind4/utils';
import type { CSSObject } from 'unocss';
import type { ThemeKey } from '../typing';
import { roundNum, toNum } from './transforms';

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

export function generateOklchVariable(name: string, themeMetaColors: Partial<Record<ThemeKey, CSSColorValue>>) {
  const css: CSSObject = {};
  // set all depth colors
  for (const themeMeta of themeMetaList) {
    if (themeMetaColors[themeMeta]) {
      const colorComponents = themeMetaColors[themeMeta].components;
      const colorL = roundNum(toNum(colorComponents[0]));
      const colorC = roundNum(toNum(colorComponents[1])) + 1000;
      const colorH = roundNum(toNum(colorComponents[2])) + 10000;
      css[`--mc-${name}-${themeMeta}`] = `${colorL},${colorC},${colorH}`;
    }
  }
  return css;
}

export function resolveOklchVariable(name: string, themeMeta: number) {
  return {
    [`--mc-${name}-${themeMeta}-l`]: `min(var(--mc-${name}-${themeMeta}))`,
    [`--mc-${name}-${themeMeta}-c`]: `calc(clamp(var(--mc-${name}-${themeMeta})) - 1000)`,
    [`--mc-${name}-${themeMeta}-h`]: `calc(max(var(--mc-${name}-${themeMeta})) - 10000)`,
  };
}

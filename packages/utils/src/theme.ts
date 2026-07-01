import type { CSSColorValue } from '@unocss/preset-wind4/utils';
import type { ThemeMetas } from 'magic-color';
import { mc } from 'magic-color';
import { roundNum, toNum, toOklch } from './transforms';

type ThemeKey = keyof ThemeMetas;

export interface ThemeDepthOptions {
  lightnessReverse?: boolean
}

export interface DepthOptions<TDefault = undefined> extends ThemeDepthOptions {
  depth?: number | string
  defaultValue?: TDefault
}

export const themeMetaList: ThemeKey[] = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

/**
 * Pure predicate: a color is invalid when it is empty/undefined or a bare number.
 */
export function isInvalidColor(color?: string) {
  return !color || !Number.isNaN(Number(color));
}

/**
 * Build the hex-based themeMeta color map for a valid color string using
 * `magic-color`'s theme generator. Returns whatever metas could be resolved;
 * an invalid color or a `mc.theme` failure yields an empty map (no logging).
 * @param originColor a color string (e.g. `#9c1d1e`, `red`)
 * @returns themeMeta → oklch CSSColorValue map (partial)
 */
export function getMcThemeMetaColors(originColor?: string): Partial<Record<ThemeKey, CSSColorValue>> {
  const themeMetaColors: Partial<Record<ThemeKey, CSSColorValue>> = {};

  if (!originColor || isInvalidColor(originColor) || !mc.valid(originColor)) {
    return themeMetaColors;
  }

  try {
    const themeColor = mc.theme(originColor, { type: 'hex' });
    for (const themeMeta of themeMetaList) {
      const hex = themeColor[themeMeta];
      if (!hex) {
        continue;
      }
      const cssColor = toOklch({ type: 'hex', components: [hex], alpha: 1 });
      if (cssColor) {
        themeMetaColors[themeMeta] = cssColor;
      }
    }
  }
  catch {
    // a single unparseable color must not break generation;
    console.error('[magic-color] Failed to generate themeMeta colors for', originColor);
  }

  return themeMetaColors;
}

function stringifyOklchColor(cssColor?: CSSColorValue) {
  const color = toOklch(cssColor);
  if (!color) {
    return;
  }

  const components = color.components.map(value => roundNum(toNum(value)));
  const alpha = color.alpha != null && color.alpha !== 1 ? ` / ${color.alpha}` : '';

  return `oklch(${components.join(' ')}${alpha})`;
}

export function resolveThemeDepth<TDefault>(options: DepthOptions<TDefault> & { defaultValue: TDefault }): number | TDefault;
export function resolveThemeDepth(options?: DepthOptions): number | undefined;
export function resolveThemeDepth<TDefault>(options: DepthOptions<TDefault> = {}) {
  const { defaultValue, depth, lightnessReverse } = options;
  const originDepth = Number(depth);
  if (!Number.isFinite(originDepth)) {
    return defaultValue as TDefault;
  }
  if (lightnessReverse) {
    return 1000 - originDepth;
  }
  return originDepth;
}

function resolveDepth(no: string | number, options: ThemeDepthOptions = {}) {
  // origin depth
  let originDepth = resolveThemeDepth({ depth: no, ...options });
  if (typeof originDepth !== 'number') {
    return;
  }
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

export function getThemeDepthColor(
  themeMetaColors: Partial<Record<ThemeKey, CSSColorValue>>,
  no: string | number,
  options: ThemeDepthOptions = {},
) {
  const depth = resolveDepth(no, options);
  if (!depth) {
    return;
  }
  const { originDepth, beforeDepth, afterDepth } = depth;
  const originColor = themeMetaColors[originDepth as ThemeKey];

  if (originColor) {
    return stringifyOklchColor(originColor);
  }

  const beforeColor = themeMetaColors[beforeDepth];
  const afterColor = themeMetaColors[afterDepth];

  if (!beforeColor || !afterColor) {
    return;
  }

  const beforeComponents = beforeColor.components;
  const afterComponents = afterColor.components;
  // Both endpoints need at least 3 channels to interpolate; otherwise the
  // missing channels would silently coerce to 0 and produce oklch(0 0 0).
  if (beforeComponents.length < 3 || afterComponents.length < 3) {
    return;
  }
  // The progressive process of depth is：50、100、200、300、400、500、600、700、800、900、950
  const transitionRatio = (originDepth - beforeDepth) / ((originDepth < 100 || originDepth > 900) ? 50 : 100);
  const resultColor = Array.from({ length: 3 }).map((_, i) => {
    const value = toNum(beforeComponents[i]) + (toNum(afterComponents[i]) - toNum(beforeComponents[i])) * transitionRatio;
    return roundNum(value);
  });
  return `oklch(${resultColor.join(' ')})`;
}

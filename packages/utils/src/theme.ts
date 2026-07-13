import type { CSSColorValue } from '@unocss/preset-wind4/utils';
import type { ThemeMetas } from 'magic-color';
import { mc } from 'magic-color';
import { roundNum, toNum, toOklch } from './transforms';

export type ThemeKey = keyof ThemeMetas | 0 | 1000;

export interface ThemeDepthOptions {
  lightnessReverse?: boolean
}

export interface DepthOptions<TDefault = undefined> extends ThemeDepthOptions {
  depth?: number | string
  defaultValue?: TDefault
}

export const themeMetaList: ThemeKey[] = [0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950, 1000];

/**
 * Builds a partial theme-depth color map from a valid source color.
 *
 * Invalid colors return an empty map so generation can continue safely.
 */
export function getMcThemeMetaColors(originColor?: string): Partial<Record<ThemeKey, CSSColorValue>> {
  const themeMetaColors: Partial<Record<ThemeKey, CSSColorValue>> = {};

  if (!originColor || !mc.valid(originColor)) {
    return themeMetaColors;
  }

  try {
    const themeColor: Partial<Record<ThemeKey, string>> = {
      0: '#ffffff',
      ...mc.theme(originColor, { type: 'hex' }),
      1000: '#000000',
    };
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

/** Resolves a numeric theme depth, optionally reversing it for lightness lookup. */
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
  originDepth = originDepth <= 0 ? 0 : originDepth;
  originDepth = originDepth >= 1000 ? 1000 : originDepth;
  const beforeDepth = [...themeMetaList].reverse().find(themeMeta => themeMeta <= originDepth) ?? 0;
  const afterDepth = themeMetaList.find(themeMeta => themeMeta >= originDepth) ?? 1000;
  return { originDepth, beforeDepth, afterDepth };
}

/** Resolves or interpolates the OKLCH color for a requested theme depth. */
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
  // Interpolate within the actual neighboring theme stops, including 0/50 and 950/1000.
  const depthRange = afterDepth - beforeDepth;
  const transitionRatio = depthRange === 0 ? 0 : (originDepth - beforeDepth) / depthRange;
  const resultColor = Array.from({ length: 3 }).map((_, i) => {
    const value = toNum(beforeComponents[i]) + (toNum(afterComponents[i]) - toNum(beforeComponents[i])) * transitionRatio;
    return roundNum(value);
  });
  return `oklch(${resultColor.join(' ')})`;
}

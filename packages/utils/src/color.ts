import type { CSSColorValue } from '@unocss/preset-wind4/utils';
import type { ThemeMetas } from 'magic-color';
import { roundNum, toNum, toOklch } from './transforms';

type ThemeKey = keyof ThemeMetas;

export interface ResolvedColorParts {
  originColor?: string
  bodyNo?: string
}

export const themeMetaList: ThemeKey[] = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

const hyphenColorDepthRE = /^(.*)-(\d+)$/;
const compactColorNameRE = /^[a-z][a-z0-9-]*$/i;
const trailingDigitsRE = /\d+$/;
const bracketColorDepthRE = /^-?(\d+)$/;

export function splitColorParts(color: string): [string, string?, string?] {
  const parts: string[] = [];
  let current = '';
  let bracketDepth = 0;

  for (const char of color) {
    if (char === '[') {
      bracketDepth++;
    }
    else if (char === ']') {
      bracketDepth = Math.max(bracketDepth - 1, 0);
    }

    if ((char === ':' || char === '/') && bracketDepth === 0) {
      parts.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  parts.push(current);

  const [bodyColor, bodyOpacity, bodyModifier] = parts;
  return [bodyColor, bodyOpacity, bodyModifier];
}

function normalizeDepthNo(no: string) {
  return Number(no).toString();
}

function getBracketColorEnd(color: string) {
  if (!color.startsWith('[')) {
    return -1;
  }

  let escaped = false;
  for (let i = 1; i < color.length; i++) {
    const char = color[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === ']') {
      return i;
    }
  }

  return -1;
}

export function resolveColorParts(color: string): ResolvedColorParts & { originColor: string };
export function resolveColorParts(color?: string): ResolvedColorParts;
export function resolveColorParts(color?: string): ResolvedColorParts {
  if (!color) {
    return { originColor: color, bodyNo: undefined };
  }

  const bracketColorEnd = getBracketColorEnd(color);
  if (bracketColorEnd >= 0) {
    const originColor = color.slice(0, bracketColorEnd + 1);
    const suffix = color.slice(bracketColorEnd + 1);
    const depthMatch = suffix.match(bracketColorDepthRE);
    return {
      originColor,
      bodyNo: depthMatch ? normalizeDepthNo(depthMatch[1]) : undefined,
    };
  }

  const hyphenMatch = color.match(hyphenColorDepthRE);
  if (hyphenMatch?.[1]) {
    return { originColor: hyphenMatch[1], bodyNo: normalizeDepthNo(hyphenMatch[2]) };
  }

  if (compactColorNameRE.test(color)) {
    const bodyNo = color.match(trailingDigitsRE)?.[0];
    if (bodyNo) {
      return { originColor: color.slice(0, -bodyNo.length), bodyNo: normalizeDepthNo(bodyNo) };
    }
  }

  return { originColor: color, bodyNo: undefined };
}

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

  const beforeComponents = beforeColor.components;
  const afterComponents = afterColor.components;
  const transitionRatio = (originDepth - beforeDepth) / ((originDepth < 100 || originDepth > 900) ? 50 : 100);
  const resultColor = Array.from({ length: 3 }).map((_, i) => {
    const value = toNum(beforeComponents[i]) + (toNum(afterComponents[i]) - toNum(beforeComponents[i])) * transitionRatio;
    return roundNum(value);
  });
  return `oklch(${resultColor.join(' ')})`;
}

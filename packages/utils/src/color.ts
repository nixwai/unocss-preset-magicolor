import { SpecialColorKey } from '@unocss/preset-wind4/utils';

export interface ResolvedColorParts {
  originColor?: string
  bodyNo?: string
}

const specialColorValueMap = new Map<string, string>(
  Object.entries(SpecialColorKey).flatMap(([key, value]) => [
    [key.toLowerCase(), value],
    [value.toLowerCase(), value],
  ]),
);

const hyphenColorDepthRE = /^(.*)-(\d+)$/;
const compactColorNameRE = /^[a-z][a-z0-9-]*$/i;
const trailingDigitsRE = /\d+$/;
const bracketColorDepthRE = /^-?(\d+)$/;

/**
 * Extracts the body color from a token, dropping any opacity (`/`) or
 * modifier (`:`) suffixes that appear outside bracketed arbitrary colors.
 */
export function extractBodyColor(color: string): string {
  let bodyColor = '';
  let bracketDepth = 0;

  for (const char of color) {
    if (char === '[') {
      bracketDepth++;
    }
    else if (char === ']') {
      bracketDepth = Math.max(bracketDepth - 1, 0);
    }

    if ((char === ':' || char === '/') && bracketDepth === 0) {
      break;
    }

    bodyColor += char;
  }

  return bodyColor;
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
    if (bodyNo !== undefined) {
      return { originColor: color.slice(0, -bodyNo.length), bodyNo: normalizeDepthNo(bodyNo) };
    }
  }

  return { originColor: color, bodyNo: undefined };
}

/**
 * Resolves a token body into its color parts, stripping any opacity (`/`) or
 * modifier (`:`) suffixes before parsing the depth.
 */
export function resolveBodyColor(body = ''): ResolvedColorParts & { originColor: string } {
  return resolveColorParts(extractBodyColor(body));
}

export function resolveSpecialColor(color?: string) {
  if (!color) {
    return;
  }

  return specialColorValueMap.get(color.trim().toLowerCase());
}

/** use dark modal */
export function hasDarkVariant(rawSelector?: string) {
  return rawSelector?.split(':').includes('dark') === true;
}

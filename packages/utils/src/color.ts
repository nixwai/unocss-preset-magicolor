import { SpecialColorKey } from '@unocss/preset-wind4/utils';

export interface ResolvedColorParts {
  originColor?: string
  originDepth?: string
}

const specialColorValueMap = new Map<string, string>(
  Object.entries(SpecialColorKey).flatMap(([key, value]) => [
    [key.toLowerCase(), value],
    [value.toLowerCase(), value],
  ]),
);

const depthColorRE = /^(?:(.*)-|(.+\D))(\d+)$/;
const bracketColorRE = /^\[(.*)\]$/;
const numericBodyRE = /^-?\d+$/;

function emptyColorParts(): ResolvedColorParts {
  return { originColor: undefined, originDepth: undefined };
}

function getBodyColorEnd(color: string) {
  let bracketDepth = 0;
  let parenDepth = 0;
  let escaped = false;

  for (let i = 0; i < color.length; i++) {
    const char = color[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '[') {
      bracketDepth++;
    }
    else if (char === ']') {
      bracketDepth = Math.max(bracketDepth - 1, 0);
    }
    else if (char === '(' && bracketDepth === 0) {
      parenDepth++;
    }
    else if (char === ')' && bracketDepth === 0) {
      parenDepth = Math.max(parenDepth - 1, 0);
    }

    if ((char === ':' || char === '/') && bracketDepth === 0 && parenDepth === 0) {
      return i;
    }
  }

  return color.length;
}

function resolveBodyColorDepth(color: string): ResolvedColorParts {
  if (color.startsWith('#') && !color.includes('-')) {
    return { originColor: color, originDepth: undefined };
  }

  const depthMatch = color.match(depthColorRE);
  const rawOriginColor = depthMatch?.[1] ?? depthMatch?.[2] ?? color;
  const originDepth = depthMatch?.[3];
  const originColor = rawOriginColor.match(bracketColorRE)?.[1] ?? rawOriginColor;

  if (!originColor || numericBodyRE.test(originColor)) {
    return emptyColorParts();
  }

  return { originColor, originDepth };
}

/**
 * Resolves a token body into its source color and optional depth,
 * ignoring opacity (`/`) and modifier (`:`) suffixes outside brackets/functions.
 */
export function resolveBodyColor(body?: string): ResolvedColorParts {
  if (!body) {
    return emptyColorParts();
  }

  const color = body.trim();
  const bodyColor = color.slice(0, getBodyColorEnd(color));
  if (!bodyColor || numericBodyRE.test(bodyColor)) {
    return emptyColorParts();
  }

  return resolveBodyColorDepth(bodyColor);
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

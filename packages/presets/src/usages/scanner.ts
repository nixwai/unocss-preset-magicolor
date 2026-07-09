import type { MagicColorDepth } from '../utils/color-variable';
import type { MagicColorDepthMap } from './types';
import { resolveBodyColor } from '@unocss-preset-magicolor/utils';
import { isAttributifySelector } from '@unocss/core';
import { BASE_COLOR_DEPTH, isLiteralColor } from '../utils/color-variable';

/** Token scan result from one UnoCSS extractor input. */
export interface TokenScan {
  /** Color depths grouped by magic color name. */
  colors: MagicColorDepthMap
  /** Raw tokens found by UnoCSS extractors for this input id. */
  tokens: Set<string>
}

/**
 * Check if the token contains an underline. Like "primary_red-100"
 * @param body The string to check.
 * @returns `true` if the string contains an underline.
 */
function hasUnderline(body: string) {
  let bracketDepth = 0;
  let parenDepth = 0;
  let escaped = false;
  for (const char of body) {
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
    if (char === '_' && bracketDepth === 0 && parenDepth === 0) {
      return true;
    }
  }
  return false;
}

function normalizeSelector(str?: string) {
  const list = str?.replace(/[~!]/g, '').split(':') || [];
  const index = list.findIndex(i => i.includes('mc'));
  // if there is a magic-color token, only scan from this token,
  // else scan from the last token
  return index >= 0 ? list.slice(index).join(':') : list[list.length - 1];
}

function normalizeAttributifySelector(match: RegExpMatchArray) {
  const name = normalizeSelector(match[1]);
  const content = normalizeSelector(match[2]);

  if (!content || content === '~' || content === 'true') {
    return name;
  }

  return [name, content].filter(Boolean).join('-');
}

/** Scans extracted tokens into color depths for one input id. */
export function scanUsage(tokens = new Set<string>()): TokenScan {
  const tokenList = Array.from(tokens);
  const colors: MagicColorDepthMap = new Map();

  for (let token of tokenList) {
    // only scan magic-color tokens
    if (!token.includes('mc')) {
      continue;
    }
    // Attributify selector tokens are parsed into a list of tokens.
    const selectorMatch = isAttributifySelector(token);
    if (selectorMatch) {
      token = normalizeAttributifySelector(selectorMatch);
    }
    // Skip lightness reverse tokens
    if (token.includes('mc-lr')) {
      continue;
    }
    // get the color body，allow the case of "mc-primary-100" to provide supplementary color depth for this color variable
    const body = token.match(/[^:]?mc-(.+)$/)?.[1];
    if (!body) {
      continue;
    }
    // Skip tokens with underline，token like "mc-primary_red-100"
    if (hasUnderline(body)) {
      continue;
    }
    const { originColor, originDepth } = resolveBodyColor(body);
    if (!originColor) {
      continue;
    }
    // Skip literal colors
    if (isLiteralColor(originColor)) {
      continue;
    }
    // Merge repeated tokens for the same color name within this input.
    const depths = colors.get(originColor) ?? new Set<MagicColorDepth>();
    if (originDepth !== undefined) {
      depths.add(Number(originDepth));
    }
    else {
      depths.add(BASE_COLOR_DEPTH);
    }
    colors.set(originColor, depths);
  }

  return { colors, tokens };
}

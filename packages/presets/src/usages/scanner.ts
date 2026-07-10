import type { MagicColorDepth } from '../utils/color-variable';
import type { MagicColorDepthMap } from './types';
import { resolveBodyColor } from '@unocss-preset-magicolor/utils';
import { BASE_COLOR_DEPTH, isLiteralColor } from '../utils/color-variable';
import { hasUnderline, normalizeMagicColorToken } from '../utils/resolve-token';

/** Token scan result from one UnoCSS extractor input. */
export interface TokenScan {
  /** Color depths grouped by magic color name. */
  colors: MagicColorDepthMap
  /** Raw tokens found by UnoCSS extractors for this input id. */
  tokens: Set<string>
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
    token = normalizeMagicColorToken(token);
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

import type { MagicColorDepth } from '../utils/color-variable';
import type { MagicColorDepthMap } from './types';
import { resolveBodyColor } from '@unocss-preset-magicolor/utils';
import { BASE_COLOR_DEPTH, isLiteralColor } from '../utils/color-variable';

/** Token scan result from one UnoCSS extractor input. */
export interface TokenScan {
  /** Color depths grouped by magic color name. */
  colors: MagicColorDepthMap
  /** Raw tokens found by UnoCSS extractors for this input id. */
  tokens: Set<string>
}

/** Stores the requested numeric color depth. */
function addDepth(depths: Set<MagicColorDepth>, no: string) {
  depths.add(Number(no));
}

/** find the original token with magic color name. */
function normalizeToken(token: string) {
  const parts = token.split(':');
  const colorIndex = parts.findIndex(part => part.includes('mc-') && !part.startsWith('mc-'));
  const current = colorIndex >= 0 ? parts.slice(colorIndex).join(':') : '';
  return current.match(/mc-(.+)$/)?.[1] ?? '';
}

/** Scans extracted tokens into color depths for one input id. */
export function scanUsage(tokens = new Set<string>()): TokenScan {
  const tokenList = Array.from(tokens);
  const colors: MagicColorDepthMap = new Map();

  for (const token of tokenList) {
    const body = normalizeToken(token);
    if (!body) {
      continue;
    }
    const { originColor, originDepth } = resolveBodyColor(body);
    if (!originColor) {
      continue;
    }
    if (isLiteralColor(originColor)) {
      continue;
    }
    // Merge repeated tokens for the same color name within this input.
    const depths = colors.get(originColor) ?? new Set<MagicColorDepth>();
    if (originDepth !== undefined) {
      addDepth(depths, originDepth);
    }
    else {
      depths.add(BASE_COLOR_DEPTH);
    }
    colors.set(originColor, depths);
  }

  return { colors, tokens };
}

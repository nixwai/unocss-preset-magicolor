import type { MagicColorDepth } from '../utils/color-variable';
import type { MagicColorDepthMap } from './types';
import { resolveBodyColor } from '@unocss-preset-magicolor/utils';
import { BASE_COLOR_DEPTH } from '../utils/color-variable';

/** Token scan result from one UnoCSS extractor input. */
export interface TokenScan {
  /** Color depths grouped by magic color name. */
  colors: MagicColorDepthMap
  /** Raw tokens found by UnoCSS extractors for this input id. */
  tokens: Set<string>
}

const colorUsagePrefixRE = /^(?!mc-)(?:.+-)?mc-/;

// Matches magic color usages such as `c-mc-my-btn-630`, `c-mc-grape120:20`, or `c-mc-qq/34:20`.
// Bare `mc-*` utilities are definitions/control utilities, not color usages.
const colorUsageTokenRE = /^(?!mc-)(?:.+-)?mc-([A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*)(?:[:/].*)?$/;

/** Stores the requested numeric color depth. */
function addDepth(depths: Set<MagicColorDepth>, no: string) {
  depths.add(Number(no));
}

/** Removes UnoCSS variants while preserving magic color opacity/modifier suffixes. */
function normalizeToken(token: string) {
  const parts = token.split(':');
  const colorIndex = parts.findIndex(part => colorUsagePrefixRE.test(part));
  return colorIndex >= 0 ? parts.slice(colorIndex).join(':') : token;
}

/** Scans extracted tokens into color depths for one input id. */
export function scanUsage(tokens = new Set<string>()): TokenScan {
  const tokenList = Array.from(tokens);
  const colors: MagicColorDepthMap = new Map();

  for (const token of tokenList) {
    const current = normalizeToken(token);
    const colorUsageMatch = current.match(colorUsageTokenRE);
    if (!colorUsageMatch) {
      continue;
    }

    const [, body] = colorUsageMatch;
    if (!body) {
      continue;
    }
    const { originColor: name, originDepth: no } = resolveBodyColor(body);
    if (!name) {
      continue;
    }

    // Merge repeated tokens for the same color name within this input.
    const depths = colors.get(name) ?? new Set<MagicColorDepth>();
    if (no !== undefined) {
      addDepth(depths, no);
    }
    else {
      depths.add(BASE_COLOR_DEPTH);
    }
    colors.set(name, depths);
  }

  return { colors, tokens };
}

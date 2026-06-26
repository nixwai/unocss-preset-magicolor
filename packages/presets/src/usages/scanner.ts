import { resolveColorParts, splitColorParts } from '@unocss-preset-magicolor/utils';

export const BASE_COLOR_DEPTH = 'none';

export type MagicColorDepth = number | typeof BASE_COLOR_DEPTH;

/** Usage collected from one UnoCSS extractor input. */
export interface FileUsage {
  /** Color usages grouped by magic color name. */
  colors: Map<string, Set<MagicColorDepth>>
  /** Raw tokens found by UnoCSS extractors for this input id. */
  tokens: Set<string>
}

const colorUsagePrefixRE = /^(?!mc-[A-Za-z][A-Za-z0-9-]*_)(?:.+-)?mc-/;

// Matches magic color usages such as `c-mc-my-btn-630`, `c-mc-grape120:20`, or `c-mc-qq/34:20`.
const colorUsageTokenRE = /^(?!mc-[A-Za-z][A-Za-z0-9-]*_)(?:.+-)?mc-([A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*)(?:[:/].*)?$/;

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

/** Scans extracted tokens into color usages for one input id. */
export function scanUsage(tokens: Iterable<string>): FileUsage {
  const tokenList = Array.from(tokens);
  const colors = new Map<string, Set<MagicColorDepth>>();

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

    const [bodyColor] = splitColorParts(body);
    const { originColor: name, bodyNo: no } = resolveColorParts(bodyColor);
    if (!name) {
      continue;
    }

    // Merge repeated tokens for the same color name within this input.
    const depths = colors.get(name) ?? new Set<MagicColorDepth>();
    if (no) {
      addDepth(depths, no);
    }
    else {
      depths.add(BASE_COLOR_DEPTH);
    }
    colors.set(name, depths);
  }

  return { colors, tokens: new Set(tokenList) };
}

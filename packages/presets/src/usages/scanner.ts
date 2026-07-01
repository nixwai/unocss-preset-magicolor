import type { MagicColorDepth } from '../utils/color-variable';
import { resolveBodyColor } from '@unocss-preset-magicolor/utils';
import { BASE_COLOR_DEPTH } from '../utils/color-variable';

/** Color variable usage grouped by variable role. */
export interface ColorVariableUsage {
  /** Public target variables consumed by utilities, such as `--mc-colors-primary-500`. */
  targets: Map<string, Set<MagicColorDepth>>
  /** Internal source variables required by target mappings, such as `--mc-source-colors-primary-500`. */
  sources: Map<string, Set<MagicColorDepth>>
}

/** Usage collected from one UnoCSS extractor input. */
export interface FileUsage {
  /** Color variable usages grouped by role. */
  colorVariables: ColorVariableUsage
  /** Raw tokens found by UnoCSS extractors for this input id. */
  tokens: Set<string>
}

const colorUsagePrefixRE = /^(?!mc-[A-Za-z][A-Za-z0-9-]*_)(?:.+-)?mc-/;

// Matches magic color usages such as `c-mc-my-btn-630`, `c-mc-grape120:20`, or `c-mc-qq/34:20`.
// Definition utilities like `mc-btn_red` are intentionally excluded.
const colorUsageTokenRE = /^(?!mc-[A-Za-z][A-Za-z0-9-]*_)(?:.+-)?mc-([A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*)(?:[:/].*)?$/;

/** Stores the requested numeric color depth. */
function addDepth(depths: Set<MagicColorDepth>, no: string) {
  depths.add(Number(no));
}

/** Creates an empty color-variable usage bucket. */
export function createEmptyColorVariableUsage(): ColorVariableUsage {
  return {
    targets: new Map(),
    sources: new Map(),
  };
}

/** Creates an empty file usage bucket. */
export function createEmptyFileUsage(tokens: Iterable<string> = []): FileUsage {
  return {
    colorVariables: createEmptyColorVariableUsage(),
    tokens: new Set(tokens),
  };
}

/** Merges color-variable depths into an existing grouped usage map. */
export function mergeColorVariableUsage(
  target: Map<string, Set<MagicColorDepth>>,
  source: Map<string, Set<MagicColorDepth>>,
) {
  for (const [name, sourceDepths] of source.entries()) {
    const targetDepths = target.get(name) ?? new Set<MagicColorDepth>();
    for (const depth of sourceDepths) {
      targetDepths.add(depth);
    }
    target.set(name, targetDepths);
  }
}

/** Merges public target color-variable usage into one file usage. */
export function mergeFileUsageTargets(target: FileUsage, source: FileUsage) {
  mergeColorVariableUsage(target.colorVariables.targets, source.colorVariables.targets);
}

/** Removes UnoCSS variants while preserving magic color opacity/modifier suffixes. */
function normalizeToken(token: string) {
  const parts = token.split(':');
  const colorIndex = parts.findIndex(part => colorUsagePrefixRE.test(part));
  return colorIndex >= 0 ? parts.slice(colorIndex).join(':') : token;
}

/** Scans extracted tokens into color usages for one input id. */
export function scanColorVariableTargets(tokens: Iterable<string>): FileUsage {
  const tokenList = Array.from(tokens);
  const fileUsage = createEmptyFileUsage(tokenList);
  const { targets } = fileUsage.colorVariables;

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

    const { originColor: name, bodyNo: no } = resolveBodyColor(body);
    if (!name) {
      continue;
    }

    // Merge repeated tokens for the same color name within this input.
    const depths = targets.get(name) ?? new Set<MagicColorDepth>();
    if (no !== undefined) {
      addDepth(depths, no);
    }
    else {
      depths.add(BASE_COLOR_DEPTH);
    }
    targets.set(name, depths);
  }

  return fileUsage;
}

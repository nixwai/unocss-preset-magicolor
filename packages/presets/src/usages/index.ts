import type { Extractor, Shortcut } from 'unocss';
import type { TokenScan } from './scanner';
import type { MagicColorDepthMap } from './types';
import { UsageCacheStore } from './cache';
import { scanUsage } from './scanner';
import { collectShortcuts } from './shortcuts';

export type { MagicColorDepthMap } from './types';

// UnoCSS may omit an id for inline input; keep those scans under a stable bucket.
const DEFAULT_ID = '__inline__';

/**
 * Stores the per-preset usage state shared by the extractor, rules, and preflights.
 * Keeping this state per preset prevents scans from leaking between UnoCSS generators.
 */
export class MagicColorUsage {
  /** Scans indexed by extractor input id. */
  private readonly scansById = new Map<string, TokenScan>();

  /** Scans produced by rule expansions (shortcuts/aliases), indexed by raw selector. */
  private readonly ruleScans = new Map<string, TokenScan>();

  /** Source variable scans produced by lightness reverse rules, indexed by raw selector. */
  private readonly lrScans = new Map<string, TokenScan>();

  private readonly cacheStore = new UsageCacheStore(this.scansById, this.ruleScans, this.lrScans);

  readonly extractor: Extractor = {
    name: 'magicolor-usage',
    order: 1,
    extract: ({ extracted, id = DEFAULT_ID }) => {
      const scan = scanUsage(extracted);
      this.scansById.set(id, scan);
      this.cacheStore.invalidate();
    },
  };

  /** Aggregates public target variable depths for a color name across input scans. */
  getColorVariableTargetDepths(name: string) {
    return this.cacheStore.getTargetDepths(name);
  }

  /** Lists all color names seen in public target variable usages across scanned inputs. */
  getColorVariableTargetNames() {
    return this.cacheStore.getTargetNames();
  }

  /** Aggregates internal source variable depths for a color name across input scans. */
  getColorVariableSourceDepths(name: string) {
    return this.cacheStore.getSourceDepths(name);
  }

  /** Lists all color names seen in internal source variable usages across scanned inputs. */
  getColorVariableSourceNames() {
    return this.cacheStore.getSourceNames();
  }

  /** Records public target variable usage produced by a rule expansion, such as shortcuts or aliases. */
  recordColorVariableTargetUsage(rawSelector: string | undefined, depths: MagicColorDepthMap) {
    this.recordColorVariableUsage(this.ruleScans, rawSelector, depths);
  }

  /** Records source variable depths required by a lightness reverse rule. */
  recordColorVariableSourceUsage(rawSelector: string | undefined, sourceDepths: MagicColorDepthMap) {
    this.recordColorVariableUsage(this.lrScans, rawSelector, sourceDepths);
  }

  /** Records static shortcut-expanded target usages when a shortcut and a consumer token share one input file. */
  recordColorVariableTargetUsagesByShortcut<Theme extends object = object>(
    shortcuts: Iterable<Shortcut<Theme>>,
    name?: string,
  ) {
    for (const shortcut of collectShortcuts(shortcuts)) {
      this.recordColorVariableTargetUsage(shortcut.rawSelector, pickColorDepthUsage(shortcut.depths, name));
    }
  }

  private recordColorVariableUsage(
    scans: Map<string, TokenScan>,
    rawSelector: string | undefined,
    colors: MagicColorDepthMap,
  ) {
    if (!rawSelector || !colors.size) {
      return;
    }

    const recorded = scans.get(rawSelector) ?? scanUsage();
    const hasNewData = mergeColorDepthUsage(recorded.colors, colors);
    if (!hasNewData) {
      return;
    }

    scans.set(rawSelector, recorded);
    this.cacheStore.invalidate();
  }
}

function pickColorDepthUsage(colors: MagicColorDepthMap, name?: string) {
  if (name === undefined) {
    return colors;
  }

  const depths = colors.get(name);
  return depths ? new Map([[name, depths]]) : new Map();
}

function mergeColorDepthUsage(target: MagicColorDepthMap, source: MagicColorDepthMap) {
  let hasNewData = false;

  for (const [name, sourceDepths] of source.entries()) {
    if (!sourceDepths.size) {
      continue;
    }

    const previousDepths = target.get(name);
    const targetDepths = previousDepths ?? new Set();
    const previousSize = targetDepths.size;

    for (const depth of sourceDepths) {
      targetDepths.add(depth);
    }

    if (targetDepths.size !== previousSize) {
      hasNewData = true;
    }
    target.set(name, targetDepths);
  }

  return hasNewData;
}

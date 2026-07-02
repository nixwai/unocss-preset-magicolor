import type { Extractor, Shortcut } from 'unocss';
import type { TokenScan } from './scanner';
import type { MagicColorDepthMap } from './types';
import { UsageCacheStore } from './cache';
import { scanUsage } from './scanner';
import { collectShortcuts } from './shortcuts';

export type { MagicColorDepthMap } from './types';

// UnoCSS may omit an id for inline input; keep those scans under a stable bucket.
const INLINE_SCAN_ID = '__inline__';

/**
 * Stores the per-preset usage state shared by the extractor, rules, and preflights.
 * Keeping this state per preset prevents scans from leaking between UnoCSS generators.
 */
export class MagicColorUsage {
  /** Scans indexed by extractor input id. */
  private readonly inputScans = new Map<string, TokenScan>();

  /** Scans produced by rule expansions (shortcuts/aliases), indexed by raw selector. */
  private readonly targetRuleScans = new Map<string, TokenScan>();

  /** Source variable scans produced by lightness reverse rules, indexed by raw selector. */
  private readonly sourceRuleScans = new Map<string, TokenScan>();

  private readonly usageCache = new UsageCacheStore(this.inputScans, this.targetRuleScans, this.sourceRuleScans);

  readonly extractor: Extractor = {
    name: 'magicolor-usage',
    order: 1,
    extract: ({ extracted, id = INLINE_SCAN_ID }) => {
      const scan = scanUsage(extracted);
      this.inputScans.set(id, scan);
      this.usageCache.invalidate();
    },
  };

  /** Aggregates public target variable depths for a color name across input scans. */
  getTargetDepths(colorName: string) {
    return this.usageCache.getTargetDepths(colorName);
  }

  /** Lists all color names seen in public target variable usages across scanned inputs. */
  getTargetNames() {
    return this.usageCache.getTargetNames();
  }

  /** Aggregates internal source variable depths for a color name across input scans. */
  getSourceDepths(colorName: string) {
    return this.usageCache.getSourceDepths(colorName);
  }

  /** Lists all color names seen in internal source variable usages across scanned inputs. */
  getSourceNames() {
    return this.usageCache.getSourceNames();
  }

  /** Records public target variable usage produced by a rule expansion, such as shortcuts or aliases. */
  recordTargetUsage(rawSelector: string | undefined, targetDepths: MagicColorDepthMap) {
    this.recordSelectorColors(this.targetRuleScans, rawSelector, targetDepths);
  }

  /** Records source variable depths required by a lightness reverse rule. */
  recordSourceUsage(rawSelector: string | undefined, sourceDepths: MagicColorDepthMap) {
    this.recordSelectorColors(this.sourceRuleScans, rawSelector, sourceDepths);
  }

  /** Records static shortcut-expanded target usages when a shortcut and a consumer token share one input file. */
  recordShortcutTargetUsages<Theme extends object = object>(
    shortcuts: Iterable<Shortcut<Theme>>,
    colorName?: string,
  ) {
    for (const shortcut of collectShortcuts(shortcuts)) {
      this.recordTargetUsage(shortcut.rawSelector, pickColorUsage(shortcut.depths, colorName));
    }
  }

  private recordSelectorColors(
    scanMap: Map<string, TokenScan>,
    rawSelector: string | undefined,
    colorDepths: MagicColorDepthMap,
  ) {
    if (!rawSelector || !colorDepths.size) {
      return;
    }

    const scan = scanMap.get(rawSelector) ?? scanUsage();
    const changed = mergeColorUsage(scan.colors, colorDepths);
    if (!changed) {
      return;
    }

    scanMap.set(rawSelector, scan);
    this.usageCache.invalidate();
  }
}

function pickColorUsage(colorDepths: MagicColorDepthMap, colorName?: string) {
  if (colorName === undefined) {
    return colorDepths;
  }

  const depths = colorDepths.get(colorName);
  return depths ? new Map([[colorName, depths]]) : new Map();
}

function mergeColorUsage(targetUsage: MagicColorDepthMap, sourceUsage: MagicColorDepthMap) {
  let changed = false;

  for (const [colorName, sourceDepths] of sourceUsage.entries()) {
    if (!sourceDepths.size) {
      continue;
    }

    const mergedDepths = targetUsage.get(colorName) ?? new Set();
    const sizeBeforeMerge = mergedDepths.size;

    for (const depth of sourceDepths) {
      mergedDepths.add(depth);
    }

    if (mergedDepths.size !== sizeBeforeMerge) {
      changed = true;
    }
    targetUsage.set(colorName, mergedDepths);
  }

  return changed;
}

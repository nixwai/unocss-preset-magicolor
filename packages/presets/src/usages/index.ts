import type { Extractor, RuleContext, Shortcut } from 'unocss';
import type { MagicColorDepth } from '../utils/color-variable';
import type { MagicColorDepthMap } from './types';
import { ScanCacheStore } from './scan-cache';
import { collectShortcuts } from './shortcuts';
import { TokenCacheStore } from './token-cache';

export type { MagicColorDepthMap } from './types';

// UnoCSS may omit an id for inline input; keep those scans under a stable bucket.
const INLINE_SCAN_ID = '__inline__';

/**
 * Stores the per-preset usage state shared by the extractor, rules, and preflights.
 * Keeping this state per preset prevents scans from leaking between UnoCSS generators.
 */
export class MagicColorUsage {
  /** Scans produced by rule expansions (shortcuts/aliases), indexed by raw selector. */
  private readonly targetRuleScans = new Map<string, MagicColorDepthMap>();

  /** Source variable scans produced by lightness reverse rules, indexed by raw selector. */
  private readonly sourceRuleScans = new Map<string, MagicColorDepthMap>();

  private inputVersion = 0;
  private shortcutUsageVersion = -1;
  private shortcutUsageCount = -1;

  private readonly scanCache = new ScanCacheStore(this.targetRuleScans, this.sourceRuleScans);
  private readonly tokenCache = new TokenCacheStore();

  constructor() {}

  readonly extractor: Extractor = {
    name: 'magicolor-usage',
    order: 1,
    extract: ({ extracted, id = INLINE_SCAN_ID }) => {
      // In @unocss/vite dev global mode, `extracted` is the shared cumulative token set.
      // UnoCSS adds newly seen tokens to it, but does not remove tokens that disappeared from a file until a full config reload/rescan.
      this.inputVersion += 1;
      this.scanCache.recordExtracted(id, extracted);
      this.scanCache.invalidate();
      this.tokenCache.invalidate();
    },
  };

  /** Aggregates public target variable depths for a color name across input scans. */
  getTargetDepths(colorName: string) {
    return this.scanCache.getTargetDepths(colorName);
  }

  /** Gets target depths for one color name directly from currently referenced shortcut bodies. */
  getShortcutTargetDepths<Theme extends object = object>(colorName: string, context: RuleContext<Theme>) {
    const depths = new Set<MagicColorDepth>();
    const shortcuts = context.generator.config.shortcuts as Iterable<Shortcut<Theme>>;
    for (const shortcut of collectShortcuts(shortcuts, this.scanCache.getInputTokens(), context)) {
      const shortcutDepths = shortcut.depths.get(colorName);
      if (!shortcutDepths) {
        continue;
      }
      for (const depth of shortcutDepths) {
        depths.add(depth);
      }
    }
    return depths.size ? depths : undefined;
  }

  /** Lists all color names seen in public target variable usages across scanned inputs. */
  getTargetNames() {
    return this.scanCache.getTargetNames();
  }

  /** Aggregates internal source variable depths for a color name across input scans. */
  getSourceDepths(colorName: string) {
    return this.scanCache.getSourceDepths(colorName);
  }

  /** Lists all color names seen in internal source variable usages across scanned inputs. */
  getSourceNames() {
    return this.scanCache.getSourceNames();
  }

  /** Records public target variable usage from a rule and invalidates dependent generator cache on changes. */
  recordRuleTargetUsage<Theme extends object = object>(context: RuleContext<Theme>, targetDepths: MagicColorDepthMap) {
    this.tokenCache.registerCache(context.generator.cache);
    const change = this.recordSelectorColors(this.targetRuleScans, context.rawSelector, targetDepths);
    if (change) {
      this.scanCache.invalidate();
      this.tokenCache.invalidate();
    }
  }

  /** Records source variable usage from a rule and invalidates dependent generator cache on changes. */
  recordRuleSourceUsage<Theme extends object = object>(context: RuleContext<Theme>, sourceDepths: MagicColorDepthMap) {
    this.tokenCache.registerCache(context.generator.cache);
    this.tokenCache.recordToken(context.rawSelector);
    const change = this.recordSelectorColors(this.sourceRuleScans, context.rawSelector, sourceDepths);
    if (change) {
      this.scanCache.invalidate();
      this.tokenCache.invalidate();
    }
  }

  /** Records shortcut-expanded target usages once per extractor scan generation. */
  recordShortcutTargetUsages<Theme extends object = object>(context: RuleContext<Theme>) {
    const shortcuts = context.generator.config.shortcuts as Shortcut<Theme>[];
    if (this.shortcutUsageVersion === this.inputVersion && this.shortcutUsageCount === shortcuts.length) {
      return;
    }

    this.shortcutUsageVersion = this.inputVersion;
    this.shortcutUsageCount = shortcuts.length;
    let change = false;
    for (const shortcut of collectShortcuts(shortcuts, this.scanCache.getInputTokens(), context)) {
      if (this.recordSelectorColors(this.targetRuleScans, shortcut.rawSelector, shortcut.depths)) {
        change = true;
      }
    }
    if (change) {
      this.scanCache.invalidate();
      this.tokenCache.invalidate();
    }
  }

  private recordSelectorColors(
    scanMap: Map<string, MagicColorDepthMap>,
    rawSelector: string | undefined,
    colorDepths: MagicColorDepthMap,
  ) {
    if (!rawSelector || !colorDepths.size) {
      return false;
    }

    const scan = scanMap.get(rawSelector) ?? new Map();
    const changed = mergeColorUsage(scan, colorDepths);
    if (!changed) {
      return false;
    }

    scanMap.set(rawSelector, scan);
    return true;
  }
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

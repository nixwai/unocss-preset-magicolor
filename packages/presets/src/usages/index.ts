import type { Extractor } from 'unocss';
import type { TokenScan } from './scanner';
import type { MagicColorDepthMap, StaticShortcutColorVariableTargetUsage } from './types';
import { UsageCacheStore } from './cache';
import { mergeColorDepths, scanUsage } from './scanner';

export type { MagicColorDepthMap, StaticShortcutColorVariableTargetUsage } from './types';

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
  recordColorVariableTargetUsage(rawSelector: string | undefined, token: string) {
    if (!rawSelector) {
      return;
    }
    const scan = scanUsage(new Set([token]));
    const recorded = this.ruleScans.get(rawSelector) ?? scanUsage();
    mergeColorDepths(recorded.colors, scan.colors);
    this.ruleScans.set(rawSelector, recorded);
    this.cacheStore.invalidate();
  }

  /** Records source variable depths required by a lightness reverse rule. */
  recordColorVariableSourceUsage(rawSelector: string | undefined, sourceDepths: MagicColorDepthMap) {
    if (!rawSelector) {
      return;
    }

    this.lrScans.delete(rawSelector);
    if (sourceDepths.size) {
      const scan = scanUsage();
      mergeColorDepths(scan.colors, sourceDepths);
      this.lrScans.set(rawSelector, scan);
    }

    this.cacheStore.invalidate();
  }

  /** Records static shortcut-expanded target usages when a shortcut and a consumer token share one input file. */
  recordShortcutColorVariableTargetUsages(shortcuts: Iterable<StaticShortcutColorVariableTargetUsage>) {
    let changed = false;

    for (const shortcut of shortcuts) {
      const scan = scanUsage(new Set(shortcut.tokens));
      if (!scan.colors.size) {
        continue;
      }

      const recorded = this.ruleScans.get(shortcut.rawSelector) ?? scanUsage();
      mergeColorDepths(recorded.colors, scan.colors);
      this.ruleScans.set(shortcut.rawSelector, recorded);

      changed = true;
    }

    if (changed) {
      this.cacheStore.invalidate();
    }
  }
}

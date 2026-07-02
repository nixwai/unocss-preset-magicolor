import type { Extractor } from 'unocss';
import type { MagicColorDepth } from '../utils/color-variable';
import type { TokenScan } from './scanner';
import { mergeColorDepths, scanUsage } from './scanner';

// UnoCSS may omit an id for inline input; keep those scans under a stable bucket.
const DEFAULT_ID = '__inline__';

export type MagicColorDepthMap = Map<string, Set<MagicColorDepth>>;

export interface StaticShortcutColorVariableTargetUsage {
  rawSelector: string
  tokens: Iterable<string>
}

export interface LightnessReverseIntent {
  css: Record<string, string>
  rawSelector: string
  refresh: () => Map<string, Set<MagicColorDepth>>
}

/**
 * Stores the per-preset usage state shared by the extractor, rules, and preflights.
 * Keeping this state per preset prevents scans from leaking between UnoCSS generators.
 */
export class MagicColorUsage {
  /** Scans indexed by extractor input id. */
  private readonly scansById = new Map<string, TokenScan>();

  /** Scans produced by rule expansions (shortcuts/aliases), indexed by raw selector. */
  private readonly ruleScans = new Map<string, TokenScan>();

  /** Scans produced by lightness reverse intents, indexed by raw selector. */
  private readonly lrScans = new Map<string, TokenScan>();

  /** Registered lightness reverse intents, indexed by raw selector. */
  private readonly lrIntents = new Map<string, LightnessReverseIntent>();

  // === CACHING ===
  private cacheValid = false;

  // Cached values
  private cachedTargetDepths = new Map<string, Set<MagicColorDepth>>();
  private cachedTargetNames: string[] | undefined;
  private cachedSourceDepths = new Map<string, Set<MagicColorDepth>>();
  private cachedSourceNames: string[] | undefined;

  /** Invalidate all caches when data changes. */
  private invalidateCache() {
    this.cacheValid = false;
    this.cachedTargetDepths.clear();
    this.cachedTargetNames = undefined;
    this.cachedSourceDepths.clear();
    this.cachedSourceNames = undefined;
  }

  /** Rebuild all caches if invalid. */
  private ensureCacheValid() {
    if (this.cacheValid) {
      return;
    }

    // Clear old cache data
    this.cachedTargetDepths.clear();
    this.cachedSourceDepths.clear();

    // Collect all referenced selectors first
    const referencedSelectors = new Set<string>();
    for (const scan of this.scansById.values()) {
      for (const token of scan.tokens) {
        referencedSelectors.add(token);
      }
    }

    // === Build target depths cache ===
    const allTargetNames = new Set<string>();

    // Add from scansById
    for (const scan of this.scansById.values()) {
      for (const name of scan.colors.keys()) {
        allTargetNames.add(name);
        if (!this.cachedTargetDepths.has(name)) {
          this.cachedTargetDepths.set(name, new Set());
        }
        const depths = this.cachedTargetDepths.get(name)!;
        const colorDepths = scan.colors.get(name);
        if (colorDepths) {
          for (const depth of colorDepths) {
            depths.add(depth);
          }
        }
      }
    }

    // Add from ruleScans that are referenced
    for (const [selector, scan] of this.ruleScans) {
      if (!referencedSelectors.has(selector)) {
        continue;
      }
      for (const name of scan.colors.keys()) {
        allTargetNames.add(name);
        if (!this.cachedTargetDepths.has(name)) {
          this.cachedTargetDepths.set(name, new Set());
        }
        const depths = this.cachedTargetDepths.get(name)!;
        const colorDepths = scan.colors.get(name);
        if (colorDepths) {
          for (const depth of colorDepths) {
            depths.add(depth);
          }
        }
      }
    }

    this.cachedTargetNames = Array.from(allTargetNames);

    // === Build source depths cache ===
    const allSourceNames = new Set<string>();

    for (const [selector, scan] of this.lrScans) {
      if (!referencedSelectors.has(selector)) {
        continue;
      }
      for (const name of scan.colors.keys()) {
        allSourceNames.add(name);
        if (!this.cachedSourceDepths.has(name)) {
          this.cachedSourceDepths.set(name, new Set());
        }
        const depths = this.cachedSourceDepths.get(name)!;
        const colorDepths = scan.colors.get(name);
        if (colorDepths) {
          for (const depth of colorDepths) {
            depths.add(depth);
          }
        }
      }
    }

    this.cachedSourceNames = Array.from(allSourceNames);
    this.cacheValid = true;
  }

  readonly extractor: Extractor = {
    name: 'magicolor-usage',
    order: 1,
    extract: ({ extracted, id = DEFAULT_ID }) => {
      const scan = scanUsage(extracted);
      this.scansById.set(id, scan);
      this.refreshLRIntents();
      this.invalidateCache();
    },
  };

  /** Rebuilds lightness reverse intent scans when usage changes. */
  private refreshLRIntents() {
    for (const scan of this.lrScans.values()) {
      scan.colors.clear();
    }

    for (const intent of this.lrIntents.values()) {
      const sourceDepths = intent.refresh();
      if (!sourceDepths.size) {
        continue;
      }

      const scan = this.ruleScans.get(intent.rawSelector) ?? scanUsage();
      mergeColorDepths(scan.colors, sourceDepths);
      this.lrScans.set(intent.rawSelector, scan);
    }
  }

  /** Aggregates public target variable depths for a color name across input scans. */
  getColorVariableTargetDepths(name: string) {
    this.ensureCacheValid();
    const depths = this.cachedTargetDepths.get(name);
    return depths && depths.size ? depths : undefined;
  }

  /** Lists all color names seen in public target variable usages across scanned inputs. */
  getColorVariableTargetNames() {
    this.ensureCacheValid();
    return this.cachedTargetNames ?? [];
  }

  /** Aggregates internal source variable depths for a color name across input scans. */
  getColorVariableSourceDepths(name: string) {
    this.ensureCacheValid();
    const depths = this.cachedSourceDepths.get(name);
    return depths && depths.size ? depths : undefined;
  }

  /** Lists all color names seen in internal source variable usages across scanned inputs. */
  getColorVariableSourceNames() {
    this.ensureCacheValid();
    return this.cachedSourceNames ?? [];
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
    this.refreshLRIntents();
    this.invalidateCache();
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
      this.refreshLRIntents();
      this.invalidateCache();
    }
  }

  /** Registers a selector-local lightness reverse remap that refreshes when target usage changes. */
  registerLightnessReverseIntent(intent: LightnessReverseIntent) {
    this.lrIntents.set(intent.rawSelector, intent);
    this.refreshLRIntents();
    this.invalidateCache();
  }
}

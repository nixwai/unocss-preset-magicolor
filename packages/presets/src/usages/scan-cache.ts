import type { MagicColorDepth } from '../utils/color-variable';
import type { MagicColorDepthMap } from './types';
import { scanUsage } from './scanner';

export interface UsageCache {
  targetDepths: MagicColorDepthMap
  targetNames: string[]
  sourceDepths: MagicColorDepthMap
  sourceNames: string[]
}

/** Lazily aggregates usage scans into target and source color-depth caches. */
export class ScanCacheStore {
  private readonly idExtracted = new Map<string, Set<string>>();
  private readonly targetRuleScans: Map<string, MagicColorDepthMap>;
  private readonly sourceRuleScans: ReadonlyMap<string, MagicColorDepthMap>;

  private cacheValid = false;
  private cache: UsageCache | undefined;

  constructor(
    targetRuleScans: Map<string, MagicColorDepthMap>,
    sourceRuleScans: ReadonlyMap<string, MagicColorDepthMap>,
  ) {
    this.targetRuleScans = targetRuleScans;
    this.sourceRuleScans = sourceRuleScans;
  }

  private batchRecordTargetTokens(tokens: Set<string>) {
    for (const token of tokens) {
      const tokenScan = scanUsage([token]);
      if (!tokenScan.size) {
        continue;
      }
      this.targetRuleScans.set(token, tokenScan);
    }
  }

  /** Records one extractor input and mirrors direct target token scans into rule scans. */
  recordExtracted(id: string, extracted: Set<string>) {
    this.idExtracted.set(id, extracted);
    this.batchRecordTargetTokens(extracted);
  }

  /** Marks the aggregated usage cache stale after scans change. */
  invalidate() {
    this.cacheValid = false;
    this.cache = undefined;
  }

  /** Gets requested public target variable depths for one color name. */
  getTargetDepths(name: string) {
    this.ensureCacheValid();
    const depths = this.cache?.targetDepths.get(name);
    return depths && depths.size ? depths : undefined;
  }

  /** Lists all color names with public target variable usage. */
  getTargetNames() {
    this.ensureCacheValid();
    return this.cache?.targetNames ?? [];
  }

  /** Gets requested internal source variable depths for one color name. */
  getSourceDepths(name: string) {
    this.ensureCacheValid();
    const depths = this.cache?.sourceDepths.get(name);
    return depths && depths.size ? depths : undefined;
  }

  /** Lists all color names with internal source variable usage. */
  getSourceNames() {
    this.ensureCacheValid();
    return this.cache?.sourceNames ?? [];
  }

  /** Returns all tokens currently referenced by extractor inputs. */
  getInputTokens() {
    const tokens = new Set<string>();
    for (const scanTokens of this.idExtracted.values()) {
      for (const token of scanTokens) {
        tokens.add(token);
      }
    }
    return tokens;
  }

  private ensureCacheValid() {
    if (this.cacheValid) {
      return;
    }

    this.cache = this.buildCache();
    this.cacheValid = true;
  }

  private buildCache(): UsageCache {
    const referencedSelectors = this.getInputTokens();

    const targetDepths: MagicColorDepthMap = new Map();
    const targetNames = new Set<string>();

    for (const [selector, scan] of this.targetRuleScans) {
      if (!referencedSelectors.has(selector)) {
        continue;
      }
      addScanColors(targetDepths, targetNames, scan);
    }

    const sourceDepths: MagicColorDepthMap = new Map();
    const sourceNames = new Set<string>();

    for (const [selector, scan] of this.sourceRuleScans) {
      if (!referencedSelectors.has(selector)) {
        continue;
      }
      addScanColors(sourceDepths, sourceNames, scan);
    }

    return {
      targetDepths,
      targetNames: Array.from(targetNames),
      sourceDepths,
      sourceNames: Array.from(sourceNames),
    };
  }
}

function addScanColors(
  target: MagicColorDepthMap,
  names: Set<string>,
  scan: MagicColorDepthMap,
) {
  // aggregating depths from multiple scans into a shared cache
  for (const name of scan.keys()) {
    names.add(name);
  }
  for (const [name, sourceDepths] of scan.entries()) {
    const targetDepths = target.get(name) ?? new Set<MagicColorDepth>();
    for (const depth of sourceDepths) {
      targetDepths.add(depth);
    }
    target.set(name, targetDepths);
  }
}

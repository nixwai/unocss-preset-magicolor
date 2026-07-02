import type { MagicColorDepth } from '../utils/color-variable';
import type { TokenScan } from './scanner';
import { mergeColorDepths } from './scanner';

export interface UsageCache {
  targetDepths: Map<string, Set<MagicColorDepth>>
  targetNames: string[]
  sourceDepths: Map<string, Set<MagicColorDepth>>
  sourceNames: string[]
}

export class UsageCacheStore {
  private readonly scansById: ReadonlyMap<string, TokenScan>;
  private readonly ruleScans: ReadonlyMap<string, TokenScan>;
  private readonly lrScans: ReadonlyMap<string, TokenScan>;

  private cacheValid = false;
  private cache: UsageCache | undefined;

  constructor(
    scansById: ReadonlyMap<string, TokenScan>,
    ruleScans: ReadonlyMap<string, TokenScan>,
    lrScans: ReadonlyMap<string, TokenScan>,
  ) {
    this.scansById = scansById;
    this.ruleScans = ruleScans;
    this.lrScans = lrScans;
  }

  invalidate() {
    this.cacheValid = false;
    this.cache = undefined;
  }

  getTargetDepths(name: string) {
    this.ensureCacheValid();
    const depths = this.cache?.targetDepths.get(name);
    return depths && depths.size ? depths : undefined;
  }

  getTargetNames() {
    this.ensureCacheValid();
    return this.cache?.targetNames ?? [];
  }

  getSourceDepths(name: string) {
    this.ensureCacheValid();
    const depths = this.cache?.sourceDepths.get(name);
    return depths && depths.size ? depths : undefined;
  }

  getSourceNames() {
    this.ensureCacheValid();
    return this.cache?.sourceNames ?? [];
  }

  private ensureCacheValid() {
    if (this.cacheValid) {
      return;
    }

    this.cache = this.buildCache();
    this.cacheValid = true;
  }

  private buildCache(): UsageCache {
    const referencedSelectors = collectReferencedSelectors(this.scansById);

    const targetDepths = new Map<string, Set<MagicColorDepth>>();
    const targetNames = new Set<string>();

    for (const scan of this.scansById.values()) {
      addScanColors(targetDepths, targetNames, scan);
    }

    for (const [selector, scan] of this.ruleScans) {
      if (!referencedSelectors.has(selector)) {
        continue;
      }
      addScanColors(targetDepths, targetNames, scan);
    }

    const sourceDepths = new Map<string, Set<MagicColorDepth>>();
    const sourceNames = new Set<string>();

    for (const [selector, scan] of this.lrScans) {
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

function collectReferencedSelectors(scansById: ReadonlyMap<string, TokenScan>) {
  const referencedSelectors = new Set<string>();

  for (const scan of scansById.values()) {
    for (const token of scan.tokens) {
      referencedSelectors.add(token);
    }
  }

  return referencedSelectors;
}

function addScanColors(
  target: Map<string, Set<MagicColorDepth>>,
  names: Set<string>,
  scan: TokenScan,
) {
  for (const name of scan.colors.keys()) {
    names.add(name);
  }
  mergeColorDepths(target, scan.colors);
}

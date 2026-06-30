import type { Extractor } from 'unocss';
import type { MagicColorDepth } from '../utils/color-variable';
import type { FileUsage } from './scanner';
import { scanUsage } from './scanner';
import { TokenUsage } from './token';

// UnoCSS may omit an id for inline input; keep those scans under a stable bucket.
const DEFAULT_ID = '__inline__';

/** Merges usage from one scan into another without losing previously seen depths. */
function mergeFileUsage(target: FileUsage, source: FileUsage) {
  for (const [name, sourceDepths] of source.colors.entries()) {
    const targetDepths = target.colors.get(name) ?? new Set<MagicColorDepth>();
    for (const depth of sourceDepths) {
      targetDepths.add(depth);
    }
    target.colors.set(name, targetDepths);
  }
}

/**
 * Stores the per-preset usage state shared by the extractor, rules, and preflights.
 * Keeping this state per preset prevents scans from leaking between UnoCSS generators.
 */
export class MagicColorUsage {
  private readonly files = new Map<string, FileUsage>();

  private readonly recordedUsages = new Map<string, FileUsage>();

  private readonly tokenIndex = new TokenUsage();

  /** UnoCSS extractor hook that indexes usage tokens before rules and preflights run. */
  readonly extractor: Extractor = {
    name: 'magicolor-usage',
    order: 1,
    extract: ({ extracted, id }) => {
      // Replace each input id on every scan so watch-mode updates drop stale tokens.
      this.replaceFileUsage(id ?? DEFAULT_ID, extracted);
    },
  };

  /** Replaces the usage snapshot for one input so watch-mode edits remove stale tokens. */
  private replaceFileUsage(id: string, tokens: Iterable<string>) {
    const previousUsage = this.files.get(id);
    if (previousUsage) {
      this.tokenIndex.remove(id, previousUsage.tokens);
    }

    const usage = scanUsage(tokens);
    this.tokenIndex.add(id, usage.tokens);

    // Shortcuts can expand after extraction, so merge any rule-recorded usage back into this file.
    for (const token of usage.tokens) {
      const recordedUsage = this.recordedUsages.get(token);
      if (recordedUsage) {
        mergeFileUsage(usage, recordedUsage);
      }
    }

    this.files.set(id, usage);
  }

  /** Aggregates all scanned selector usages for a color name across input files. */
  getUsage(name: string): Set<MagicColorDepth> | undefined {
    const depths = new Set<MagicColorDepth>();

    for (const fileUsage of this.files.values()) {
      const colorDepths = fileUsage.colors.get(name);
      if (!colorDepths) {
        continue;
      }

      for (const depth of colorDepths) {
        depths.add(depth);
      }
    }

    return this.files.size > 0 && depths.size > 0 ? depths : undefined;
  }

  /** Lists all color names seen in selector usages across scanned inputs. */
  getUsageNames() {
    const names = new Set<string>();

    for (const fileUsage of this.files.values()) {
      for (const name of fileUsage.colors.keys()) {
        names.add(name);
      }
    }

    return Array.from(names);
  }

  /** Records usage produced by a rule expansion, such as aliases pointing at source variables. */
  recordUsage(token: string, rawSelector?: string) {
    if (!rawSelector) {
      return;
    }

    const usage = scanUsage([token]);
    if (!usage.colors.size) {
      return;
    }

    const recordedUsage = this.recordedUsages.get(rawSelector) ?? scanUsage([]);
    mergeFileUsage(recordedUsage, usage);
    this.recordedUsages.set(rawSelector, recordedUsage);

    const ids = this.tokenIndex.getIds(rawSelector);
    if (!ids) {
      return;
    }

    // If the selector was already seen in one or more files, update their snapshots immediately.
    for (const id of ids) {
      const fileUsage = this.files.get(id);
      if (fileUsage) {
        mergeFileUsage(fileUsage, usage);
      }
    }
  }
}

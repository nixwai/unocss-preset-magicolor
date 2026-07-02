import type { Extractor } from 'unocss';
import type { MagicColorDepth } from '../utils/color-variable';
import type { FileUsage } from './scanner';
import { mergeColorDepths, mergeDepth, scanUsage } from './scanner';
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

function aggregateColorVariableDepths(files: Iterable<FileUsage>, name: string) {
  const depths = new Set<MagicColorDepth>();

  for (const fileUsage of files) {
    const colorDepths = fileUsage.colors.get(name);
    if (!colorDepths) {
      continue;
    }

    for (const depth of colorDepths) {
      depths.add(depth);
    }
  }

  return depths;
}

function aggregateColorVariableNames(files: Iterable<FileUsage>) {
  const names = new Set<string>();

  for (const fileUsage of files) {
    for (const name of fileUsage.colors.keys()) {
      names.add(name);
    }
  }

  return Array.from(names);
}

/**
 * Stores the per-preset usage state shared by the extractor, rules, and preflights.
 * Keeping this state per preset prevents scans from leaking between UnoCSS generators.
 */
export class MagicColorUsage {
  private readonly idFileUsages = new Map<string, FileUsage>();

  private readonly tokenFileUsages = new Map<string, FileUsage>();

  private readonly sourceFileUsages = new Map<string, FileUsage>();

  private readonly lightnessReverseIntentUsage = new Map<string, LightnessReverseIntent>();

  readonly extractor: Extractor = {
    name: 'magicolor-usage',
    order: 1,
    extract: ({ extracted, id = DEFAULT_ID }) => {
      const colorUsage = scanUsage(extracted);
      this.idFileUsages.set(id, colorUsage);
      this.refreshLightnessReverseIntents();
    },
  };

  private refreshLightnessReverseIntents() {
    for (const fileUsage of this.sourceFileUsages.values()) {
      fileUsage.colors.clear();
    }

    for (const intent of this.lightnessReverseIntentUsage.values()) {
      const sourceDepths = intent.refresh();
      if (!sourceDepths.size) {
        continue;
      }

      const recordedUsage = this.tokenFileUsages.get(intent.rawSelector) ?? scanUsage();
      mergeColorDepths(recordedUsage.colors, sourceDepths);
      this.sourceFileUsages.set(intent.rawSelector, recordedUsage);
    }
  }

  /** Aggregates public target variable usages for a color name across input files. */
  getColorVariableTargetDepths(name: string) {
    const a = aggregateColorVariableDepths(this.idFileUsages.values(), name);
    this.tokenFileUsages.forEach((fileUsage, token) => {
      for (const [_, usage] of this.idFileUsages) {
        if (usage.tokens.has(token)) {
          mergeDepth(a, fileUsage.colors.get(name));
          return;
        }
      }
    });
    return a;
  }

  /** Lists all color names seen in public target variable usages across scanned inputs. */
  getColorVariableTargetNames() {
    const a = aggregateColorVariableNames(this.idFileUsages.values());
    const b = aggregateColorVariableNames(this.tokenFileUsages.values());
    return Array.from(new Set<string>([...a, ...b]));
  }

  /** Aggregates internal source variable usages for a color name across input files. */
  getColorVariableSourceDepths(name: string) {
    const a = new Set<MagicColorDepth>();
    this.sourceFileUsages.forEach((fileUsage, token) => {
      for (const [_, usage] of this.idFileUsages) {
        if (usage.tokens.has(token)) {
          mergeDepth(a, fileUsage.colors.get(name));
          return;
        }
      }
    });
    return a;
    // return aggregateColorVariableDepths(this.sourceFileUsages.values(), name);
  }

  /** Lists all color names seen in internal source variable usages across scanned inputs. */
  getColorVariableSourceNames() {
    return aggregateColorVariableNames(this.sourceFileUsages.values());
  }

  /** Records public target variable usage produced by a rule expansion, such as shortcuts or aliases. */
  recordColorVariableTargetUsage(rawSelector: string | undefined, token: string) {
    if (!rawSelector) {
      return;
    }
    const usage = scanUsage(new Set([token]));
    const recordedUsage = this.tokenFileUsages.get(rawSelector) ?? scanUsage();
    mergeColorDepths(recordedUsage.colors, usage.colors);
    this.tokenFileUsages.set(rawSelector, recordedUsage);
    this.refreshLightnessReverseIntents();
  }

  /** Records static shortcut-expanded target usages when a shortcut and a consumer token share one input file. */
  recordShortcutColorVariableTargetUsages(shortcuts: Iterable<StaticShortcutColorVariableTargetUsage>) {
    let changed = false;

    for (const shortcut of shortcuts) {
      const usage = scanUsage(new Set(shortcut.tokens));
      if (!usage.colors.size) {
        continue;
      }

      const recordedUsage = this.tokenFileUsages.get(shortcut.rawSelector) ?? scanUsage();
      mergeColorDepths(recordedUsage.colors, usage.colors);
      this.tokenFileUsages.set(shortcut.rawSelector, recordedUsage);

      changed = true;
    }

    if (changed) {
      this.refreshLightnessReverseIntents();
    }
  }

  /** Registers a selector-local lightness reverse remap that refreshes when target usage changes. */
  registerLightnessReverseIntent(intent: LightnessReverseIntent) {
    this.lightnessReverseIntentUsage.set(intent.rawSelector, intent);
    this.refreshLightnessReverseIntents();
  }
}

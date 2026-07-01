import type { Extractor } from 'unocss';
import type { MagicColorDepth } from '../utils/color-variable';
import type { FileUsage } from './scanner';
import { createEmptyFileUsage, mergeColorVariableUsage, mergeFileUsageTargets, scanColorVariableTargets } from './scanner';
import { TokenUsage } from './token';

// UnoCSS may omit an id for inline input; keep those scans under a stable bucket.
const DEFAULT_ID = '__inline__';

export type ColorVariableSourceDepths = Map<string, Set<MagicColorDepth>>;

export interface LightnessReverseIntent {
  rawSelector: string
  css: Record<string, string>
  refresh: () => ColorVariableSourceDepths
}

export interface StaticShortcutColorVariableTargetUsage {
  rawSelector: string
  tokens: Iterable<string>
}

function hasColorVariableTargetUsage(usage: FileUsage) {
  return usage.colorVariables.targets.size > 0;
}

function aggregateColorVariableDepths(files: Iterable<FileUsage>, role: keyof FileUsage['colorVariables'], name: string) {
  const depths = new Set<MagicColorDepth>();
  let hasFiles = false;

  for (const fileUsage of files) {
    hasFiles = true;
    const colorDepths = fileUsage.colorVariables[role].get(name);
    if (!colorDepths) {
      continue;
    }

    for (const depth of colorDepths) {
      depths.add(depth);
    }
  }

  return hasFiles && depths.size > 0 ? depths : undefined;
}

function aggregateColorVariableNames(files: Iterable<FileUsage>, role: keyof FileUsage['colorVariables']) {
  const names = new Set<string>();

  for (const fileUsage of files) {
    for (const name of fileUsage.colorVariables[role].keys()) {
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
  private readonly files = new Map<string, FileUsage>();

  private readonly recordedTargetUsages = new Map<string, FileUsage>();

  private readonly lightnessReverseIntents = new Map<string, LightnessReverseIntent>();

  private readonly tokenIndex = new TokenUsage();

  /** UnoCSS extractor hook that indexes usage tokens before rules and preflights run. */
  readonly extractor: Extractor = {
    name: 'magicolor-usage',
    order: 1,
    extract: ({ extracted, id }) => {
      // Replace each input id on every scan so watch-mode updates drop stale tokens.
      this.replaceExtractedTokenUsage(id ?? DEFAULT_ID, extracted);
    },
  };

  /** Replaces the usage snapshot for one input so watch-mode edits remove stale tokens. */
  private replaceExtractedTokenUsage(id: string, tokens: Iterable<string>) {
    const previousUsage = this.files.get(id);
    if (previousUsage) {
      this.tokenIndex.remove(id, previousUsage.tokens);
    }

    const usage = scanColorVariableTargets(tokens);
    this.tokenIndex.add(id, usage.tokens);

    // Shortcuts can expand after extraction, so merge any rule-recorded usage back into this file.
    for (const token of usage.tokens) {
      const recordedUsage = this.recordedTargetUsages.get(token);
      if (recordedUsage) {
        mergeFileUsageTargets(usage, recordedUsage);
      }
    }

    this.files.set(id, usage);
    this.refreshLightnessReverseIntents();
  }

  private refreshLightnessReverseIntents() {
    for (const fileUsage of this.files.values()) {
      fileUsage.colorVariables.sources.clear();
    }

    for (const intent of this.lightnessReverseIntents.values()) {
      const sourceDepths = intent.refresh();
      if (!sourceDepths.size) {
        continue;
      }

      const ids = this.tokenIndex.getIds(intent.rawSelector);
      if (!ids) {
        continue;
      }

      for (const id of ids) {
        const fileUsage = this.files.get(id);
        if (fileUsage) {
          mergeColorVariableUsage(fileUsage.colorVariables.sources, sourceDepths);
        }
      }
    }
  }

  private mergeRecordedTargetUsageIntoActiveFiles(rawSelector: string, usage: FileUsage) {
    const ids = this.tokenIndex.getIds(rawSelector);
    // If the selector was already seen in one or more files, update their snapshots immediately.
    if (ids) {
      for (const id of ids) {
        const fileUsage = this.files.get(id);
        if (fileUsage) {
          mergeFileUsageTargets(fileUsage, usage);
        }
      }
    }
  }

  private getSharedFileIds(firstToken: string, secondToken: string) {
    const firstIds = this.tokenIndex.getIds(firstToken);
    const secondIds = this.tokenIndex.getIds(secondToken);
    if (!firstIds || !secondIds) {
      return;
    }

    const sharedIds = new Set<string>();
    for (const id of firstIds) {
      if (secondIds.has(id)) {
        sharedIds.add(id);
      }
    }

    return sharedIds.size > 0 ? sharedIds : undefined;
  }

  /** Aggregates public target variable usages for a color name across input files. */
  getColorVariableTargetDepths(name: string) {
    return aggregateColorVariableDepths(this.files.values(), 'targets', name);
  }

  /** Lists all color names seen in public target variable usages across scanned inputs. */
  getColorVariableTargetNames() {
    return aggregateColorVariableNames(this.files.values(), 'targets');
  }

  /** Aggregates internal source variable usages for a color name across input files. */
  getColorVariableSourceDepths(name: string) {
    return aggregateColorVariableDepths(this.files.values(), 'sources', name);
  }

  /** Lists all color names seen in internal source variable usages across scanned inputs. */
  getColorVariableSourceNames() {
    return aggregateColorVariableNames(this.files.values(), 'sources');
  }

  /** Records public target variable usage produced by a rule expansion, such as shortcuts or aliases. */
  recordColorVariableTargetUsage(rawSelector: string | undefined, token: string) {
    if (!rawSelector) {
      return;
    }

    const usage = scanColorVariableTargets([token]);
    if (!hasColorVariableTargetUsage(usage)) {
      return;
    }

    const recordedUsage = this.recordedTargetUsages.get(rawSelector) ?? createEmptyFileUsage();
    mergeFileUsageTargets(recordedUsage, usage);
    this.recordedTargetUsages.set(rawSelector, recordedUsage);

    this.mergeRecordedTargetUsageIntoActiveFiles(rawSelector, usage);

    this.refreshLightnessReverseIntents();
  }

  /** Records static shortcut-expanded target usages when a shortcut and a consumer token share one input file. */
  recordShortcutColorVariableTargetUsages(consumerRawSelector: string, shortcuts: Iterable<StaticShortcutColorVariableTargetUsage>) {
    let changed = false;

    for (const shortcut of shortcuts) {
      const ids = this.getSharedFileIds(consumerRawSelector, shortcut.rawSelector);
      if (!ids) {
        continue;
      }

      const usage = scanColorVariableTargets(shortcut.tokens);
      if (!hasColorVariableTargetUsage(usage)) {
        continue;
      }

      const recordedUsage = this.recordedTargetUsages.get(shortcut.rawSelector) ?? createEmptyFileUsage();
      mergeFileUsageTargets(recordedUsage, usage);
      this.recordedTargetUsages.set(shortcut.rawSelector, recordedUsage);

      for (const id of ids) {
        const fileUsage = this.files.get(id);
        if (fileUsage) {
          mergeFileUsageTargets(fileUsage, usage);
        }
      }
      changed = true;
    }

    if (changed) {
      this.refreshLightnessReverseIntents();
    }
  }

  /** Registers a selector-local lightness reverse remap that refreshes when target usage changes. */
  registerLightnessReverseIntent(intent: LightnessReverseIntent) {
    this.lightnessReverseIntents.set(intent.rawSelector, intent);
    this.refreshLightnessReverseIntents();
  }

  /** Refreshes one registered lightness reverse selector before UnoCSS serializes its rule output. */
  refreshLightnessReverseIntent(rawSelector: string) {
    const intent = this.lightnessReverseIntents.get(rawSelector);
    if (!intent) {
      return;
    }

    const sourceDepths = intent.refresh();
    if (!sourceDepths.size) {
      return;
    }

    const ids = this.tokenIndex.getIds(rawSelector);
    if (!ids) {
      return;
    }

    for (const id of ids) {
      const fileUsage = this.files.get(id);
      if (fileUsage) {
        mergeColorVariableUsage(fileUsage.colorVariables.sources, sourceDepths);
      }
    }
  }
}

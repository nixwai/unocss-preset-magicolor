import type { Extractor } from 'unocss';
import type { ThemeKey } from './typing';
import { resolveDepth } from './utils';

export const BASE_COLOR_DEPTH = 'none';
export type MagicColorDepth = ThemeKey | typeof BASE_COLOR_DEPTH;

export interface MagicColorUsage {
  /** Color depths used by scanned content. `none` means base color, for example `c-mc-btn`. */
  depths: Set<MagicColorDepth>
}

/** Usage collected from one UnoCSS extractor input. */
interface FileUsage {
  /** Color variables defined in this input, for example `mc-btn_red`. */
  definitions: Set<string>
  /** Color usages grouped by magic color name. */
  colors: Map<string, MagicColorUsage>
}

/** Reads aggregated usage for a magic color name from the current preset instance. */
export type MagicColorUsageGetter = (name: string) => MagicColorUsage | undefined;

/** Reads usage from inputs that define a magic color name. */
export type MagicColorDefinedUsageGetter = (name: string) => MagicColorUsage | undefined;

/** Reads all scanned magic color usage names from the current preset instance. */
export type MagicColorUsageNameGetter = () => string[];

/** Reads whether a magic color name was defined by an `mc-*` token. */
export type MagicColorDefinitionChecker = (name: string) => boolean;

/** Shared per-preset context used by rules and preflights. */
export interface MagicColorContext {
  getUsage: MagicColorUsageGetter
  getDefinedUsage: MagicColorDefinedUsageGetter
  getUsageNames: MagicColorUsageNameGetter
  isDefined: MagicColorDefinitionChecker
}

// UnoCSS may omit an id for inline input; keep those scans under a stable bucket.
const DEFAULT_ID = '__inline__';

// Matches magic color definitions such as `mc-btn_red`.
const definitionTokenRE = /^mc-([A-Za-z][A-Za-z0-9-]*)_/;

// Matches magic color usages such as `c-mc-btn`, `bg-mc-btn-640`, or `bg-mc-btn-640/50`.
const colorUsageTokenRE = /^(?!mc-[A-Za-z][A-Za-z0-9-]*_)(?:.+-)?mc-([A-Za-z][A-Za-z0-9-]*?)(?:-(\d{1,3}))?(?:[:/].+)?$/;

/** Creates a mutable usage accumulator for one color name. */
function createEmptyUsage(): MagicColorUsage {
  return { depths: new Set() };
}

/** Stores the normalized theme depth so nearby arbitrary depths share the same variable set. */
function addDepth(usage: MagicColorUsage, no: string) {
  const { originDepth } = resolveDepth(no);
  usage.depths.add(originDepth);
}

/** Removes UnoCSS variants so `hover:bg-mc-btn-640` scans as `bg-mc-btn-640`. */
function normalizeToken(token: string) {
  return token.slice(token.lastIndexOf(':') + 1);
}

/** Scans extracted tokens into definitions and color usages for one input id. */
function scanUsage(tokens: Iterable<string>): FileUsage {
  const definitions = new Set<string>();
  const colors = new Map<string, MagicColorUsage>();

  for (const token of tokens) {
    const current = normalizeToken(token);

    // Definitions create CSS variables and should not be counted as selector usages.
    const definitionMatch = current.match(definitionTokenRE);
    if (definitionMatch) {
      definitions.add(definitionMatch[1]);
      continue;
    }

    const colorUsageMatch = current.match(colorUsageTokenRE);
    if (!colorUsageMatch) {
      continue;
    }

    const [, name, no] = colorUsageMatch;
    if (!name) {
      continue;
    }

    // Merge repeated tokens for the same color name within this input.
    const usage = colors.get(name) ?? createEmptyUsage();
    if (no) {
      addDepth(usage, no);
    }
    else {
      usage.depths.add(BASE_COLOR_DEPTH);
    }
    colors.set(name, usage);
  }

  return { definitions, colors };
}

/**
 * Creates the per-preset usage tracker shared by the extractor, rules, and preflights.
 * Keeping this state per preset prevents scans from leaking between UnoCSS generators.
 */
export function createMagicColorUsage() {
  const files = new Map<string, FileUsage>();

  /** Distinguishes "not scanned yet" from "scanned but this color was not used". */
  function hasScanned() {
    return files.size > 0;
  }

  /** Aggregates all scanned selector usages for a color name across input files. */
  function getUsage(name: string): MagicColorUsage | undefined {
    const usage = createEmptyUsage();

    for (const fileUsage of files.values()) {
      const colorUsage = fileUsage.colors.get(name);
      if (!colorUsage) {
        continue;
      }

      for (const depth of colorUsage.depths) {
        usage.depths.add(depth);
      }
    }

    return hasScanned() && usage.depths.size > 0 ? usage : undefined;
  }

  /** Aggregates usage only from files that define the requested magic color name. */
  function getDefinedUsage(name: string): MagicColorUsage | undefined {
    let foundDefinition = false;
    const usage = createEmptyUsage();

    for (const fileUsage of files.values()) {
      if (!fileUsage.definitions.has(name)) {
        continue;
      }

      foundDefinition = true;
      const colorUsage = fileUsage.colors.get(name);
      if (!colorUsage) {
        continue;
      }

      for (const depth of colorUsage.depths) {
        usage.depths.add(depth);
      }
    }

    return foundDefinition ? usage : undefined;
  }

  /** Lists all color names seen in selector usages across scanned inputs. */
  function getUsageNames() {
    const names = new Set<string>();

    for (const fileUsage of files.values()) {
      for (const name of fileUsage.colors.keys()) {
        names.add(name);
      }
    }

    return Array.from(names);
  }

  /** Checks whether any scanned input defines this magic color with an `mc-*` token. */
  function isDefined(name: string) {
    for (const fileUsage of files.values()) {
      if (fileUsage.definitions.has(name)) {
        return true;
      }
    }

    return false;
  }

  const extractor: Extractor = {
    name: 'magicolor-usage',
    order: 1,
    extract({ extracted, id }) {
      // Replace each input id on every scan so watch-mode updates drop stale tokens.
      files.set(id ?? DEFAULT_ID, scanUsage(extracted));
    },
  };

  return {
    extractor,
    getUsage,
    getDefinedUsage,
    getUsageNames,
    isDefined,
  };
}

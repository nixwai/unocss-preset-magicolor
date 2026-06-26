import type { ThemeMetas } from 'magic-color';
import type { PresetMcOptions } from './types';
import type { MagicColorUsage } from './usages';

export type ThemeKey = keyof ThemeMetas;

/** Shared per-preset context used by rules and preflights. */
export interface MagicColorContext {
  options: PresetMcOptions
  usage: MagicColorUsage
}

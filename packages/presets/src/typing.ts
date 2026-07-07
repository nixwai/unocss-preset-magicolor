import type { ThemeMetas } from 'magic-color';
import type { MagicColorOptions } from './types';
import type { MagicColorUsage } from './usages';

export type ThemeKey = keyof ThemeMetas;

/** Shared per-preset context used by rules and preflights. */
export interface MagicColorContext {
  options: MagicColorOptions
  usage: MagicColorUsage
}

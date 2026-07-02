import type { MagicColorDepth } from '../utils/color-variable';

export type MagicColorDepthMap = Map<string, Set<MagicColorDepth>>;

export interface StaticShortcutColorVariableTargetUsage {
  rawSelector: string
  tokens: Iterable<string>
}

import type { Theme } from '@unocss/preset-wind4';
import type { Variant } from 'unocss';
import type { MagicColorContext } from '../typing';
import { placeholderModifier } from './placeholder';

export function variants(_context: MagicColorContext): Variant<Theme>[] {
  return [
    placeholderModifier,
  ].filter(Boolean) as Variant<Theme>[];
}

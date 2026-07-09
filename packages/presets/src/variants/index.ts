import type { Theme } from '@unocss/preset-wind4';
import type { Variant } from 'unocss';
import type { MagicColorContext } from '../typing';
import { devCacheTokenModifier } from './dev-cache';
import { placeholderModifier } from './placeholder';

export function variants(context: MagicColorContext): Variant<Theme>[] {
  return [
    context.options.devCacheToken && devCacheTokenModifier,
    placeholderModifier,
  ].filter(Boolean) as Variant<Theme>[];
}

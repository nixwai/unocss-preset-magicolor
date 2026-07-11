import type { Theme } from '@unocss/preset-wind4';
import type { Variant } from 'unocss';
import { placeholderModifier } from './placeholder';

export function variants(): Variant<Theme>[] {
  return [
    placeholderModifier,
  ];
}

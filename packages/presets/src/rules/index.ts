import type { Rule } from 'unocss';
import { colorStyle } from './color-style';

export const rules: Rule[] = [
  colorStyle,
].flat();

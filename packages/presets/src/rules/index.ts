import type { Rule } from 'unocss';
import { colorStyle } from './color-style';
import { colorVariable } from './color-variable';

export const rules: Rule[] = [
  colorStyle,
  colorVariable,
].flat();

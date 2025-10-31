import type { Rule } from 'unocss';
import { mcColorResolver } from '../utils';

export const color: Rule[] = [
  [/^(?:text-color|text|color|c)-mc-(.+)$/, mcColorResolver('color', 'text')],
  [/^bg-mc-(.+)$/, mcColorResolver('background-color', 'bg')],
];

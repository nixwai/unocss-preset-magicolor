import type { Rule } from 'unocss';
import type { MagicColorContext } from '../typing';
import { createColorStyle } from './color-style';
import { createColorVariable } from './color-variable';

export function createRules(context?: MagicColorContext): Rule[] {
  return [
    createColorStyle(context),
    createColorVariable(context),
  ].flat();
}

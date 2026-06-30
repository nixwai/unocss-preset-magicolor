import type { Rule } from 'unocss';
import type { MagicColorContext } from '../typing';
import { createLightnessReverseColor } from './color-lr-rule';
import { createColorStyle } from './color-style-rule';
import { createColorVariable } from './color-variable-rule';

export function createRules(context?: MagicColorContext): Rule[] {
  return [
    createColorStyle(context),
    createLightnessReverseColor(context),
    createColorVariable(context),
  ].flat();
}

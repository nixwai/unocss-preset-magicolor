import type { Rule } from 'unocss';
import type { MagicColorContext } from '../typing';
import { createColorStyle } from './color-style-rule';
import { createLightnessReverseColor } from './mc-lr-rule';
import { createColorVariable } from './mc-variable-rule';

/**
 * Combines all magic-color rule groups into the preset rule list.
 * @param context Optional per-preset context for usage tracking. When omitted,
 * rules will still function but usage-based variable generation will be disabled.
 */
export function createRules(context?: MagicColorContext): Rule[] {
  return [
    createColorStyle(context),
    createLightnessReverseColor(context),
    createColorVariable(context),
  ].flat();
}

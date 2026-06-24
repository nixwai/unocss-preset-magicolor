import type { Theme } from '@unocss/preset-wind4';
import type { Rule, RuleContext } from 'unocss';
import type { MagicColorContext } from '../usage';
import { resolveThemeColorVariable } from './utils';

export function createColorVariable(context?: MagicColorContext): Rule[] {
  return [
    [/^mc-(.+)$/, (match, ctx) => resolveMagicColor(match, ctx, context)],
  ];
}

function resolveMagicColor([, body]: string[], { theme }: RuleContext<Theme>, context?: MagicColorContext) {
  // Use "_" to separate name and color
  const firstUnderscoreIndex = body.indexOf('_');
  const name = body.substring(0, firstUnderscoreIndex);
  const hue = body.substring(firstUnderscoreIndex + 1);
  if (!hue) {
    return;
  }
  const css = resolveThemeColorVariable(name, hue, theme, context?.getDefinedUsage(name));
  return css;
};

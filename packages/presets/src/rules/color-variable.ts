import type { Theme } from '@unocss/preset-wind4';
import type { Rule, RuleContext } from 'unocss';
import { resolveThemeColorVariable } from './utils';

export const colorVariable: Rule[] = [
  [/^mc-(.+)$/, resolveMagicColor],
];

function resolveMagicColor([, body]: string[], { theme }: RuleContext<Theme>) {
  // Use "_" to separate name、 color
  const firstUnderscoreIndex = body.indexOf('_');
  const name = body.substring(0, firstUnderscoreIndex);
  const hue = body.substring(firstUnderscoreIndex + 1);
  if (!hue) {
    return;
  }
  const css = resolveThemeColorVariable(name, hue, theme);
  return css;
};

import type { Theme } from '@unocss/preset-wind4';
import type { Rule, RuleContext } from 'unocss';
import type { MagicColorContext } from '../typing';
import { resolveColorParts, splitColorParts } from '@unocss-preset-magicolor/utils';
import { resolveThemeColorVariable } from './utils';

export function createColorVariable(context?: MagicColorContext): Rule[] {
  return [
    [/^mc-(.+)$/, (match, ctx) => resolveMagicColor(match, ctx, context)],
  ];
}

function resolveHubColor(hue = '') {
  const [bodyColor] = splitColorParts(hue);
  return resolveColorParts(bodyColor);
}

function resolveMagicColor([, body]: string[], { theme }: RuleContext<Theme>, context?: MagicColorContext) {
  // Use "_" to separate name and color
  const firstUnderscoreIndex = body.indexOf('_');
  const name = body.substring(0, firstUnderscoreIndex);
  const hue = body.substring(firstUnderscoreIndex + 1);
  if (!hue) {
    return;
  }
  // Be compatible with the colors defined in the usage options
  const mcColorObj = resolveHubColor(hue);
  const optionColorObj = resolveHubColor(context?.options.colors?.[mcColorObj.originColor]);
  const colorParts = {
    originColor: optionColorObj.originColor || mcColorObj.originColor,
    bodyNo: mcColorObj.bodyNo || optionColorObj.bodyNo,
  };
  const css = resolveThemeColorVariable(name, colorParts, theme, context);
  return css;
};

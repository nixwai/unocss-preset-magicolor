import type { ResolvedColorParts } from '@unocss-preset-magicolor/utils';
import type { Theme } from '@unocss/preset-wind4';
import type { Rule, RuleContext } from 'unocss';
import type { MagicColorContext } from '../typing';
import { resolveBodyColor, resolveSpecialColor } from '@unocss-preset-magicolor/utils';
import { hasParseableColor } from '@unocss/preset-wind4/utils';
import { BASE_COLOR_DEPTH } from '../usages';
import { generateColorName, parseMagicColorDefinition } from '../utils/color-variable';
import { resolveThemeColorVariable } from '../utils/theme-colors';

export function createColorVariable(context?: MagicColorContext): Rule[] {
  return [
    [/^mc-(?!lr(?:-|$))(.+)$/, (match, ctx) => resolveMagicColor(match, ctx, context)],
  ];
}

function isVariableColorSource(color: string, theme: Theme, context?: MagicColorContext) {
  if (resolveSpecialColor(color)) {
    return false;
  }
  return !!context?.options.colors?.[color] || (!color.startsWith('[') && hasParseableColor(color, theme));
}

function resolveMagicColorVariable(
  name: string,
  colorParts: ResolvedColorParts & { originColor: string },
  ctx: RuleContext<Theme>,
  context?: MagicColorContext,
) {
  const css: Record<string, string> = {};
  const usage = context?.usage.getUsage(name);
  if (!usage) {
    return css;
  }
  const { originColor, bodyNo } = colorParts;
  for (const depth of usage) {
    const sourceBodyNo = depth === BASE_COLOR_DEPTH ? bodyNo : depth;
    const targetBodyNo = depth === BASE_COLOR_DEPTH ? undefined : depth;

    const targetVariableName = generateColorName(name, targetBodyNo);
    const sourceVariableName = generateColorName(originColor, sourceBodyNo);
    if (targetVariableName === sourceVariableName) {
      continue;
    }

    css[targetVariableName] = `var(${sourceVariableName})`;
    context?.usage.recordUsage(sourceBodyNo ? `mc-${originColor}-${sourceBodyNo}` : `mc-${originColor}`, ctx.rawSelector);
  }

  return css;
}

function resolveMagicColor([, body]: string[], ctx: RuleContext<Theme>, context?: MagicColorContext) {
  const { theme } = ctx;
  const definition = parseMagicColorDefinition(body);
  if (!definition) {
    return;
  }
  const { name, hue } = definition;

  const mcColorObj = resolveBodyColor(hue);
  // Be compatible with the colors defined in the usage options
  if (isVariableColorSource(mcColorObj.originColor, theme, context)) {
    return resolveMagicColorVariable(name, mcColorObj, ctx, context);
  }
  // It will be directly parsed into colors，rather than variables
  return resolveThemeColorVariable(
    name,
    mcColorObj,
    theme,
    context,
  );
};

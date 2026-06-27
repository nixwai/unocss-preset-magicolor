import type { Theme } from '@unocss/preset-wind4';
import type { Rule, RuleContext } from 'unocss';
import type { MagicColorContext } from '../typing';
import { resolveBodyColor } from '@unocss-preset-magicolor/utils';
import { hasParseableColor } from '@unocss/preset-wind4/utils';
import { BASE_COLOR_DEPTH } from '../usages';
import { resolveThemeColorVariable } from './utils';

export function createColorVariable(context?: MagicColorContext): Rule[] {
  return [
    [/^mc-(.+)$/, (match, ctx) => resolveMagicColor(match, ctx, context)],
  ];
}

function isVariableColorSource(color: string, theme: Theme, context?: MagicColorContext) {
  return !!context?.options.colors?.[color] || (!color.startsWith('[') && hasParseableColor(color, theme));
}

function getMagicColorVariableName(originColor: string, bodyNo?: string | number) {
  return bodyNo ? `--mc-${originColor}-${bodyNo}-color` : `--mc-${originColor}-color`;
}

function resolveMagicColorVariable(
  name: string,
  originColor: string,
  bodyNo: string | undefined,
  ctx: RuleContext<Theme>,
  context?: MagicColorContext,
) {
  const css: Record<string, string> = {};
  const usage = context?.usage.getUsage(name);
  if (!usage) {
    return css;
  }

  for (const depth of usage) {
    const sourceBodyNo = depth === BASE_COLOR_DEPTH ? bodyNo : depth;
    const targetBodyNo = depth === BASE_COLOR_DEPTH ? undefined : depth;

    if (name === originColor && sourceBodyNo === targetBodyNo) {
      continue;
    }

    const targetVariableName = getMagicColorVariableName(name, targetBodyNo);
    css[targetVariableName] = `var(${getMagicColorVariableName(originColor, sourceBodyNo)})`;
    context?.usage.recordUsage(sourceBodyNo ? `mc-${originColor}-${sourceBodyNo}` : `mc-${originColor}`, ctx.rawSelector);
  }

  return css;
}

function resolveMagicColor([, body]: string[], ctx: RuleContext<Theme>, context?: MagicColorContext) {
  const { theme } = ctx;
  // Use "_" to separate name and color
  const firstUnderscoreIndex = body.indexOf('_');
  if (firstUnderscoreIndex < 0) {
    return;
  }
  const name = body.substring(0, firstUnderscoreIndex);
  const hue = body.substring(firstUnderscoreIndex + 1);
  if (!hue) {
    return;
  }
  // Be compatible with the colors defined in the usage options
  const mcColorObj = resolveBodyColor(hue);
  if (isVariableColorSource(mcColorObj.originColor, theme, context)) {
    return resolveMagicColorVariable(name, mcColorObj.originColor, mcColorObj.bodyNo, ctx, context);
  }

  const optionColorObj = resolveBodyColor(context?.options.colors?.[mcColorObj.originColor]);
  const colorParts = {
    originColor: optionColorObj.originColor || mcColorObj.originColor, // The color of the options configuration
    bodyNo: mcColorObj.bodyNo || optionColorObj.bodyNo, // Retain the original depth
  };
  const css = resolveThemeColorVariable(name, colorParts, theme, context);
  return css;
};

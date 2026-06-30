import type { ResolvedColorParts } from '@unocss-preset-magicolor/utils';
import type { Theme } from '@unocss/preset-wind4';
import type { Rule, RuleContext } from 'unocss';
import type { MagicColorContext } from '../typing';
import { resolveBodyColor, resolveSpecialColor } from '@unocss-preset-magicolor/utils';
import { hasParseableColor } from '@unocss/preset-wind4/utils';
import { BASE_COLOR_DEPTH, createCssVariableReference, generateColorName, parseMagicColorDefinition } from '../utils/color-variable';
import { resolveThemeColorVariable } from '../utils/theme-colors';

/** Creates `mc-name_source` rules that define reusable magic color variables. */
export function createColorVariable(context?: MagicColorContext): Rule[] {
  return [
    [/^mc-(?!lr(?:-|$))(.+)$/, (match, ctx) => resolveMagicColor(match, ctx, context)],
  ];
}

/** Returns true when the source color should be linked through generated CSS variables. */
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
    // The target depth controls the variable being defined; the source depth
    // keeps an inline suffix such as `primary-620` for base aliases.
    const sourceBodyNo = depth === BASE_COLOR_DEPTH ? bodyNo : depth;

    const targetVariableName = generateColorName(name, depth);
    const sourceVariableName = generateColorName(originColor, sourceBodyNo);
    if (targetVariableName === sourceVariableName) {
      continue;
    }

    css[targetVariableName] = createCssVariableReference(sourceVariableName);
    // Ensure the source variable itself is generated even when it only appears through an alias.
    const bodyName = sourceBodyNo || sourceBodyNo === BASE_COLOR_DEPTH ? `mc-${originColor}-${sourceBodyNo}` : `mc-${originColor}`;
    context?.usage.recordUsage(bodyName, ctx.rawSelector);
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
  // Link option and theme colors through variables so aliases stay reactive.
  if (isVariableColorSource(mcColorObj.originColor, theme, context)) {
    return resolveMagicColorVariable(name, mcColorObj, ctx, context);
  }
  const usage = context?.usage.getUsage(name);
  if (!usage) {
    return;
  }
  // Arbitrary or literal colors are resolved directly rather than linked through variables.
  return resolveThemeColorVariable(name, mcColorObj, theme, usage);
};

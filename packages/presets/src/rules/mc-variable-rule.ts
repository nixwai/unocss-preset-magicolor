import type { ResolvedColorParts } from '@unocss-preset-magicolor/utils';
import type { Theme } from '@unocss/preset-wind4';
import type { Rule, RuleContext } from 'unocss';
import type { MagicColorContext } from '../typing';
import type { MagicColorDepthMap } from '../usages';
import { resolveBodyColor, resolveThemeDepth } from '@unocss-preset-magicolor/utils';
import { isVariableColorSource } from '../utils/color-config';
import {
  BASE_COLOR_DEPTH,
  createTargetColorVariableName,
  parseColorVariableDefinition,
  toVar,
} from '../utils/color-variable';
import { resolveThemeColorCss } from '../utils/theme-colors';

/** Creates `mc-name_source` rules that define reusable magic color variables. */
export function createColorVariable(context?: MagicColorContext): Rule[] {
  return [
    [/^mc-(?!lr(?:-|$))(.+)$/, (match, ctx) => resolveMagicColor(match, ctx, context)],
  ];
}

function resolveMagicColorVariable(
  name: string,
  colorParts: ResolvedColorParts & { originColor: string },
  ctx: RuleContext<Theme>,
  context?: MagicColorContext,
) {
  const css: Record<string, string> = {};
  const depths = context?.usage.getColorVariableTargetDepths(name);
  if (!depths) {
    return css;
  }
  const { originColor, originDepth } = colorParts;
  const sourceDepths: MagicColorDepthMap = new Map();
  for (const depth of depths) {
    // The target depth controls the variable being defined;
    // The source depthkeeps an inline suffix such as `primary-620` for base aliases.
    const sourceBodyNo = resolveThemeDepth({
      depth: depth === BASE_COLOR_DEPTH ? originDepth : depth,
      defaultValue: BASE_COLOR_DEPTH,
    });

    const targetVariableName = createTargetColorVariableName(name, depth);
    const sourceVariableName = createTargetColorVariableName(originColor, sourceBodyNo);
    if (targetVariableName === sourceVariableName) {
      continue;
    }

    css[targetVariableName] = toVar(sourceVariableName);
    // Ensure the source variable itself is generated even when it only appears through an alias.
    const targetDepths = sourceDepths.get(originColor) ?? new Set();
    targetDepths.add(sourceBodyNo);
    sourceDepths.set(originColor, targetDepths);
  }

  context?.usage.recordColorVariableTargetUsage(ctx.rawSelector, sourceDepths);

  return css;
}

function resolveMagicColor([, body]: string[], ctx: RuleContext<Theme>, context?: MagicColorContext) {
  const { theme } = ctx;
  const definition = parseColorVariableDefinition(body);
  if (!definition) {
    return;
  }
  const { name, hue } = definition;

  const mcColorObj = resolveBodyColor(hue);
  // Link option and theme colors through variables so aliases stay reactive.
  if (isVariableColorSource(mcColorObj.originColor, theme, context)) {
    return resolveMagicColorVariable(name, mcColorObj, ctx, context);
  }
  const depths = context?.usage.getColorVariableTargetDepths(name);
  if (!depths) {
    return;
  }
  // Arbitrary or literal colors are resolved directly rather than linked through variables.
  return resolveThemeColorCss(name, mcColorObj, theme, depths);
};

import type { ResolvedColorParts } from '@unocss-preset-magicolor/utils';
import type { Theme } from '@unocss/preset-wind4';
import type { Rule, RuleContext } from 'unocss';
import type { MagicColorContext } from '../typing';
import { resolveBodyColor, resolveThemeDepth } from '@unocss-preset-magicolor/utils';
import { hasParseableColor } from '@unocss/preset-wind4/utils';
import { BASE_COLOR_DEPTH } from '../usages';
import { resolveThemeColorVariable } from './utils';

const LIGHTNESS_REVERSE_PREFIX = 'lr-';

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
  colorParts: ResolvedColorParts & { originColor: string },
  ctx: RuleContext<Theme>,
  context?: MagicColorContext,
  lightnessReverse = false,
) {
  const css: Record<string, string> = {};
  const usage = context?.usage.getUsage(name);
  if (!usage) {
    return css;
  }
  const { originColor, bodyNo } = colorParts;
  for (const depth of usage) {
    let sourceBodyNo = depth === BASE_COLOR_DEPTH ? bodyNo : depth;
    if (lightnessReverse) {
      sourceBodyNo = resolveThemeDepth(sourceBodyNo, { lightnessReverse });
    }
    const targetBodyNo = depth === BASE_COLOR_DEPTH ? undefined : depth;

    const targetVariableName = getMagicColorVariableName(name, targetBodyNo);
    const sourceVariableName = getMagicColorVariableName(originColor, sourceBodyNo);
    if (targetVariableName === sourceVariableName) {
      continue;
    }

    css[targetVariableName] = `var(${sourceVariableName})`;
    context?.usage.recordUsage(sourceBodyNo ? `mc-${originColor}-${sourceBodyNo}` : `mc-${originColor}`, ctx.rawSelector);
  }

  return css;
}

function parseMagicColorDefinition(body: string) {
  const firstUnderscoreIndex = body.indexOf('_');
  if (firstUnderscoreIndex < 0) {
    return;
  }
  const rawName = body.substring(0, firstUnderscoreIndex);
  const hue = body.substring(firstUnderscoreIndex + 1);
  const lightnessReverse = rawName.startsWith(LIGHTNESS_REVERSE_PREFIX);
  const name = lightnessReverse ? rawName.slice(LIGHTNESS_REVERSE_PREFIX.length) : rawName;
  if (!name || !hue) {
    return;
  }
  return { name, hue, lightnessReverse };
}

function resolveMagicColor([, body]: string[], ctx: RuleContext<Theme>, context?: MagicColorContext) {
  const { theme } = ctx;
  const definition = parseMagicColorDefinition(body);
  if (!definition) {
    return;
  }
  const { name, hue, lightnessReverse } = definition;
  // Be compatible with the colors defined in the usage options
  const mcColorObj = resolveBodyColor(hue);
  if (isVariableColorSource(mcColorObj.originColor, theme, context)) {
    return resolveMagicColorVariable(name, mcColorObj, ctx, context, lightnessReverse);
  }

  return resolveThemeColorVariable(
    name,
    mcColorObj,
    theme,
    context,
    { lightnessReverse },
  );
};

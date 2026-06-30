import type { ResolvedColorParts } from '@unocss-preset-magicolor/utils';
import type { Theme } from '@unocss/preset-wind4';
import type { Rule, RuleContext } from 'unocss';
import type { MagicColorContext } from '../typing';
import { hasDarkVariant, resolveBodyColor } from '@unocss-preset-magicolor/utils';
import { resolveMixtureColorConfig } from '../utils/color-config';
import { parseMagicColorDefinition } from '../utils/color-variable';
import { resolveThemeColorVariable } from '../utils/theme-colors';

export function createLightnessReverseColor(context?: MagicColorContext): Rule[] {
  return [
    [/^mc-lr$/, (_match, ctx) => resolveGlobalLightnessReverse(ctx, context)],
    [/^mc-lr-(.+)$/, (match, ctx) => resolveLocalLightnessReverse(match, ctx, context)],
  ];
}

function resolveLightnessReverseSource(
  colorParts: ResolvedColorParts & { originColor: string },
  theme: Theme,
  context?: MagicColorContext,
  preferDark = false,
) {
  const namedConfig = resolveMixtureColorConfig(colorParts.originColor, theme, context, preferDark);
  if (!namedConfig?.color) {
    return {
      colorParts,
      lightnessReverse: false,
    };
  }

  const sourceColorParts = resolveBodyColor(namedConfig.color);
  return {
    colorParts: {
      originColor: sourceColorParts.originColor,
      bodyNo: colorParts.bodyNo ?? sourceColorParts.bodyNo,
    },
    lightnessReverse: namedConfig.lightnessReverse,
  };
}

function resolveLocalLightnessReverse([, body]: string[], ctx: RuleContext<Theme>, context?: MagicColorContext) {
  const definition = parseMagicColorDefinition(body);
  if (!definition) {
    return;
  }
  const { name, hue } = definition;
  const source = resolveLightnessReverseSource(
    resolveBodyColor(hue),
    ctx.theme,
    context,
    hasDarkVariant(ctx.rawSelector),
  );

  return resolveThemeColorVariable(
    name,
    source.colorParts,
    ctx.theme,
    context,
    { lightnessReverse: !source.lightnessReverse },
  );
}

function resolveGlobalLightnessReverse(ctx: RuleContext<Theme>, context?: MagicColorContext) {
  const css: Record<string, string> = {};
  const usageNames = context?.usage.getUsageNames() ?? [];
  const { theme } = ctx;

  for (const name of usageNames) {
    const usage = context?.usage.getUsage(name);
    if (!usage) {
      continue;
    }
    const sourceConfig = resolveMixtureColorConfig(
      name,
      theme,
      context,
      hasDarkVariant(ctx.rawSelector),
    );
    if (!sourceConfig?.color) {
      continue;
    }
    Object.assign(css, resolveThemeColorVariable(
      name,
      resolveBodyColor(sourceConfig.color),
      theme,
      context,
      { lightnessReverse: !sourceConfig.lightnessReverse }, // reverse lightness
    ));
  }

  return css;
}

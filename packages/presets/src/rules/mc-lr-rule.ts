import type { Theme } from '@unocss/preset-wind4';
import type { Rule, RuleContext } from 'unocss';
import type { MagicColorContext } from '../typing';
import { hasDarkVariant, resolveBodyColor } from '@unocss-preset-magicolor/utils';
import { resolveMixtureColorConfig } from '../utils/color-config';
import { parseMagicColorDefinition } from '../utils/color-variable';
import { resolveThemeColorVariable } from '../utils/theme-colors';

/** Creates `mc-lr` rules that regenerate variables with reversed lightness depth lookup. */
export function createLightnessReverseColor(context?: MagicColorContext): Rule[] {
  return [
    [/^mc-lr$/, (_match, ctx) => resolveGlobalLightnessReverse(ctx, context)],
    [/^mc-lr-(.+)$/, (match, ctx) => resolveLocalLightnessReverse(match, ctx, context)],
  ];
}

function resolveLightnessReverseSource(
  body: string,
  theme: Theme,
  context?: MagicColorContext,
  preferDark = false,
) {
  const colorParts = resolveBodyColor(body);
  // Resolve aliases first so `mc-lr-btn_primary-400` can reverse the primary source color.
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
      // Keep the requested depth when present; otherwise inherit the alias source depth.
      originColor: sourceColorParts.originColor,
      bodyNo: colorParts.bodyNo ?? sourceColorParts.bodyNo,
    },
    lightnessReverse: namedConfig.lightnessReverse,
  };
}

/** Resolves local definitions such as `mc-lr-btn_rose-600`. */
function resolveLocalLightnessReverse([, body]: string[], ctx: RuleContext<Theme>, context?: MagicColorContext) {
  const definition = parseMagicColorDefinition(body);
  if (!definition) {
    return;
  }
  const { name, hue } = definition;
  const source = resolveLightnessReverseSource(
    hue,
    ctx.theme,
    context,
    hasDarkVariant(ctx.rawSelector),
  );

  const usage = context?.usage.getUsage(name);
  if (!usage) {
    return;
  }

  return resolveThemeColorVariable(
    name,
    source.colorParts,
    ctx.theme,
    usage,
    { lightnessReverse: !source.lightnessReverse },
  );
}

/** Rebuilds all currently used configured variables with reversed lightness depths. */
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
      usage,
      { lightnessReverse: !sourceConfig.lightnessReverse },
    ));
  }

  return css;
}

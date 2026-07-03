import type { Theme } from '@unocss/preset-wind4';
import type { Rule, RuleContext } from 'unocss';
import type { MagicColorContext } from '../typing';
import { hasDarkVariant, resolveBodyColor } from '@unocss-preset-magicolor/utils';
import { resolveMixtureColorConfig } from '../utils/color-config';
import { resolveColorReferences } from '../utils/color-references';
import { parseColorVariableDefinition } from '../utils/color-variable';
import { resolveThemeColorCss } from '../utils/theme-colors';

/** Creates `mc-lr` rules that regenerate variables with reversed lightness depth lookup. */
export function createLightnessReverseColor(context: MagicColorContext): Rule[] {
  return [
    [/^mc-lr$/, (_match, ctx) => resolveGlobalLightnessReverse(ctx, context)],
    [/^mc-lr-(.+)$/, (match, ctx) => resolveLocalLightnessReverse(match, ctx, context)],
  ];
}

/** Resolves local definitions such as `mc-lr-btn_rose-600` or `mc-lr-primary`. */
function resolveLocalLightnessReverse([, body]: string[], ctx: RuleContext<Theme>, context: MagicColorContext) {
  const definition = parseLightnessReverseDefinition(body);
  if (!definition) {
    return;
  }

  const { name, hue } = definition;
  context.usage.recordShortcutTargetUsages(ctx.generator.config.shortcuts, name);
  const colorParts = resolveBodyColor(hue);
  if (!colorParts.originColor) {
    return;
  }
  const sourceConfig = resolveMixtureColorConfig(colorParts.originColor, ctx.theme, context, hasDarkVariant(ctx.rawSelector));
  if (sourceConfig.color) {
    const sourceColorParts = resolveBodyColor(sourceConfig.color);
    const sourceBodyNo = colorParts.originDepth ?? sourceColorParts.originDepth;
    const result = resolveColorReferences({
      name,
      colorParts: {
        originColor: colorParts.originColor,
        originDepth: sourceBodyNo,
      },
      depths: context.usage.getTargetDepths(name),
      lightnessReverse: true,
    });
    context.usage.recordSourceUsage(ctx.rawSelector, result.depthMap);
    return result.css;
  }
  else {
    const depths = context.usage.getTargetDepths(name);
    return resolveThemeColorCss(
      name,
      colorParts,
      ctx.theme,
      depths,
      { lightnessReverse: true },
    );
  }
}

function parseLightnessReverseDefinition(body: string) {
  const definition = parseColorVariableDefinition(body);
  if (definition) {
    return definition;
  }

  if (!body || body.includes('_')) {
    return;
  }

  return { name: body, hue: body };
}

/** Rebuilds all currently used configured variables with reversed lightness depths. */
function resolveGlobalLightnessReverse(ctx: RuleContext<Theme>, context: MagicColorContext) {
  context.usage.recordShortcutTargetUsages(ctx.generator.config.shortcuts);
  const css: Record<string, string> = {};
  for (const name of context.usage.getTargetNames()) {
    const sourceConfig = resolveMixtureColorConfig(name, ctx.theme, context, hasDarkVariant(ctx.rawSelector));
    if (!sourceConfig.color) {
      continue;
    }
    const depths = context.usage.getTargetDepths(name);
    if (!depths) {
      continue;
    }
    const sourceColorParts = resolveBodyColor(sourceConfig.color);
    const result = resolveColorReferences({
      name,
      colorParts: {
        originDepth: sourceColorParts.originDepth,
        originColor: name,
      },
      depths,
      lightnessReverse: true,
    });
    Object.assign(css, result.css);
    context.usage.recordSourceUsage(ctx.rawSelector, result.depthMap);
  }
  return css;
}

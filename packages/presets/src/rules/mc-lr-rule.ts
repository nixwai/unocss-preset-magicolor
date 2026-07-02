import type { Theme } from '@unocss/preset-wind4';
import type { Rule, RuleContext } from 'unocss';
import type { MagicColorContext } from '../typing';
import { hasDarkVariant, resolveBodyColor } from '@unocss-preset-magicolor/utils';
import { resolveMixtureColorConfig } from '../utils/color-config';
import { resolveColorReferences } from '../utils/color-references';
import { parseColorVariableDefinition } from '../utils/color-variable';
import { resolveThemeColorCss } from '../utils/theme-colors';

/** Creates `mc-lr` rules that regenerate variables with reversed lightness depth lookup. */
export function createLightnessReverseColor(context?: MagicColorContext): Rule[] {
  return [
    [/^mc-lr$/, (_match, ctx) => resolveGlobalLightnessReverse(ctx, context)],
    [/^mc-lr-(.+)$/, (match, ctx) => resolveLocalLightnessReverse(match, ctx, context)],
  ];
}

function parseLightnessReverseDefinition(body: string) {
  const definition = parseColorVariableDefinition(body);
  if (definition) {
    return definition;
  }

  const arbitraryColorIndex = body.indexOf('-[');
  if (arbitraryColorIndex < 0) {
    return;
  }

  const name = body.substring(0, arbitraryColorIndex);
  const hue = body.substring(arbitraryColorIndex + 1);
  if (!name || !hue) {
    return;
  }

  return { name, hue };
}

/** Resolves local definitions such as `mc-lr-btn_rose-600`. */
function resolveLocalLightnessReverse([, body]: string[], ctx: RuleContext<Theme>, context?: MagicColorContext) {
  context?.usage.recordColorVariableTargetUsagesByShortcut(ctx.generator.config.shortcuts);
  const definition = parseLightnessReverseDefinition(body);

  if (!definition) {
    return;
  }

  const { name, hue } = definition;
  const colorParts = resolveBodyColor(hue);
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
      depths: context?.usage.getColorVariableTargetDepths(name),
      lightnessReverse: true,
    });
    context?.usage.recordColorVariableSourceUsage(ctx.rawSelector, result.depthMap);
    return result.css;
  }
  else {
    const depths = context?.usage.getColorVariableTargetDepths(name);
    return resolveThemeColorCss(
      name,
      colorParts,
      ctx.theme,
      depths,
      { lightnessReverse: true },
    );
  }
}

/** Rebuilds all currently used configured variables with reversed lightness depths. */
function resolveGlobalLightnessReverse(ctx: RuleContext<Theme>, context?: MagicColorContext) {
  context?.usage.recordColorVariableTargetUsagesByShortcut(ctx.generator.config.shortcuts);
  const css: Record<string, string> = {};
  for (const name of context?.usage.getColorVariableTargetNames() ?? []) {
    const sourceConfig = resolveMixtureColorConfig(name, ctx.theme, context, hasDarkVariant(ctx.rawSelector));
    if (!sourceConfig.color) {
      continue;
    }
    const depths = context?.usage.getColorVariableTargetDepths(name);
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
    context?.usage.recordColorVariableSourceUsage(ctx.rawSelector, result.depthMap);
  }
  return css;
}

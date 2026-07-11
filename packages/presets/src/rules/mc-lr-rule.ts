import type { Theme } from '@unocss/preset-wind4';
import type { CSSObject, Rule, RuleContext } from 'unocss';
import type { MagicColorContext } from '../typing';
import { hasDarkVariant, resolveBodyColor } from '@unocss-preset-magicolor/utils';
import { resolveMixtureColorConfig } from '../utils/color-config';
import { resolveColorReferences } from '../utils/color-references';
import { parseColorVariableDefinition } from '../utils/color-variable';
import { resolveThemeColorCss } from '../utils/theme-colors';

// As a placeholder, it avoids generating useless variable declarations and is useful for compatibility with "transformerCompileClass"
const KNOWN_LIGHTNESS_REVERSE_PLACEHOLDER = '--mc-lightness-reverse';

/** Creates `mc-lr` rules that regenerate variables with reversed lightness depth lookup. */
export function createLightnessReverseColor(context: MagicColorContext): Rule[] {
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
  if (!body || body.includes('_')) {
    return;
  }
  return { name: body, hue: body };
}

/** Resolves local definitions such as `mc-lr-btn_rose-600` or `mc-lr-primary`. */
function resolveLocalLightnessReverse([, body]: string[], ctx: RuleContext<Theme>, context: MagicColorContext) {
  const definition = parseLightnessReverseDefinition(body);
  if (!definition) {
    return;
  }

  const { name, hue } = definition;
  const colorParts = resolveBodyColor(hue);
  if (!colorParts.originColor) {
    return;
  }
  context.usage.recordShortcutTargetUsages(ctx);
  const targetDepths = context.usage.getTargetDepths(name);
  if (!targetDepths?.size) {
    return { [KNOWN_LIGHTNESS_REVERSE_PLACEHOLDER]: 'initial' };
  }

  const sourceConfig = resolveMixtureColorConfig(colorParts.originColor, ctx.theme, context, hasDarkVariant(ctx.rawSelector));
  if (sourceConfig.color) {
    const sourceColorParts = resolveBodyColor(sourceConfig.color);
    const sourceBodyNo = colorParts.originDepth ?? sourceColorParts.originDepth;
    const { css, depthMap } = resolveColorReferences({
      name,
      colorParts: {
        originColor: colorParts.originColor,
        originDepth: sourceBodyNo,
      },
      depths: targetDepths,
      lightnessReverse: true,
    });
    context.usage.recordRuleSourceUsage(ctx, depthMap);
    return css;
  }
  else {
    return resolveThemeColorCss(name, colorParts, ctx.theme, targetDepths, { lightnessReverse: true });
  }
}

/** Rebuilds all currently used configured variables with reversed lightness depths. */
function resolveGlobalLightnessReverse(ctx: RuleContext<Theme>, context: MagicColorContext) {
  context.usage.recordShortcutTargetUsages(ctx);
  const css: CSSObject = {};
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
    context.usage.recordRuleSourceUsage(ctx, result.depthMap);
  }
  return Object.keys(css).length ? css : { [KNOWN_LIGHTNESS_REVERSE_PLACEHOLDER]: 'initial' };
}

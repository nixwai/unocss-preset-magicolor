import type { Theme } from '@unocss/preset-wind4';
import type { CSSObject, Rule, RuleContext } from 'unocss';
import type { MagicColorContext } from '../typing';
import { hasDarkVariant, resolveBodyColor } from '@unocss-preset-magicolor/utils';
import { resolveMixtureColorConfig } from '../utils/color-config';
import { resolveColorReferences } from '../utils/color-references';
import { parseColorVariableDefinition } from '../utils/color-variable';
import { MC_DEV_CACHE_TOKEN_PATTERN } from '../utils/dev-cache-token';
import { resolveThemeColorCss } from '../utils/theme-colors';

// Keep the optional dev suffix outside captured bodies so lightness parsing
// receives the same definition in dev and build modes.
const GLOBAL_LIGHTNESS_REVERSE_RE = new RegExp(`^mc-lr(?::${MC_DEV_CACHE_TOKEN_PATTERN})?$`);
const LOCAL_LIGHTNESS_REVERSE_RE = new RegExp(`^mc-lr-(.+?)(?::${MC_DEV_CACHE_TOKEN_PATTERN})?$`);

/** Creates `mc-lr` rules that regenerate variables with reversed lightness depth lookup. */
export function createLightnessReverseColor(context: MagicColorContext): Rule[] {
  return [
    [GLOBAL_LIGHTNESS_REVERSE_RE, (_match, ctx) => resolveGlobalLightnessReverse(ctx, context)],
    [LOCAL_LIGHTNESS_REVERSE_RE, (match, ctx) => resolveLocalLightnessReverse(match, ctx, context)],
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
    context.usage.recordSourceUsage(ctx.rawSelector, depthMap);
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
    context.usage.recordSourceUsage(ctx.rawSelector, result.depthMap);
  }
  return css;
}

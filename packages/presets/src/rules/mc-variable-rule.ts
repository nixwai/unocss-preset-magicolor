import type { Theme } from '@unocss/preset-wind4';
import type { CSSObject, Rule, RuleContext } from 'unocss';
import type { MagicColorContext } from '../typing';
import { hasDarkVariant, resolveBodyColor } from '@unocss-preset-magicolor/utils';
import { resolveMixtureColorConfig } from '../utils/color-config';
import { resolveColorReferences } from '../utils/color-references';
import { parseColorVariableDefinition } from '../utils/color-variable';
import { MC_DEV_CACHE_TOKEN_PATTERN } from '../utils/dev-cache-token';
import { resolveThemeColorCss } from '../utils/theme-colors';

// Keep the optional dev suffix outside the captured body so color parsing sees
// the same definition in dev and build modes.
const COLOR_VARIABLE_RE = new RegExp(`^mc-(?!lr(?:-|:|$))(.+?)(?::${MC_DEV_CACHE_TOKEN_PATTERN})?$`);

/** Creates `mc-name_source` rules that define reusable magic color variables. */
export function createColorVariable(context: MagicColorContext): Rule[] {
  return [
    [COLOR_VARIABLE_RE, (match, ctx) => resolveMagicColor(match, ctx, context)],
  ];
}

function resolveMagicColor([, body]: string[], ctx: RuleContext<Theme>, context: MagicColorContext) {
  const { theme } = ctx;
  const definition = parseColorVariableDefinition(body);
  if (!definition) {
    return;
  }

  const { name, hue } = definition;

  const mcColorObj = resolveBodyColor(hue);
  if (!mcColorObj.originColor) {
    return;
  }
  context.usage.recordShortcutTargetUsages(ctx);
  const targetDepths = context.usage.getTargetDepths(name);
  const cssData: CSSObject = {};
  // Link option and theme colors through variables so aliases stay reactive.
  const sourceConfig = resolveMixtureColorConfig(mcColorObj.originColor, theme, context, hasDarkVariant(ctx.rawSelector));
  if (sourceConfig.color) {
    const { css, depthMap } = resolveColorReferences({
      name,
      colorParts: mcColorObj,
      depths: targetDepths,
    });
    context.usage.recordSourceUsage(ctx.rawSelector, depthMap);
    Object.assign(cssData, css);
  }
  else {
    // Arbitrary or literal colors are resolved directly rather than linked through variables.
    Object.assign(cssData, resolveThemeColorCss(name, mcColorObj, theme, targetDepths));
  }
  return cssData;
};

import type { Theme } from '@unocss/preset-wind4';
import type { Rule, RuleContext } from 'unocss';
import type { MagicColorContext } from '../typing';
import { hasDarkVariant, resolveBodyColor } from '@unocss-preset-magicolor/utils';
import { resolveMixtureColorConfig } from '../utils/color-config';
import { resolveColorReferences } from '../utils/color-references';
import { parseColorVariableDefinition } from '../utils/color-variable';
import { resolveThemeColorCss } from '../utils/theme-colors';

/** Creates `mc-name_source` rules that define reusable magic color variables. */
export function createColorVariable(context?: MagicColorContext): Rule[] {
  return [
    [/^mc-(?!lr(?:-|$))(.+)$/, (match, ctx) => resolveMagicColor(match, ctx, context)],
  ];
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
  const sourceConfig = resolveMixtureColorConfig(mcColorObj.originColor, theme, context, hasDarkVariant(ctx.rawSelector));
  if (sourceConfig.color) {
    const { css, depthMap } = resolveColorReferences({
      name,
      colorParts: mcColorObj,
      depths: context?.usage.getColorVariableTargetDepths(name),
    });
    context?.usage.recordColorVariableSourceUsage(ctx.rawSelector, depthMap);
    return css;
  }
  // Arbitrary or literal colors are resolved directly rather than linked through variables.
  return resolveThemeColorCss(name, mcColorObj, theme, context?.usage.getColorVariableTargetDepths(name));
};

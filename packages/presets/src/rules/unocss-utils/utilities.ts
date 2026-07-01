import type { Theme } from '@unocss/preset-wind4';
import type { CSSValueInput, RuleContext } from 'unocss';
import type { MagicColorContext } from '../../typing';
import { isInvalidColor, resolveBodyColor, resolveSpecialColor } from '@unocss-preset-magicolor/utils';
import { colorCSSGenerator, parseColor } from '@unocss/preset-wind4/utils';
import { createTargetColorVariableName, toVar } from '../../utils/color-variable';
import { resolveThemeColorValue } from '../../utils/theme-colors';

/** Parses a magic color token body and records the usage needed for preflight variables. */
export function parseMagicColor(body: string, ctx: RuleContext<Theme>, context?: MagicColorContext) {
  const colorData = parseColor(body, ctx.theme);
  if (!colorData) {
    return;
  }

  const colorParts = resolveBodyColor(body);
  const { originColor, originDepth } = colorParts;

  // invalid color
  if (isInvalidColor(originColor)) {
    return;
  }
  // Preserve UnoCSS parser metadata while replacing the color name/depth with magic-color parts.
  colorData.name = originColor;
  colorData.no = originDepth;
  context?.usage.recordColorVariableTargetUsage(ctx.rawSelector, `mc-${body}`);

  const specialColor = resolveSpecialColor(originColor);
  if (specialColor) {
    colorData.color = specialColor;
    return colorData;
  }

  // Names used by `mc-*` definitions, global options, and theme colors are
  // resolved through variables emitted by the definition class or preflight.
  const usage = context?.usage.getColorVariableTargetDepths(originColor);
  if (usage) {
    colorData.color = toVar(createTargetColorVariableName(originColor, originDepth));
  }
  // If UnoCSS already resolved the token, keep its parsed value and metadata.
  if (colorData.color) {
    return colorData;
  }
  // Fall back to a generated theme depth when the token was not a standard theme color.
  colorData.color = resolveThemeColorValue(colorParts, ctx.theme) ?? '';

  return colorData;
}

/** Creates a rule resolver that pipes magic-color parsing into UnoCSS color CSS output. */
export function mcColorResolver(property: string, varName: string, context?: MagicColorContext) {
  return ([, body]: string[], ctx: RuleContext<Theme>): (CSSValueInput | string)[] | undefined => {
    const colorData = parseMagicColor(body ?? '', ctx, context);
    if (colorData?.color) {
      return colorCSSGenerator(colorData, property, varName, ctx);
    }
  };
};

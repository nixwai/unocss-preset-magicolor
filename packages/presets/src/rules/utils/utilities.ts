import type { Theme } from '@unocss/preset-wind4';
import type { CSSValueInput, RuleContext } from 'unocss';
import type { MagicColorContext } from '../../typing';
import { isInvalidColor, resolveBodyColor, resolveSpecialColor } from '@unocss-preset-magicolor/utils';
import { colorCSSGenerator, parseColor } from '@unocss/preset-wind4/utils';
import { generateColorName } from '../../utils/color-variable';
import { resolveThemeColorValue } from '../../utils/theme-colors';

export function parseMagicColor(body: string, ctx: RuleContext<Theme>, context?: MagicColorContext) {
  const colorData = parseColor(body, ctx.theme);
  if (!colorData) {
    return;
  }

  const colorParts = resolveBodyColor(body);
  const { originColor, bodyNo } = colorParts;

  // invalid color
  if (isInvalidColor(originColor)) {
    return;
  }
  colorData.name = originColor;
  colorData.no = bodyNo;
  context?.usage.recordUsage(`mc-${body}`, ctx.rawSelector);

  const specialColor = resolveSpecialColor(originColor);
  if (specialColor) {
    colorData.color = specialColor;
    return colorData;
  }

  // Names used by `mc-*` definitions, global options, and theme colors are
  // resolved through variables emitted by the definition class or preflight.
  const usage = context?.usage.getUsage(originColor);
  if (usage) {
    colorData.color = `var(${generateColorName(originColor, bodyNo)})`;
  }
  // use unocss parseColor
  if (colorData.color) {
    return colorData;
  }
  // resolve color
  colorData.color = resolveThemeColorValue(colorParts, ctx.theme) ?? '';

  return colorData;
}

export function mcColorResolver(property: string, varName: string, context?: MagicColorContext) {
  return ([, body]: string[], ctx: RuleContext<Theme>): (CSSValueInput | string)[] | undefined => {
    const colorData = parseMagicColor(body ?? '', ctx, context);
    if (colorData?.color) {
      return colorCSSGenerator(colorData, property, varName, ctx);
    }
  };
};

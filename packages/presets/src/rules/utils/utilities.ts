import type { Theme } from '@unocss/preset-wind4';
import type { CSSValueInput, RuleContext } from 'unocss';
import type { MagicColorContext } from '../../typing';
import { isInvalidColor, resolveColorParts, splitColorParts } from '@unocss-preset-magicolor/utils';
import { colorCSSGenerator, parseColor, parseCssColor } from '@unocss/preset-wind4/utils';
import { resolveThemeColorValue } from './theme-colors';

type ParseColorReturn = ReturnType<typeof parseColor>;

export function parseMagicColor(body: string, ctx: RuleContext<Theme>, context?: MagicColorContext): ParseColorReturn {
  const [bodyColor, bodyOpacity, bodyModifier] = splitColorParts(body);
  const colorParts = resolveColorParts(bodyColor);
  const { originColor, bodyNo } = colorParts;

  const resolvedColorData: NonNullable<ParseColorReturn> = {
    opacity: bodyOpacity,
    modifier: bodyModifier,
    name: originColor,
    no: bodyNo,
    color: '',
    alpha: bodyOpacity && `${bodyOpacity}%`,
    keys: undefined,
    get cssColor() {
      return parseCssColor(this.color);
    },
  };

  // invalid color
  if (isInvalidColor(originColor)) {
    return resolvedColorData;
  }

  context?.usage.recordUsage(`mc-${body}`, ctx.rawSelector);

  // Names used by `mc-*` definitions, global options, and theme colors are
  // resolved through variables emitted by the definition class or preflight.
  const usage = context?.usage.getUsage(originColor);
  if (usage) {
    resolvedColorData.color = bodyNo ? `var(--mc-${originColor}-${bodyNo}-color)` : `var(--mc-${originColor}-color)`;
    return resolvedColorData;
  }

  // use unocss parseColor
  const colorData = parseColor(body, ctx.theme);
  if (colorData?.color) {
    return colorData;
  }

  // resolve color
  resolvedColorData.color = resolveThemeColorValue(colorParts, ctx.theme) ?? '';

  return resolvedColorData;
}

export function mcColorResolver(property: string, varName: string, context?: MagicColorContext) {
  return ([, body]: string[], ctx: RuleContext<Theme>): (CSSValueInput | string)[] | undefined => {
    const colorData = parseMagicColor(body ?? '', ctx, context);
    if (colorData?.color) {
      return colorCSSGenerator(colorData, property, varName, ctx);
    }
  };
};

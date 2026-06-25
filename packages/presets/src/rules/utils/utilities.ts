import type { Theme } from '@unocss/preset-wind4';
import type { CSSValueInput, RuleContext } from 'unocss';
import type { MagicColorContext } from '../../usage';
import { colorCSSGenerator, parseColor } from '@unocss/preset-wind4/utils';
import { isInvalidColor, resolveDepth } from '../../utils';
import { resolveThemeColorValue } from './theme-colors';

type ParseColorReturn = ReturnType<typeof parseColor>;

export function parseMagicColor(body: string, theme: Theme, context?: MagicColorContext): ParseColorReturn {
  const [bodyColor, bodyOpacity, bodyModifier] = body.split(/[:/]/);
  const bodyNo = bodyColor.match(/.*-(\d+)/)?.[1];
  const originColor = bodyColor?.split(/-\d+-?/)[0];

  const resolvedColorData: NonNullable<ParseColorReturn> = {
    opacity: bodyOpacity,
    modifier: bodyModifier,
    name: originColor,
    no: bodyNo,
    color: '',
    alpha: bodyOpacity && `${bodyOpacity}%`,
    keys: undefined,
    cssColor: undefined,
  };

  // invalid color
  if (isInvalidColor(originColor)) {
    return resolvedColorData;
  }

  // Names used by `mc-*` definitions, global options, and theme colors are
  // resolved through variables emitted by the definition class or preflight.
  const usage = context?.getUsage(originColor);
  if (usage) {
    resolvedColorData.color = bodyNo ? `var(--mc-${originColor}-${resolveDepth(bodyNo).originDepth}-color)` : `var(--mc-${originColor}-color)`;
    return resolvedColorData;
  }

  // use unocss parseColor
  const colorData = parseColor(body, theme);
  if (colorData?.color) {
    return colorData;
  }

  // resolve color
  resolvedColorData.color = resolveThemeColorValue(bodyColor, theme) ?? '';

  return resolvedColorData;
}

export function mcColorResolver(property: string, varName: string, context?: MagicColorContext) {
  return ([, body]: string[], ctx: RuleContext<Theme>): (CSSValueInput | string)[] | undefined => {
    const colorData = parseMagicColor(body ?? '', ctx.theme, context);
    if (colorData?.color) {
      return colorCSSGenerator(colorData, property, varName, ctx);
    }
  };
};

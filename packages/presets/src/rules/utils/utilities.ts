import type { Theme } from '@unocss/preset-wind4';
import type { CSSObject, CSSValueInput, RuleContext } from 'unocss';
import type { MagicColorContext } from '../../usage';
import { colorCSSGenerator, parseColor } from '@unocss/preset-wind4/utils';
import { isInvalidColor, resolveDepth } from '../../utils';
import { resolveThemeColorValue } from './theme-colors';

type ParseColorReturn = ReturnType<typeof parseColor>;

interface ParseMagicColorResult {
  colorData: ParseColorReturn
  cssVariables: CSSObject[]
}

function isVariableColorName(name?: string) {
  return Boolean(name && !name.includes('[') && !name.includes(']'));
}

function resolveColorData(body: string, theme: Theme, context?: MagicColorContext): ParseColorReturn {
  const colorData = parseColor(body, theme);
  const [bodyColor, bodyOpacity, bodyModifier] = body.split(/[:/]/);
  const bodyNo = bodyColor.match(/.*-(\d+)/)?.[1];
  const originColor = bodyColor?.split(/-\d+-?/)[0];

  if (!isVariableColorName(originColor)) {
    return resolveDirectColorData(body, theme);
  }

  // Names used by `mc-*` definitions, global options, and theme colors are
  // resolved through variables emitted by the definition class or preflight.
  if (context?.getUsage(originColor)) {
    return {
      ...(colorData ?? {}),
      opacity: bodyOpacity,
      modifier: bodyModifier,
      name: originColor,
      no: bodyNo,
      color: bodyNo ? `var(--mc-${originColor}-${resolveDepth(bodyNo).originDepth}-color)` : `var(--mc-${originColor}-color)`,
      alpha: bodyOpacity && `${bodyOpacity}%`,
      keys: undefined,
      cssColor: undefined,
    };
  }

  return resolveDirectColorData(body, theme);
}

function resolveDirectColorData(body: string, theme: Theme): ParseColorReturn {
  const colorData = parseColor(body, theme);
  if (colorData?.color) {
    return colorData;
  }

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

  resolvedColorData.color = resolveThemeColorValue(body, theme) ?? '';

  return resolvedColorData;
}

export function parseMagicColor(body: string, theme: Theme, context?: MagicColorContext): ParseMagicColorResult {
  return { colorData: resolveColorData(body, theme, context), cssVariables: [] };
};

export function mcColorResolver(property: string, varName: string, context?: MagicColorContext) {
  return ([, body]: string[], ctx: RuleContext<Theme>): (CSSValueInput | string)[] | undefined => {
    const { colorData, cssVariables } = parseMagicColor(body ?? '', ctx.theme, context);
    if (colorData?.color) {
      const result = colorCSSGenerator(colorData, property, varName, ctx);
      if (result && cssVariables.length) {
        result.push(...cssVariables.map(item => ({
          [ctx.symbols.selector]: (selector: symbol) => selector,
          ...item,
        })));
      }
      return result;
    }
  };
};

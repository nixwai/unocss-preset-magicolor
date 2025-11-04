import type { Theme } from '@unocss/preset-wind4';
import type { CSSValueInput, RuleContext } from 'unocss';
import type { ThemeKey } from '../typing';
import { colorCSSGenerator, parseColor } from '@unocss/preset-wind4/utils';
import { formatHex } from 'culori';
import { mc } from 'magic-color';
import { toNum, toOklch } from './transforms';

type ParseColorReturn = ReturnType<typeof parseColor>;

export const themeMetaList: ThemeKey[] = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

export function resolveDepth(no: string) {
// origin depth
  let originDepth = Number(no);
  originDepth = originDepth <= 50 ? 50 : originDepth;
  originDepth = originDepth >= 950 ? 950 : originDepth;
  // get before depth, can not be less than 50
  let beforeDepth = Math.floor(originDepth / 100) * 100;
  beforeDepth = beforeDepth <= 50 ? 50 : beforeDepth;
  // get after depth, can not be greater than 950
  let afterDepth = Math.floor((originDepth + 100) / 100) * 100;
  afterDepth = afterDepth >= 950 ? 950 : afterDepth;
  return { originDepth, beforeDepth, afterDepth };
}

export function parseMagicColor(body: string, theme: Theme): ParseColorReturn {
  const colorData = parseColor(body, theme);

  // already a configured color in the theme
  if (colorData?.color) {
    return colorData;
  }

  const [bodyColor, bodyOpacity, bodyModifier] = body.split(/[:/]/);
  const bodyNo = bodyColor.match(/.*-(\d+)/)?.[1];
  const originColor = bodyColor?.split(/-\d+-?/)[0];

  const parsedColor: ParseColorReturn = {
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
  if (!originColor || !Number.isNaN(Number(originColor))) {
    console.error(`[unocss-preset-margicolor][mc-${body}] The color '${originColor}' is invalid.`);
    return parsedColor;
  }

  if (!bodyNo) {
    return parsedColor;
  }

  const { originDepth, beforeDepth, afterDepth } = resolveDepth(bodyNo);
  let beforeParsedColor = parseColor(`${originColor}-${beforeDepth}`, theme)?.cssColor;
  let afterParsedColor = parseColor(`${originColor}-${afterDepth}`, theme)?.cssColor;

  // parse depth colors fail, obtain it through mc.theme
  if (!beforeParsedColor || !afterParsedColor) {
    try {
      const parsedOriginColor = parseColor(originColor, theme)?.color;
      // mc can not parse oklch, so need to convert to hex
      const customColor = parsedOriginColor ? formatHex(parsedOriginColor) : undefined;
      if (customColor && mc.valid(customColor)) {
        const themeColor = mc.theme(customColor);
        if (!beforeParsedColor) {
          beforeParsedColor = toOklch({ type: 'hex', components: [themeColor[beforeDepth as ThemeKey]], alpha: 1 });
        }
        if (!afterParsedColor) {
          afterParsedColor = toOklch({ type: 'hex', components: [themeColor[afterDepth as ThemeKey]], alpha: 1 });
        }
      }
    }
    catch (e) {
      console.error(`[unocss-preset-margicolor] Error parsing ${body}: get ${originColor} theme fail, please use another color.`);
      console.error(e);
    }
  }

  // uniform use oklch
  beforeParsedColor = toOklch(beforeParsedColor);
  afterParsedColor = toOklch(afterParsedColor);

  if (!beforeParsedColor || !afterParsedColor) { return parsedColor; } // invalid color

  const transitionRatio = (originDepth - beforeDepth) / ((originDepth < 100 || originDepth > 950) ? 50 : 100);
  const resultColor = Array.from({ length: 3 }).map((_, i) => {
    const beforeComponents = beforeParsedColor.components;
    const afterComponents = afterParsedColor.components;
    const value = toNum(beforeComponents[i]) + (toNum(afterComponents[i]) - toNum(beforeComponents[i])) * transitionRatio;
    return `${Math.round(value * 1000) / 1000}`;
  });

  // reassemble the color
  parsedColor.color = `oklch(${resultColor.join(' ')})`;

  return parsedColor;
};

export function mcColorResolver(property: string, varName: string) {
  return ([, body]: string[], ctx: RuleContext<Theme>): (CSSValueInput | string)[] | undefined => {
    const data = parseMagicColor(body ?? '', ctx.theme);
    if (data?.color) {
      return colorCSSGenerator(data, property, varName, ctx);
    }
  };
};

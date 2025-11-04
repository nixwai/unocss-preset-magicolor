import type { Theme } from '@unocss/preset-wind4';
import type { CSSValueInput, RuleContext } from 'unocss';
import type { ThemeKey } from '../typing';
import { colorCSSGenerator, parseColor } from '@unocss/preset-wind4/utils';
import { formatHex } from 'culori';
import { mc } from 'magic-color';
import { toNum, toOklch } from './transforms';

export function parseMagicColor(body: string, theme: Theme): ReturnType<typeof parseColor> {
  const colorData = parseColor(body, theme);
  // already a configured color in the theme
  if (colorData?.color) {
    return colorData;
  }

  const [bodyColor, bodyOpacity, bodyModifier] = body.split(/[:/]/);
  const bodyNo = bodyColor.match(/.*-(\d+)/)?.[1];
  const originColor = bodyColor?.split(/-\d+-?/)[0]?.replace(/^\[(.*)\]$/, '$1').replace('_', ' ');

  const parsedColor: ReturnType<typeof parseColor> = {
    opacity: bodyOpacity,
    modifier: bodyModifier,
    name: originColor,
    no: bodyNo,
    color: '',
    alpha: bodyOpacity && `${bodyOpacity}%`,
    keys: undefined,
    cssColor: undefined,
  };

  if (!bodyNo || !originColor || !Number.isNaN(Number(originColor))) { return parsedColor; } // invalid color

  // origin depth
  const originDepth = Number(bodyNo);
  // get before depth, can not be less than 50
  let beforeDepth = Math.floor(originDepth / 100) * 100;
  beforeDepth = beforeDepth <= 50 ? 50 : beforeDepth;
  // get after depth, can not be greater than 950
  let afterDepth = Math.floor((originDepth + 100) / 100) * 100;
  afterDepth = afterDepth >= 950 ? 950 : afterDepth;

  let beforeParsedColor = parseColor(`${originColor}-${beforeDepth}`, theme)?.cssColor;
  let afterParsedColor = parseColor(`${originColor}-${afterDepth}`, theme)?.cssColor;

  // parse depth colors fail, obtain it through mc.theme
  if (!beforeParsedColor || !afterParsedColor) {
    try {
      const parsedOriginColor = parseColor(originColor, theme)?.color;
      // mc can not parse oklch, so need to convert to hex
      const customColor = parsedOriginColor ? formatHex(parsedOriginColor) : originColor;

      if (!customColor || !mc.valid(customColor)) { return parsedColor; }
      const themeColor = mc.theme(customColor);

      if (!beforeParsedColor) {
        beforeParsedColor = toOklch({ type: 'hex', components: [themeColor[beforeDepth as ThemeKey]], alpha: 1 });
      }
      if (!afterParsedColor) {
        afterParsedColor = toOklch({ type: 'hex', components: [themeColor[afterDepth as ThemeKey]], alpha: 1 });
      }
    }
    catch (e) {
      console.error(`Error parsing ${body}: ${originColor}, please use other color.`);
      console.error(e);
    }
  }

  // uniform use oklch
  beforeParsedColor = toOklch(beforeParsedColor);
  afterParsedColor = toOklch(afterParsedColor);

  if (!beforeParsedColor || !afterParsedColor) { return; } // invalid color

  const transitionRatio = (originDepth - beforeDepth) / 100;
  const resultColor = Array.from({ length: 3 }).map((_, i) => {
    const beforeComponents = beforeParsedColor.components;
    const afterComponents = afterParsedColor.components;
    const value = toNum(beforeComponents[i]) + (toNum(afterComponents[i]) - toNum(beforeComponents[i])) * transitionRatio;
    return `${Math.round(value * 1000) / 1000}`;
  });

  // reassemble the colors
  return {
    ...parsedColor,
    color: `oklch(${resultColor.join(' ')})`,
    cssColor: { type: 'oklch', components: resultColor, alpha: bodyOpacity && `${bodyOpacity}%` },
  };
};

export function mcColorResolver(property: string, varName: string) {
  return ([, body]: string[], ctx: RuleContext<Theme>): (CSSValueInput | string)[] | undefined => {
    const data = parseMagicColor(body ?? '', ctx.theme);
    if (!data?.color) { return; }
    return colorCSSGenerator(data, property, varName, ctx);
  };
};

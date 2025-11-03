import type { Theme } from '@unocss/preset-wind4';
import type { ThemeMetas } from 'magic-color';
import type { CSSValueInput, RuleContext } from 'unocss';
import { colorCSSGenerator, parseColor } from '@unocss/preset-wind4/utils';
import { formatHex } from 'culori';
import { mc } from 'magic-color';
import { toNum, toOklch } from './transforms';

export function parseMagicColor(body: string, theme: Theme): ReturnType<typeof parseColor> | undefined {
  const colorData = parseColor(body, theme);
  // already a configured color in the theme
  if (colorData?.color) {
    return colorData;
  }

  const [bodyColor, bodyOpacity, bodyModifier] = body.split(/[:/]/);

  const bodyNo = bodyColor.match(/.*-(\d+)/)?.[1];

  if (!bodyNo) { return; } // invalid color

  const originColor = bodyColor?.split(/-\d+-?/)[0]?.replace(/^\[(.*)\]$/, '$1').replace('_', ' ');

  if (!originColor || !Number.isNaN(Number(originColor))) { return; } // invalid color

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

      if (!customColor || !mc.valid(customColor)) { return; }
      const themeColor = mc.theme(customColor);

      if (!beforeParsedColor) {
        beforeParsedColor = toOklch({ type: 'hex', components: [themeColor[beforeDepth as keyof ThemeMetas]], alpha: 1 });
      }
      if (!afterParsedColor) {
        afterParsedColor = toOklch({ type: 'hex', components: [themeColor[afterDepth as keyof ThemeMetas]], alpha: 1 });
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
  resultColor[0] += '%';
  // reassemble the colors
  return {
    opacity: bodyOpacity,
    modifier: bodyModifier,
    name: originColor,
    no: bodyNo,
    color: `oklch(${resultColor.join(' ')})`,
    alpha: bodyOpacity && `${bodyOpacity}%`,
    keys: undefined,
    cssColor: { type: 'oklch', components: resultColor, alpha: bodyOpacity && `${bodyOpacity}%` },
  };
};

// from https://github.com/unocss/unocss/blob/main/packages-presets/preset-wind4/src/utils/utilities.ts#L293
export function mcColorResolver(property: string, varName: string) {
  return ([, body]: string[], ctx: RuleContext<Theme>): (CSSValueInput | string)[] | undefined => {
    const data = parseMagicColor(body ?? '', ctx.theme);
    if (!data) { return; }
    return colorCSSGenerator(data, property, varName, ctx);
  };
};

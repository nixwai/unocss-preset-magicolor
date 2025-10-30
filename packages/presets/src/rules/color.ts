import type { ThemeMetas } from 'magic-color';
import type { RuleContext } from 'unocss';
import type { CustomRule } from '../typing';
import { mc } from 'magic-color';
import { parseColor, type Theme } from 'unocss/preset-mini';

export const color: CustomRule[] = [
  [/^(?:text-color|text|color|c)-mc-(.+)$/, ([, str]: string[], ctx: RuleContext<Theme>) => {
    const [color] = str.split(/[:/]/);
    const depth = color.match(/.*-(\d+)/)?.[1];
    const { theme } = ctx;

    const parsedColor = parseColor(color, theme);
    // already a configured color in the theme
    if (parsedColor?.color) {
      return { color: parsedColor.color };
    }
    // no depth
    if (!depth) { return; }

    const originColor = color.split(/-\d+-?/)[0]?.replace(/[[\]]/g, '');

    if (!originColor || !Number.isNaN(Number(originColor))) { return; } // invalid color

    // origin depth
    const originDepth = Number(depth);
    // get before depth, can not be less than 50
    let beforeDepth = Math.floor(originDepth / 100) * 100;
    beforeDepth = beforeDepth <= 50 ? 50 : beforeDepth;
    // get after depth, can not be greater than 950
    let afterDepth = Math.floor((originDepth + 100) / 100) * 100;
    afterDepth = afterDepth >= 950 ? 950 : afterDepth;

    let beforeParsedColor = parseColor(`${originColor}-${beforeDepth}`, theme)?.color;
    let afterParsedColor = parseColor(`${originColor}-${afterDepth}`, theme)?.color;

    // parse colors fail, obtain it through mc.theme
    if (!beforeParsedColor || !afterParsedColor) {
      const customColor = parseColor(originColor, theme)?.color || originColor;
      if (!mc.valid(customColor)) { return; }
      const themeColor = mc.theme(customColor);
      if (!beforeParsedColor) {
        beforeParsedColor = themeColor[beforeDepth as keyof ThemeMetas];
      }
      if (!afterParsedColor) {
        afterParsedColor = themeColor[afterDepth as keyof ThemeMetas];
      }
    }

    if (!mc.valid(beforeParsedColor) || !mc.valid(afterParsedColor)) { return; }

    // get the before and after depth color
    const beforeDepthColor = mc(beforeParsedColor).toHsl().values;
    const afterDepthColor = mc(afterParsedColor).toHsl().values;
    const transitionRatio = (originDepth - beforeDepth) / 100;
    const resultColor = Array.from({ length: 3 }).map((_, i) => {
      const value = beforeDepthColor[i] + (afterDepthColor[i] - beforeDepthColor[i]) * transitionRatio;
      return Math.round(value * 100) / 100;
    });

    return { color: `hsl(${resultColor[0]}deg ${resultColor[1]}% ${resultColor[2]}%)` };
  }],
];

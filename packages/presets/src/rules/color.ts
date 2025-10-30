import type { RuleContext } from 'unocss';
import type { CustomRule } from '../typing';
import { mc } from 'magic-color';
import { parseColor, type Theme } from 'unocss/preset-mini';

export const color: CustomRule[] = [
  [/^(?:text-color|text|color|c)-mc-(.+)$/, ([, str]: string[], ctx: RuleContext<Theme>) => {
    const [color] = str.split(/[:/]/);
    const depth = color.match(/.*-(\d+)/)?.[1];
    const { theme } = ctx;

    // already a configured color in the theme,
    const parsedColor = parseColor(color, theme);
    if (parsedColor?.color) {
      return { color: parsedColor.color };
    }

    if (!depth) { return; }

    const originColor = color.split(/-\d+-?/)[0];

    if (!originColor || !Number.isNaN(Number(originColor))) { return; } // invalid color
    // origin depth
    const originDepth = Number(depth);
    // get before depth, can not be less than 50
    let beforeDepth = Math.floor(originDepth / 100) * 100;
    beforeDepth = beforeDepth <= 50 ? 50 : beforeDepth;
    // get after depth, can not be greater than 950
    let afterDepth = Math.floor((originDepth + 100) / 100) * 100;
    afterDepth = afterDepth >= 950 ? 950 : afterDepth;

    const beforeParsedColor = parseColor(`${originColor}-${beforeDepth}`, theme);
    const afterParsedColor = parseColor(`${originColor}-${afterDepth}`, theme);

    // the color does not exist
    if (!beforeParsedColor?.color || !afterParsedColor?.color) { return; }
    if (!mc.valid(beforeParsedColor.color) || !mc.valid(afterParsedColor.color)) { return; }
    // get the before and after depth color
    const beforeDepthColor = mc(beforeParsedColor.color).toHsl().values;
    const afterDepthColor = mc(afterParsedColor.color).toHsl().values;
    const transitionRatio = (originDepth - beforeDepth) / 100;
    const resultColor = Array.from({ length: 3 }).map((_, i) => {
      const value = beforeDepthColor[i] + (afterDepthColor[i] - beforeDepthColor[i]) * transitionRatio;
      return Math.round(value * 100) / 100;
    });

    return { color: `hsl(${resultColor[0]}deg ${resultColor[1]}% ${resultColor[2]}%)` };
  }],
];

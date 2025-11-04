import type { Theme } from '@unocss/preset-wind4';
import type { CSSColorValue } from '@unocss/preset-wind4/utils';
import type { CSSObject, Rule, RuleContext } from 'unocss';
import type { ThemeKey } from '../typing';
import { parseColor } from '@unocss/preset-wind4/utils';
import { formatHex } from 'culori';
import { mc } from 'magic-color';
import { toNum, toOklch } from '../utils';

export const colorVariable: Rule[] = [
  [/^mc-(.+)$/, resolveMagicColor],
];

const themeMetaList: ThemeKey[] = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

function resolveMagicColor([, body]: string[], { theme }: RuleContext<Theme>) {
  const css: CSSObject = {};

  // Use "_" to separate name、 color
  const [name, hue] = body.split('_');

  const [bodyColor] = hue.split(/[:/]/);
  const bodyNo = bodyColor.match(/.*-(\d+)/)?.[1];
  const originColor = bodyColor?.split(/-\d+-?/)[0]?.replace(/^\[(.*)\]$/, '$1').replace('_', ' ');

  const themeMetaColors: Partial<Record<ThemeKey, CSSColorValue>> = {};
  let hasEmptyColor = false;

  // give priority to using the colors configured by the theme
  for (const themeMeta of themeMetaList) {
    const cssColor = parseColor(`${originColor}-${themeMeta}`, theme)?.cssColor;
    if (cssColor) {
      themeMetaColors[themeMeta] = cssColor;
    }
    else {
      hasEmptyColor = true;
    }
  }

  // use 'mc.theme' to supplement the colors
  if (hasEmptyColor) {
    try {
      const parsedOriginColor = parseColor(originColor, theme)?.color;
      // mc can not parse oklch, so need to convert to hex
      const customColor = parsedOriginColor ? formatHex(parsedOriginColor) : originColor;
      if (customColor && mc.valid(customColor)) {
        const themeColor = mc.theme(customColor);
        for (const themeMeta of themeMetaList) {
          if (!themeMetaColors[themeMeta]) {
            const cssColor = toOklch({ type: 'hex', components: [themeColor[themeMeta]], alpha: 1 });
            themeMetaColors[themeMeta] = cssColor;
          }
        }
      }
    }
    catch (e) {
      console.error(`Error parsing ${body}: ${originColor}, please use other color.`);
      console.error(e);
    }
  }

  // uniform use oklch
  for (const themeMeta of themeMetaList) {
    themeMetaColors[themeMeta] = toOklch(themeMetaColors[themeMeta]);
  }

  // count body color
  const colorData = parseColor(bodyColor, theme);
  if (colorData?.color) {
    css[`--mc-${name}-color`] = colorData.color;
  }
  else {
    // origin depth
    const originDepth = Number(bodyNo);
    // get before depth, can not be less than 50
    let beforeDepth = Math.floor(originDepth / 100) * 100;
    beforeDepth = beforeDepth <= 50 ? 50 : beforeDepth;
    // get after depth, can not be greater than 950
    let afterDepth = Math.floor((originDepth + 100) / 100) * 100;
    afterDepth = afterDepth >= 950 ? 950 : afterDepth;
    if (themeMetaColors[beforeDepth as ThemeKey] && themeMetaColors[afterDepth as ThemeKey]) {
      const transitionRatio = (originDepth - beforeDepth) / 100;
      const resultColor = Array.from({ length: 3 }).map((_, i) => {
        const beforeComponents = themeMetaColors[beforeDepth as ThemeKey]!.components;
        const afterComponents = themeMetaColors[afterDepth as ThemeKey]!.components;
        const value = toNum(beforeComponents[i]) + (toNum(afterComponents[i]) - toNum(beforeComponents[i])) * transitionRatio;
        return `${Math.round(value * 1000) / 1000}`;
      });
      css[`--mc-${name}-color`] = `oklch(${resultColor.join(' ')})`;
    }
  }

  // count all depth colors
  for (const themeMeta of themeMetaList) {
    if (themeMetaColors[themeMeta]) {
      const colorComponents = themeMetaColors[themeMeta].components;
      css[`--mc-${name}-${themeMeta}-l`] = Math.round(toNum(colorComponents[0]) * 1000) / 1000;
      css[`--mc-${name}-${themeMeta}-c`] = Math.round(toNum(colorComponents[1]) * 1000) / 1000;
      css[`--mc-${name}-${themeMeta}-h`] = Math.round(toNum(colorComponents[2]) * 1000) / 1000;
    }
  }

  return css;
};

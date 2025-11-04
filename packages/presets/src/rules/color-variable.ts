import type { Theme } from '@unocss/preset-wind4';
import type { CSSColorValue } from '@unocss/preset-wind4/utils';
import type { CSSObject, Rule, RuleContext } from 'unocss';
import type { ThemeKey } from '../typing';
import { parseColor } from '@unocss/preset-wind4/utils';
import { formatHex } from 'culori';
import { mc } from 'magic-color';
import { resolveDepth, themeMetaList, toNum, toOklch } from '../utils';

export const colorVariable: Rule[] = [
  [/^mc-(.+)$/, resolveMagicColor],
];

function resolveMagicColor([, body]: string[], { theme }: RuleContext<Theme>) {
  const css: CSSObject = {};

  // Use "_" to separate name、 color
  const [name, hue] = body.split('_');

  if (!hue) {
    return;
  }

  // can not use the color name configured by the theme
  if (parseColor(name, theme)?.color) {
    console.error(`[unocss-preset-margicolor][mc-${body}] The color name '${name}' has been configured in the theme, please use the another name.`);
    return;
  }

  const [bodyColor] = hue.split(/[:/]/);
  const bodyNo = bodyColor.match(/.*-(\d+)/)?.[1];
  const originColor = bodyColor?.split(/-\d+-?/)[0];

  // invalid color
  if (!originColor || !Number.isNaN(Number(originColor))) {
    console.error(`[unocss-preset-margicolor][mc-${body}] The color '${originColor}' is invalid.`);
    return;
  }

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
      const customColor = parsedOriginColor ? formatHex(parsedOriginColor) : undefined;
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
      console.error(`[unocss-preset-margicolor] Error parsing ${body}: get ${originColor} theme fail, please use another color.`);
      console.error(e);
    }
  }

  // uniform use oklch
  for (const themeMeta of themeMetaList) {
    themeMetaColors[themeMeta] = toOklch(themeMetaColors[themeMeta]);
  }

  // set body color
  const colorData = parseColor(bodyColor, theme);
  if (colorData?.color) {
    css[`--mc-${name}-color`] = colorData.color;
  }
  else if (bodyNo) {
    const { originDepth, beforeDepth, afterDepth } = resolveDepth(bodyNo);
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

  // set all depth colors
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

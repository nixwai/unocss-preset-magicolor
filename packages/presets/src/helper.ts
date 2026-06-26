import type { CSSColorValue } from '@unocss/preset-wind4/utils';
import type { CSSObject } from 'unocss';
import type { ThemeKey } from './typing';
import { mc } from 'magic-color';
import { generateOklchColorVariables, getThemeDepthColor, isInvalidColor, resolveColorDepth, resolveColorOrigin, themeMetaList, toOklch } from './utils';

/**
 * Modify the value of the color variable
 * @param params params Parameter object
 * @param params.name Color name
 * @param params.color Color
 * @param params.dom params.dom Target element, modifying the entire page theme when passing `document.documentElement`
 */
export function updateMagicColor(params: { name: string, color: string, dom?: HTMLElement }) {
  const { name, color, dom } = params;
  if (!dom) {
    return;
  }
  const originColor = resolveColorOrigin(color);
  if (isInvalidColor(originColor)) {
    return;
  }

  const css: CSSObject = {};
  const themeMetaColors: Partial<Record<ThemeKey, CSSColorValue>> = {};
  try {
    if (mc.valid(originColor)) {
      css[`--mc-${name}-color`] = originColor;
      const themeColor = mc.theme(originColor, { type: 'hex' });
      for (const themeMeta of themeMetaList) {
        const cssColor = toOklch({ type: 'hex', components: [themeColor[themeMeta]], alpha: 1 });
        themeMetaColors[themeMeta] = cssColor;
      }
    }
  }
  catch (e) {
    console.error(`[updateMagicColor] get ${originColor} theme fail, please use another color.`);
    console.error(e);
  }

  const bodyNo = resolveColorDepth(color);
  if (bodyNo) {
    const bodyColor = getThemeDepthColor(themeMetaColors, bodyNo);
    if (bodyColor) {
      css[`--mc-${name}-color`] = bodyColor;
    }
  }

  // set all depth colors
  const colorVariables = generateOklchColorVariables(name, themeMetaColors);
  Object.assign(css, colorVariables);

  for (const name in css) {
    css[name] && dom.style.setProperty(name, css[name].toString());
  }
}

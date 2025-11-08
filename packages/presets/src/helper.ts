import type { CSSColorValue } from '@unocss/preset-wind4/utils';
import type { CSSObject } from 'unocss';
import type { ThemeKey } from './typing';
import { formatHex } from 'culori';
import { mc } from 'magic-color';
import { countDiffColor, generateOklchVariable, isInvalidColor, resolveDepth, themeMetaList, toOklch } from './utils';

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
  const originColor = color?.split(/-\d+-?/)[0];
  if (isInvalidColor(originColor)) {
    return;
  }

  const css: CSSObject = {};
  const themeMetaColors: Partial<Record<ThemeKey, CSSColorValue>> = {};
  try {
    // mc can not parse oklch, so need to convert to hex
    const customColor = formatHex(originColor) || originColor;
    if (customColor && mc.valid(customColor)) {
      css[`--mc-${name}-color`] = customColor;
      const themeColor = mc.theme(customColor);
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

  const bodyNo = color.match(/.*-(\d+)/)?.[1];
  if (bodyNo) {
    const { originDepth, beforeDepth, afterDepth } = resolveDepth(bodyNo);
    if (themeMetaColors[beforeDepth] && themeMetaColors[afterDepth]) {
      css[`--mc-${name}-color`] = countDiffColor({
        originDepth,
        beforeDepth,
        beforeComponents: themeMetaColors[beforeDepth].components,
        afterComponents: themeMetaColors[afterDepth].components,
      });
    }
  }

  // set all depth colors
  const colorVariables = generateOklchVariable(name, themeMetaColors);
  Object.assign(css, colorVariables);

  for (const name in css) {
    css[name] && dom.style.setProperty(name, css[name].toString());
  }
}

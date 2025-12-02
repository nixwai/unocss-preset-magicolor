import type { CSSColorValue } from '@unocss/preset-wind4/utils';
import type { Colors, RgbColor } from 'magic-color';
import { mc } from 'magic-color';

/** to number */
export function toNum(value?: string | number) {
  if (!value) { return 0; }
  return Number.parseFloat(value.toString()) || 0;
}

/** to oklch color */
export function toOklch(cssColor?: CSSColorValue) {
  if (!cssColor) { return undefined; }

  if (cssColor.type === 'oklch') {
    // uniform use number
    if (cssColor.components[0].toString().includes('%')) {
      cssColor.components[0] = toNum(cssColor.components[0]) / 100;
    }
    cssColor.components = cssColor.components.map(toNum);
    return cssColor;
  }

  const oklchColor = mc(
    cssColor.type === 'hex'
      ? cssColor.components[0].toString()
      : cssColor.components as RgbColor,
    cssColor.type as keyof Colors,
  ).toOklch().values;

  if (!oklchColor) { return; } // fail

  return {
    type: 'oklch',
    components: [oklchColor[0] / 100, oklchColor[1], oklchColor[2]],
    alpha: cssColor.alpha,
  };
}

/** Math.round(num * 1000) / 1000 */
export function roundNum(num: number) {
  return Math.round(num * 1000) / 1000;
}

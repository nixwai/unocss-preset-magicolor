import type { CSSColorValue } from '@unocss/preset-wind4/utils';
import { converter } from 'culori';

const oklch = converter('oklch');

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

  const colorStr = cssColor.components.join(' ');
  const oklchColor = oklch(cssColor.type === 'hex' ? colorStr : `${cssColor.type}(${colorStr})`);
  if (!oklchColor) { return; } // fail

  return {
    type: 'oklch',
    components: [oklchColor.l, oklchColor.c, oklchColor.h ?? 0],
    alpha: cssColor.alpha,
  };
}

/** Math.round(num * 1000) / 1000 */
export function roundNum(num: number) {
  return Math.round(num * 1000) / 1000;
}

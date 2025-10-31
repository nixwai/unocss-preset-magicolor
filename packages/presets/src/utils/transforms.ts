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
  if (!cssColor || cssColor.type === 'oklch') { return cssColor; }
  const colorStr = cssColor.components.join(' ');
  const oklchColor = oklch(cssColor.type === 'hex' ? colorStr : `${cssColor.type}(${colorStr})`);
  if (!oklchColor) { return; } // fail

  return {
    type: 'oklch',
    components: [oklchColor.l * 100, oklchColor.c, oklchColor.h ?? 0],
    alpha: cssColor.alpha,
  };
}

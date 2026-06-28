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
    let components = cssColor.components;
    if (components.length === 1 && typeof components[0] === 'string') {
      components = components[0].split(/\s*,\s*|\s+/).filter(Boolean);
    }

    if (components.length < 3) {
      return;
    }

    // uniform use number, lightness percentage normalized to 0-1
    const numericComponents = components.map((value, index) =>
      index === 0 && value.toString().includes('%') ? toNum(value) / 100 : toNum(value),
    );

    return { ...cssColor, components: numericComponents };
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

export function notNull<T>(value: T | null | undefined): value is T {
  return value != null;
}

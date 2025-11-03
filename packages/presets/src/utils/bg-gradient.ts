import type { Theme } from '@unocss/preset-wind4';
import type { CSSObject, RuleContext } from 'unocss';
import { defineProperty, detectThemeValue, generateThemeVariable, themeTracking } from '@unocss/preset-wind4/utils';
import { parseMagicColor } from './utilities';

const SpecialColorKey = {
  transparent: 'transparent',
  current: 'currentColor',
  inherit: 'inherit',
};

// from https://github.com/unocss/unocss/blob/main/packages-presets/preset-wind4/src/rules/background.ts#L41
export function mcBgGradientColorResolver() {
  return function* ([, position, body]: string[], { theme }: RuleContext<Theme>) {
    const css: CSSObject = {};
    const data = parseMagicColor(body, theme);

    if (data) {
      const { color, keys, alpha } = data;

      if (color) {
        if (Object.values(SpecialColorKey).includes(color)) {
          css[`--un-gradient-${position}`] = color;
        }
        else {
          css[`--un-${position}-opacity`] = alpha;
          const value = keys ? generateThemeVariable('colors', keys) : color;
          css[`--un-gradient-${position}`] = `color-mix(in oklab, ${value} var(--un-${position}-opacity), transparent)`;

          yield defineProperty(`--un-${position}-opacity`, { syntax: '<percentage>', initialValue: '100%' });
        }

        if (keys) {
          themeTracking(`colors`, keys);
        }
        if (theme) {
          detectThemeValue(color, theme);
        }
      }
    }
  };
}

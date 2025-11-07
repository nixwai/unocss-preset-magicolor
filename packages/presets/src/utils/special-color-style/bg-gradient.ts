import type { Theme } from '@unocss/preset-wind4';
import type { CSSObject, RuleContext } from 'unocss';
import { defineProperty, detectThemeValue, generateThemeVariable, h, themeTracking } from '@unocss/preset-wind4/utils';
import { parseMagicColor } from '../utilities';

const SpecialColorKey = {
  transparent: 'transparent',
  current: 'currentColor',
  inherit: 'inherit',
};

const properties = {
  'gradient-position': defineProperty('--un-gradient-position'),
  'gradient-from': defineProperty('--un-gradient-from', { syntax: '<color>', initialValue: '#0000' }),
  'gradient-via': defineProperty('--un-gradient-via', { syntax: '<color>', initialValue: '#0000' }),
  'gradient-to': defineProperty('--un-gradient-to', { syntax: '<color>', initialValue: '#0000' }),
  'gradient-stops': defineProperty('--un-gradient-stops'),
  'gradient-via-stops': defineProperty('--un-gradient-via-stops'),
  'gradient-from-position': defineProperty('--un-gradient-from-position', { syntax: '<length-percentage>', initialValue: '0%' }),
  'gradient-via-position': defineProperty('--un-gradient-via-position', { syntax: '<length-percentage>', initialValue: '50%' }),
  'gradient-to-position': defineProperty('--un-gradient-to-position', { syntax: '<length-percentage>', initialValue: '100%' }),
};

// from https://github.com/unocss/unocss/blob/main/packages-presets/preset-wind4/src/rules/background.ts#L41
export function mcBgGradientColorResolver() {
  return function* ([, position, body]: string[], { theme, symbols }: RuleContext<Theme>) {
    const css: CSSObject = {};
    const { colorData, cssVariable } = parseMagicColor(body, theme);

    if (colorData) {
      const { color, keys, alpha } = colorData;

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
    else {
      css[`--un-gradient-${position}`] = h.bracket.cssvar(body);
    }
    if (css[`--un-gradient-${position}`]) {
      switch (position) {
        case 'from':
          yield {
            ...css,
            '--un-gradient-stops': 'var(--un-gradient-via-stops, var(--un-gradient-position), var(--un-gradient-from) var(--un-gradient-from-position), var(--un-gradient-to) var(--un-gradient-to-position))',
          };
          break;
        case 'via':
          yield {
            ...css,
            '--un-gradient-via-stops': `var(--un-gradient-position), var(--un-gradient-from) var(--un-gradient-from-position), var(--un-gradient-via) var(--un-gradient-via-position), var(--un-gradient-to) var(--un-gradient-to-position)`,
            '--un-gradient-stops': `var(--un-gradient-via-stops)`,
          };
          break;
        case 'to':
          yield {
            ...css,
            '--un-gradient-stops': 'var(--un-gradient-via-stops, var(--un-gradient-position), var(--un-gradient-from) var(--un-gradient-from-position), var(--un-gradient-to) var(--un-gradient-to-position))',
          };
          break;
        case 'stops':
          yield { ...css };
          break;
      }

      for (const p of Object.values(properties)) { yield p; }

      yield {
        [symbols.selector]: (selector: symbol) => selector,
        ...cssVariable,
      };
    }
  };
}

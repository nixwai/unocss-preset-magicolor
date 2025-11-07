import type { Theme } from '@unocss/preset-wind4';
import type { CSSObject, CSSValueInput, RuleContext } from 'unocss';
import { defineProperty, h, hyphenate, numberResolver, themeTracking } from '@unocss/preset-wind4/utils';
import { mcColorResolver } from '../utilities';

const baseMaskImage = {
  'mask-image': 'var(--un-mask-linear), var(--un-mask-radial), var(--un-mask-conic)',
  'mask-composite': 'intersect',
};

const linearMap: Record<string, string[]> = {
  t: ['top'],
  b: ['bottom'],
  l: ['left'],
  r: ['right'],
  x: ['left', 'right'],
  y: ['top', 'bottom'],
};

const maskInitialValue = 'linear-gradient(#fff, #fff)';

// from https://github.com/unocss/unocss/blob/main/packages-presets/preset-wind4/src/rules/mask.ts
export function handleImage([_, gradient = '', direction, val]: string[], ctx: RuleContext<Theme>) {
  const css: CSSObject = { ...baseMaskImage };
  const props: (CSSValueInput | string)[] = [];

  props.push(...['linear', 'radial', 'conic'].map(g => defineProperty(`--un-mask-${g}`, { initialValue: maskInitialValue })));

  if (gradient in linearMap) {
    css['--un-mask-linear'] = 'var(--un-mask-left), var(--un-mask-right), var(--un-mask-bottom), var(--un-mask-top)';

    for (const dir of linearMap[gradient]) {
      css[`--un-mask-${dir}`] = `linear-gradient(to ${dir}, var(--un-mask-${dir}-from-color) var(--un-mask-${dir}-from-position), var(--un-mask-${dir}-to-color) var(--un-mask-${dir}-to-position))`;

      if (numberResolver(val) != null) {
        themeTracking('spacing');
        css[`--un-mask-${dir}-${direction}-position`] = `calc(var(--spacing) * ${h.bracket.cssvar.fraction.number(val)})`;
      }
      else {
        css[`--un-mask-${dir}-${direction}-position`] = h.bracket.cssvar.fraction.rem(val);
      }

      const result = mcColorResolver(`--un-mask-${dir}-${direction}-color`, hyphenate('colors'))([_, val], ctx);
      if (result) {
        const [c, ...p] = result;
        Object.assign(css, c);
        props.push(...p);
      }

      props.push(...['from', 'to'].flatMap(p => [
        defineProperty(`--un-mask-${dir}-${p}-position`, { syntax: '<length-percentage>', initialValue: p === 'from' ? '0%' : '100%' }),
        defineProperty(`--un-mask-${dir}-${p}-color`, { syntax: '<color>', initialValue: p === 'from' ? 'black' : 'transparent' }),
      ]));
    }

    props.push(...['top', 'right', 'bottom', 'left'].map(d => defineProperty(`--un-mask-${d}`, { initialValue: maskInitialValue })));
  }
  else {
    if (direction == null) {
      if (gradient === 'radial') {
        css['--un-mask-radial'] = 'radial-gradient(var(--un-mask-radial-stops, var(--un-mask-radial-size)))';
        css['--un-mask-radial-size'] = h.bracket.cssvar.rem(val);
      }
      else {
        css[`--un-mask-${gradient}`] = `${gradient}-gradient(var(--un-mask-${gradient}-stops, var(--un-mask-${gradient}-position)))`;
        css[`--un-mask-${gradient}-position`] = numberResolver(val) ? `calc(1deg * ${h.bracket.cssvar.number(val)})` : h.bracket.cssvar.fraction(val);
      }
    }
    else {
      const gradientStopsPrefixMap: Record<string, string> = {
        linear: '',
        radial: 'var(--un-mask-radial-shape) var(--un-mask-radial-size) at ',
        conic: 'from ',
      };
      css[`--un-mask-${gradient}-stops`] = `${gradientStopsPrefixMap[gradient]}var(--un-mask-${gradient}-position), var(--un-mask-${gradient}-from-color) var(--un-mask-${gradient}-from-position), var(--un-mask-${gradient}-to-color) var(--un-mask-${gradient}-to-position)`;
      css[`--un-mask-${gradient}`] = `${gradient}-gradient(var(--un-mask-${gradient}-stops))`;

      const result = mcColorResolver(`--un-mask-${gradient}-${direction}-color`, hyphenate('colors'))([_, val], ctx);
      if (result) {
        const [c, ...p] = result;
        Object.assign(css, c);
        props.push(...p);
      }
    }

    if (gradient === 'radial') {
      props.push(...[
        defineProperty('--un-mask-radial-shape', { initialValue: 'ellipse' }),
        defineProperty('--un-mask-radial-size', { initialValue: 'farthest-corner' }),
      ]);
    }

    props.push(...['from', 'to'].flatMap(p => [
      defineProperty(`--un-mask-${gradient}-position`, { initialValue: gradient === 'radial' ? 'center' : '0deg' }),
      defineProperty(`--un-mask-${gradient}-${p}-position`, { syntax: '<length-percentage>', initialValue: p === 'from' ? '0%' : '100%' }),
      defineProperty(`--un-mask-${gradient}-${p}-color`, { syntax: '<color>', initialValue: p === 'from' ? 'black' : 'transparent' }),
    ]));
  }

  return [css, ...props];
}

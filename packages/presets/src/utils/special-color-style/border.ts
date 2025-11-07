import type { Theme } from '@unocss/preset-wind4';
import type { parseColor } from '@unocss/preset-wind4/utils';
import type { CSSEntries, CSSObject, CSSValueInput, RuleContext } from 'unocss';
import { colorCSSGenerator, SpecialColorKey } from '@unocss/preset-wind4/utils';
import { notNull } from 'unocss';
import { parseMagicColor } from '../utilities';

const directionMap: Record<string, string[]> = {
  'l': ['-left'],
  'r': ['-right'],
  't': ['-top'],
  'b': ['-bottom'],
  's': ['-inline-start'],
  'e': ['-inline-end'],
  // 'x': ['-left', '-right'],
  // 'y': ['-top', '-bottom'],
  'x': ['-inline'],
  'y': ['-block'],
  '': [''],
  'bs': ['-block-start'],
  'be': ['-block-end'],
  'is': ['-inline-start'],
  'ie': ['-inline-end'],
  'block': ['-block-start', '-block-end'],
  'inline': ['-inline-start', '-inline-end'],
};

// from https://github.com/unocss/unocss/blob/main/packages-presets/preset-wind4/src/rules/border.ts#L78
export function mcBorderColorResolver([, a = '', b]: string[], ctx: RuleContext<Theme>): CSSEntries | (CSSValueInput | string)[] | undefined {
  if (a in directionMap) {
    const { colorData, cssVariable } = parseMagicColor(b ?? '', ctx.theme);
    if (colorData) {
      const directions = directionMap[a].map(i => borderColorResolver(i)(colorData, ctx)).filter(notNull);

      return [
        directions
          .map(d => d[0])
          .reduce((acc, item) => {
            // Merge multiple direction CSSObject into one
            Object.assign(acc, item);
            return acc;
          }, {}),
        ...directions.flatMap(d => d.slice(1)),
        {
          [ctx.symbols.selector]: (selector: symbol) => selector,
          ...cssVariable,
        },
      ];
    }
  }
}

function borderColorResolver(direction: string) {
  return (data: ReturnType<typeof parseColor>, ctx: RuleContext<Theme>): [CSSObject, ...CSSValueInput[]] | undefined => {
    const result = colorCSSGenerator(data, `border${direction}-color`, `border${direction}`, ctx);
    if (result) {
      const css = result[0];
      if (
        data?.color && !Object.values(SpecialColorKey).includes(data.color)
        && !data.alpha
        && direction && direction !== ''
      ) {
        css[`--un-border${direction}-opacity`] = `var(--un-border-opacity)`;
      }
      return result;
    }
  };
}

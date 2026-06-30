import type { Theme } from '@unocss/preset-wind4';
import type { parseColor } from '@unocss/preset-wind4/utils';
import type { CSSEntries, CSSObject, CSSValueInput, RuleContext } from 'unocss';
import type { MagicColorContext } from '../../typing';
import { notNull } from '@unocss-preset-magicolor/utils';
import { colorCSSGenerator, h, SpecialColorKey } from '@unocss/preset-wind4/utils';
import { parseMagicColor } from './utilities';

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
export function handlerBorderColor(context?: MagicColorContext) {
  return ([, a = '', b]: string[], ctx: RuleContext<Theme>): CSSEntries | (CSSValueInput | string)[] | undefined => {
    if (a in directionMap) {
      const bracketColor = h.bracketOfColor(b, ctx.theme);
      b = bracketColor ?? b;
      const colorData = parseMagicColor(b ?? '', ctx, context);
      if (bracketColor != null || colorData) {
        const directions = directionMap[a].map(i =>
          borderColorResolver(i)(colorData, ctx)
          ?? colorCSSGenerator({ color: b, name: '_' } as unknown as ReturnType<typeof parseColor>, `border${i}-color`, `border${i}`, ctx))
          .filter(notNull);

        return [
          directions
            .map(d => d[0])
            .reduce((acc, item) => {
            // Merge multiple direction CSSObject into one
              Object.assign(acc, item);
              return acc;
            }, {}),
          ...directions.flatMap(d => d.slice(1)),
        ];
      }
    }
  };
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

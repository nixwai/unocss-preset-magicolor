import type { Theme } from '@unocss/preset-wind4';
import type { CSSObject, Rule } from 'unocss';
import type { MagicColorContext } from '../typing';
import { notLastChildSelectorVariant } from '@unocss/preset-wind4/rules';
import { handleImage, handlerBorderColor, handleShadow, mcBgGradientColorResolver, mcColorResolver } from './utils';

export function createColorStyle(context?: MagicColorContext): Rule<Theme>[] {
  return [
    // common style colors
    [/^(?:color|c)-mc-(.+)$/, mcColorResolver('color', 'text', context), { autocomplete: '(color|c)-mc-$colors' }],
    [/^text-(?:color-)?mc-(.+)$/, mcColorResolver('color', 'text', context), { autocomplete: '(text|text-color)-mc-$colors' }],
    [/^outline-(?:color-)?mc-(.+)$/, mcColorResolver('outline-color', 'outline', context), { autocomplete: '(outline|outline-color)-mc-$colors' }],
    [/^accent-mc-(.+)$/, mcColorResolver('accent-color', 'accent', context), { autocomplete: 'accent-mc-$colors' }],
    [/^caret-mc-(.+)$/, mcColorResolver('caret-color', 'caret', context), { autocomplete: 'caret-mc-$colors' }],
    [/^bg-mc-(.+)$/, mcColorResolver('background-color', 'bg', context), { autocomplete: 'bg-mc-$colors' }],
    // from https://github.com/unocss/unocss/blob/main/packages-presets/preset-wind4/src/rules/decoration.ts
    [/^(?:underline|decoration)-mc-(.+)$/, (match, ctx) => {
      const result = mcColorResolver('text-decoration-color', 'line', context)(match, ctx); // use mcColorResolver
      if (result) {
        const css = result[0] as CSSObject;
        css['-webkit-text-decoration-color'] = css['text-decoration-color'];
        return result;
      }
    }, { autocomplete: '(underline|decoration)-mc-$colors' }],
    // from https://github.com/unocss/unocss/blob/main/packages-presets/preset-wind4/src/rules/divide.ts
    [/^divide-mc-(.+)$/, function* (match, ctx) {
      const result = mcColorResolver('border-color', 'divide', context)(match, ctx); // use mcColorResolver
      if (result) {
        yield {
          [ctx.symbols.variants]: [notLastChildSelectorVariant(match[0])],
          ...result[0] as CSSObject,
        };
        yield result[1];
      }
    }, { autocomplete: 'divide-mc-$colors' }],
    [/^(?:filter-)?drop-shadow-color-mc-(.+)$/, mcColorResolver('--un-drop-shadow-color', 'drop-shadow', context), { autocomplete: 'divide-mc-$colors' }],
    [/^\$ placeholder-mc-(.+)$/, mcColorResolver('color', 'placeholder', context), { autocomplete: 'placeholder-mc-$colors' }],
    [/^ring-mc-(.+)$/, mcColorResolver('--un-ring-color', 'ring', context), { autocomplete: 'ring-mc-$colors' }],
    [/^inset-ring-mc-(.+)$/, mcColorResolver(`--un-inset-ring-color`, 'inset-ring', context), { autocomplete: 'inset-ring-mc-$colors' }],
    [/^ring-offset-mc-(.+)$/, mcColorResolver('--un-ring-offset-color', 'ring-offset', context), { autocomplete: 'ring-offset-mc-$colors' }],
    [/^shadow-mc-(.+)$/, handleShadow('shadow', context), { autocomplete: ['shadow-$colors', 'shadow-mc-$shadow'] }],
    [/^inset-shadow-mc-(.+)$/, handleShadow('insetShadow', context), { autocomplete: ['inset-shadow-mc-$colors', 'inset-shadow-mc-$insetShadow'] }],
    [/^fill-mc-(.+)$/, mcColorResolver('fill', 'fill', context), { autocomplete: 'fill-mc-$colors' }],
    [/^stroke-mc-(.+)$/, mcColorResolver('stroke', 'stroke', context), { autocomplete: 'stroke-mc-$colors' }],
    [/^text-stroke-mc-(.+)$/, mcColorResolver('-webkit-text-stroke-color', 'text-stroke', context), { autocomplete: 'text-stroke-mc-$colors' }],
    [/^text-shadow-(?:color-)?mc-(.+)$/, mcColorResolver('--un-text-shadow-color', 'text-shadow', context), { autocomplete: ['text-shadow(-color)?-mc-$colors'] }],
    [/^mask-(linear|radial|conic)-(from|to)-mc-(.+)$/, handleImage(context), { autocomplete: ['mask-(linear|radial|conic)-(from|to)-mc-$colors'] }],
    [/^mask-([trblxy])-(from|to)-mc-(.+)$/, handleImage(context), { autocomplete: ['mask-(x|y|t|b|l|r)-(from|to)-mc-$colors'] }],
    // border style colors
    [/^(?:border|b)-()(?:color-)?mc-(.+)$/, handlerBorderColor(context), { autocomplete: ['(border|b)-mc-$colors', '(border|b)-<directions>-mc-$colors'] }],
    [/^(?:border|b)-([xy])-(?:color-)?mc-(.+)$/, handlerBorderColor(context)],
    [/^(?:border|b)-([rltbse])-(?:color-)?mc-(.+)$/, handlerBorderColor(context)],
    [/^(?:border|b)-(block|inline)-(?:color-)?mc-(.+)$/, handlerBorderColor(context)],
    [/^(?:border|b)-([bi][se])-(?:color-)?mc-(.+)$/, handlerBorderColor(context)],
    // bg gradient color
    [/^(from|via|to|stops)-mc-(.+)$/, mcBgGradientColorResolver(context)],
  ];
}

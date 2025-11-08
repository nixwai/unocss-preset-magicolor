import type { Theme } from '@unocss/preset-wind4';
import type { CSSObject, Rule } from 'unocss';
import { notLastChildSelectorVariant } from '@unocss/preset-wind4/rules';
import { handleImage, handleShadow, mcBgGradientColorResolver, mcBorderColorResolver, mcColorResolver } from './utils';

export const colorStyle: Rule<Theme>[] = [
  // common style colors
  [/^(?:color|c)-mc-(.+)$/, mcColorResolver('color', 'text'), { autocomplete: '(color|c)-mc-$colors' }],
  [/^text-(?:color-)?mc-(.+)$/, mcColorResolver('color', 'text'), { autocomplete: '(text|text-color)-mc-$colors' }],
  [/^outline-(?:color-)?mc-(.+)$/, mcColorResolver('outline-color', 'outline'), { autocomplete: '(outline|outline-color)-mc-$colors' }],
  [/^accent-mc-(.+)$/, mcColorResolver('accent-color', 'accent'), { autocomplete: 'accent-mc-$colors' }],
  [/^caret-mc-(.+)$/, mcColorResolver('caret-color', 'caret'), { autocomplete: 'caret-mc-$colors' }],
  [/^bg-mc-(.+)$/, mcColorResolver('background-color', 'bg'), { autocomplete: 'bg-mc-$colors' }],
  // from https://github.com/unocss/unocss/blob/main/packages-presets/preset-wind4/src/rules/decoration.ts
  [/^(?:underline|decoration)-mc-(.+)$/, (match, ctx) => {
    const result = mcColorResolver('text-decoration-color', 'line')(match, ctx); // use mcColorResolver
    if (result) {
      const css = result[0] as CSSObject;
      css['-webkit-text-decoration-color'] = css['text-decoration-color'];
      return result;
    }
  }, { autocomplete: '(underline|decoration)-mc-$colors' }],
  // from https://github.com/unocss/unocss/blob/main/packages-presets/preset-wind4/src/rules/divide.ts
  [/^divide-mc-(.+)$/, function* (match, ctx) {
    const result = mcColorResolver('border-color', 'divide')(match, ctx); // use mcColorResolver
    if (result) {
      yield {
        [ctx.symbols.variants]: [notLastChildSelectorVariant(match[0])],
        ...result[0] as CSSObject,
      };
      yield result[1];
    }
  }, { autocomplete: 'divide-mc-$colors' }],
  [/^(?:filter-)?drop-shadow-color-mc-(.+)$/, mcColorResolver('--un-drop-shadow-color', 'drop-shadow'), { autocomplete: 'divide-mc-$colors' }],
  [/^\$ placeholder-mc-(.+)$/, mcColorResolver('color', 'placeholder'), { autocomplete: 'placeholder-mc-$colors' }],
  [/^ring-mc-(.+)$/, mcColorResolver('--un-ring-color', 'ring'), { autocomplete: 'ring-mc-$colors' }],
  [/^inset-ring-mc-(.+)$/, mcColorResolver(`--un-inset-ring-color`, 'inset-ring'), { autocomplete: 'inset-ring-mc-$colors' }],
  [/^ring-offset-mc-(.+)$/, mcColorResolver('--un-ring-offset-color', 'ring-offset'), { autocomplete: 'ring-offset-mc-$colors' }],
  [/^shadow-mc-(.+)$/, handleShadow('shadow'), { autocomplete: ['shadow-$colors', 'shadow-mc-$shadow'] }],
  [/^inset-shadow-mc(.+)$/, handleShadow('insetShadow'), { autocomplete: ['inset-shadow-mc-$colors', 'inset-shadow-mc-$insetShadow'] }],
  [/^fill-mc-(.+)$/, mcColorResolver('fill', 'fill'), { autocomplete: 'fill-mc-$colors' }],
  [/^stroke-mc-(.+)$/, mcColorResolver('stroke', 'stroke'), { autocomplete: 'stroke-mc-$colors' }],
  [/^text-stroke-mc-(.+)$/, mcColorResolver('-webkit-text-stroke-color', 'text-stroke'), { autocomplete: 'text-stroke-mc-$colors' }],
  [/^text-shadow-(?:color-)?mc-(.+)$/, mcColorResolver('--un-text-shadow-color', 'text-shadow'), { autocomplete: ['text-shadow(-color)?-mc-$colors'] }],
  [/^mask-(linear|radial|conic)-(from|to)-mc-(.+)$/, handleImage, { autocomplete: ['mask-(linear|radial|conic)-(from|to)-mc-$colors'] }],
  [/^mask-([trblxy])-(from|to)-mc-(.+)$/, handleImage, { autocomplete: ['mask-(x|y|t|b|l|r)-(from|to)-mc-$colors'] }],
  // border style colors
  [/^(?:border|b)-()(?:color-)?mc-(.+)$/, mcBorderColorResolver, { autocomplete: ['(border|b)-mc-$colors', '(border|b)-<directions>-mc-$colors'] }],
  [/^(?:border|b)-([xy])-(?:color-)?mc-(.+)$/, mcBorderColorResolver],
  [/^(?:border|b)-([rltbse])-(?:color-)?mc-(.+)$/, mcBorderColorResolver],
  [/^(?:border|b)-(block|inline)-(?:color-)?mc-(.+)$/, mcBorderColorResolver],
  [/^(?:border|b)-([bi][se])-(?:color-)?mc-(.+)$/, mcBorderColorResolver],
  // bg gradient color
  [/^(from|via|to|stops)-mc-(.+)$/, mcBgGradientColorResolver()],
];

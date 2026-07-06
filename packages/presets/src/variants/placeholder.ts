import type { Theme } from '@unocss/preset-wind4';
import type { VariantObject } from 'unocss';

// from https://github.com/unocss/unocss/blob/main/packages-presets/preset-wind4/src/variants/placeholder.ts
export const placeholderModifier: VariantObject<Theme> = {
  name: 'placeholder-mc',
  order: -1,
  match(input: string) {
    const m = input.match(/^(.*)\b(placeholder-mc-)(.+)$/);
    if (m) {
      const [, pre = '', p, body] = m;
      return {
        // Append `placeholder-$ ` (with space!) to the rule to be matched.
        // The `placeholder-` is added for placeholder variant processing, and
        // the `$ ` is added for rule matching after `placeholder-` is removed by the variant.
        // See rules/color-style-rule.
        matcher: `${pre}placeholder-$ ${p}${body}`,
      };
    }
  },
};

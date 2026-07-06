import type { Theme } from '@unocss/preset-wind4';
import type { CSSObject, CSSValueInput, RuleContext } from 'unocss';
import type { MagicColorContext } from '../../typing';
import { shadowProperties } from '@unocss/preset-wind4/rules';
import { colorableShadows, h, hasParseableColor, hyphenate } from '@unocss/preset-wind4/utils';
import { getStringComponents } from '@unocss/rule-utils';
import { mcColorResolver } from './utilities';

// from https://github.com/unocss/unocss/blob/main/packages-presets/preset-wind4/src/rules/shadow.ts#L38
export function handleShadow(themeKey: 'shadow' | 'insetShadow', context: MagicColorContext) {
  return (match: RegExpMatchArray, ctx: RuleContext<Theme>): CSSObject | (CSSValueInput | string)[] | undefined => {
    const [, d] = match;
    const { theme } = ctx;
    let res: string[] = [];
    if (d) {
      res = getStringComponents(d, '/', 2) ?? [];
      if (d.startsWith('/')) { res = ['', d.slice(1)]; }
    }
    const v = theme[themeKey]?.[res[0] || 'DEFAULT'];
    const c = d ? h.bracket.cssvar(d, theme) : undefined;
    const shadowVar = hyphenate(themeKey);

    const colorData = mcColorResolver(`--un-${shadowVar}-color`, shadowVar, context)(match, ctx);
    if (colorData) {
      return colorData;
    }

    if ((v != null || c != null) && !hasParseableColor(c, theme)) {
      const alpha = res[1] ? h.bracket.percent.cssvar(res[1], theme) : undefined;
      return [
        {
          [`--un-${shadowVar}-opacity`]: alpha,
          [`--un-${shadowVar}`]: colorableShadows((v || c)!, `--un-${shadowVar}-color`, alpha).join(','),
          'box-shadow': 'var(--un-inset-shadow), var(--un-inset-ring-shadow), var(--un-ring-offset-shadow), var(--un-ring-shadow), var(--un-shadow)',
        },
        ...Object.values(shadowProperties),
      ];
    }
  };
}

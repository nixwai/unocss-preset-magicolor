import type { Theme } from '@unocss/preset-wind4';
import type { CSSObject, CSSValueInput, RuleContext } from 'unocss';
import { hyphenate } from '@unocss/preset-wind4/utils';
import { mcColorResolver } from './utilities';

export function handleShadow(themeKey: 'shadow' | 'insetShadow') {
  return (match: RegExpMatchArray, ctx: RuleContext<Theme>): CSSObject | (CSSValueInput | string)[] | undefined => {
    const shadowVar = hyphenate(themeKey);
    return mcColorResolver(`--un-${shadowVar}-color`, shadowVar)(match, ctx);
  };
}

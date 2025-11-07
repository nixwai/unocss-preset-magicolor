import type { Theme } from '@unocss/preset-wind4';
import type { CSSObject, CSSValueInput, RuleContext } from 'unocss';
import { hyphenate } from '@unocss/preset-wind4/utils';
import { mcColorResolver } from '../utilities';

// from https://github.com/unocss/unocss/blob/main/packages-presets/preset-wind4/src/rules/shadow.ts#L38
export function handleShadow(themeKey: 'shadow' | 'insetShadow') {
  return (match: RegExpMatchArray, ctx: RuleContext<Theme>): CSSObject | (CSSValueInput | string)[] | undefined => {
    const shadowVar = hyphenate(themeKey);
    return mcColorResolver(`--un-${shadowVar}-color`, shadowVar)(match, ctx);
  };
}

import type { Theme } from '@unocss/preset-wind4';
import type { CSSValueInput, CSSValues, RuleContext } from 'unocss';
import type { MagicColorContext } from '../../typing';
import { colorableShadows, defineProperty, h, hasParseableColor } from '@unocss/preset-wind4/utils';
import { getStringComponents } from '@unocss/rule-utils';
import { mcColorResolver } from './utilities';

const filterBaseKeys = [
  'blur',
  'brightness',
  'contrast',
  'grayscale',
  'hue-rotate',
  'invert',
  'saturate',
  'sepia',
  'drop-shadow',
];
const filterProperties = filterBaseKeys.map(i => defineProperty(`--un-${i}`));
const filterCSS = filterBaseKeys.map(i => `var(--un-${i},)`).join(' ');

// from https://github.com/unocss/unocss/blob/main/packages-presets/preset-wind4/src/rules/filters.ts#L78
export function handleDropShadow(context: MagicColorContext) {
  return (match: string[], ctx: RuleContext<Theme>): CSSValues | (CSSValueInput | string)[] | undefined => {
    const result = mcColorResolver('--un-drop-shadow-color', 'drop-shadow', context)(match, ctx);
    if (result) {
      return result;
    }

    const [, s] = match;
    const { theme } = ctx;
    let res: string[] = [];
    if (s) {
      res = getStringComponents(s, '/', 2) ?? [];
      if (s.startsWith('/')) {
        res = ['', s.slice(1)];
      }
    }
    let v = theme.dropShadow?.[res[0] || 'DEFAULT'];
    const c = s ? h.bracket.cssvar(s, theme) : undefined;

    if ((v != null || c != null) && !hasParseableColor(c, theme)) {
      const alpha = res[1] ? h.bracket.percent.cssvar(res[1], theme) : undefined;
      return [
        {
          '--un-drop-shadow-opacity': alpha,
          '--un-drop-shadow': `drop-shadow(${colorableShadows((v || c)!, '--un-drop-shadow-color', alpha).join(') drop-shadow(')})`,
          'filter': filterCSS,
        },
        ...filterProperties,
      ];
    }

    v = h.bracket.cssvar(s, theme) ?? (s === 'none' ? '' : undefined);
    if (v != null) {
      return [
        {
          '--un-drop-shadow': v ? `drop-shadow(${v})` : v,
          'filter': filterCSS,
        },
        ...filterProperties,
      ];
    }
  };
}

import type { Preflight } from 'unocss';
import type { MagicColorContext } from '../typing';
import { resolveColorParts, splitColorParts } from '@unocss-preset-magicolor/utils';
import { hasParseableColor } from '@unocss/preset-wind4/utils';
import { resolveThemeColorVariable } from '../rules/utils';

export function preflights(context?: MagicColorContext): Preflight[] {
  return [{
    getCSS: ({ theme }) => {
      const css = {};
      for (const name of context?.usage.getUsageNames() ?? []) {
        const isUnocssThemeColor = hasParseableColor(name, theme);
        const optionColor = context?.options.colors?.[name];
        // skip if not defined by option or theme
        if (!optionColor && !isUnocssThemeColor) {
          continue;
        }

        const [bodyColor] = splitColorParts(optionColor ?? name);
        Object.assign(css, resolveThemeColorVariable(name, resolveColorParts(bodyColor), theme, context));
      }

      if (Object.keys(css).length) {
        return `
        :root {
          ${Object.entries(css).map(([key, value]) => `${key}: ${value};`).join('\n')}
        }`;
      }

      return '';
    },
  }];
};

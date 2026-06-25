import type { Preflight } from 'unocss';
import type { PresetMcOptions } from '../types';
import type { MagicColorContext } from '../usage';
import { hasParseableColor } from '@unocss/preset-wind4/utils';
import { resolveThemeColorVariable } from '../rules/utils';

export function preflights(options: PresetMcOptions, context?: MagicColorContext): Preflight[] {
  return [{
    getCSS: ({ theme }) => {
      const css = {};
      for (const name of context?.getUsageNames() ?? []) {
        const isUnocssThemeColor = hasParseableColor(name, theme);
        const optionColor = options.colors?.[name];
        // skip if not defined by option or theme
        if (!optionColor && !isUnocssThemeColor) {
          continue;
        }

        Object.assign(css, resolveThemeColorVariable(name, options.colors?.[name] ?? name, theme, context));
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

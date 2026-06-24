import type { Preflight } from 'unocss';
import type { PresetMcOptions } from '../types';
import type { MagicColorContext } from '../usage';
import { resolveThemeColorVariable } from '../rules/utils';

export function preflights(options: PresetMcOptions, context?: MagicColorContext): Preflight[] {
  if (options.colors) {
    return [{
      getCSS: ({ theme }) => {
        const css = {};
        for (const name in options.colors) {
          Object.assign(css, resolveThemeColorVariable(name, options.colors[name], theme, context?.getUsage(name)));
        }
        return `
          :root {
            ${Object.entries(css).map(([key, value]) => `${key}: ${value};`).join('\n')}
          }
        `;
      },
    }];
  }
  return [];
};

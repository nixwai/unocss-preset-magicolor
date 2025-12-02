import type { Preflight } from 'unocss';
import type { PresetMcOptions } from '../types';
import { resolveThemeColorVariable } from '../rules/utils';

export function preflights(options: PresetMcOptions): Preflight[] {
  if (options.colors) {
    return [{
      getCSS: ({ theme }) => {
        const css = {};
        for (const name in options.colors) {
          Object.assign(css, resolveThemeColorVariable(name, options.colors[name], theme));
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

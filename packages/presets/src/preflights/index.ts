import type { Preflight } from 'unocss';
import type { PresetMcOptions } from '../types';
import type { MagicColorContext } from '../usage';
import { resolveThemeColorVariable } from '../rules/utils';

export function preflights(options: PresetMcOptions, context?: MagicColorContext): Preflight[] {
  return [{
    getCSS: ({ theme }) => {
      const css = {};

      for (const name of context?.getUsageNames() ?? []) {
        const usage = context?.getUsage(name);
        if (!usage || context?.isDefined(name)) {
          continue;
        }

        Object.assign(css, resolveThemeColorVariable(name, options.colors?.[name] ?? name, theme, usage));
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

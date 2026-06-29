import type { PresetWind4Options } from '@unocss/preset-wind4';
import type { CSSObject, Preflight, Preset } from 'unocss';
import type { PresetMcColorValue } from '../types';
import type { MagicColorContext } from '../typing';
import { resolveBodyColor } from '@unocss-preset-magicolor/utils';
import { hasParseableColor } from '@unocss/preset-wind4/utils';
import { resolveThemeColorVariable } from '../rules/utils';

const PRESET_NAME_LIST = ['@unocss/preset-mini', '@unocss/preset-wind3', '@unocss/preset-wind4'];
const DEFAULT_DARK_SELECTOR = '.dark';

function stringifyCssVariables(css: CSSObject) {
  return Object.entries(css)
    .filter(([, value]) => value != null)
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n\t');
}

function hasCssVariables(css: CSSObject) {
  return Object.values(css).some(value => value != null);
}

function createRootCss(css: CSSObject) {
  if (!hasCssVariables(css)) {
    return '';
  }

  return `:root {\n\t${stringifyCssVariables(css)}\n}\n`;
}

function createDarkCss(css: CSSObject, presets: readonly Preset[]) {
  if (!hasCssVariables(css)) {
    return '';
  }
  const presetOptions = presets.find(preset => PRESET_NAME_LIST.includes(preset.name))?.options as PresetWind4Options | undefined;
  const darkMode = presetOptions?.dark === 'media' ? 'media' : 'class';

  const cssVariables = stringifyCssVariables(css);
  if (darkMode === 'media') {
    return `@media (prefers-color-scheme: dark) {
  :root {
    ${cssVariables}
  }\n}\n`;
  }
  const selector = typeof presetOptions?.dark === 'string'
    ? DEFAULT_DARK_SELECTOR
    : (presetOptions?.dark?.dark || DEFAULT_DARK_SELECTOR);
  return `${selector} {\n\t${cssVariables}\n}\n`;
}

function resolveColorConfig(config?: PresetMcColorValue) {
  if (!config) {
    return { color: undefined, lightnessReverse: false };
  }
  if (typeof config === 'string') {
    return { color: config, lightnessReverse: false };
  }
  return {
    color: config.color,
    lightnessReverse: config.lightnessReverse === true,
  };
}

export function preflights(context?: MagicColorContext): Preflight[] {
  return [{
    getCSS: ({ theme, generator }) => {
      const css: CSSObject = {};
      const darkCss: CSSObject = {};
      for (const name of context?.usage.getUsageNames() ?? []) {
        const isUnocssThemeColor = hasParseableColor(name, theme);
        const optionColor = resolveColorConfig(context?.options.colors?.[name]);
        const darkColor = resolveColorConfig(context?.options.dark?.[name]);

        if (optionColor.color || isUnocssThemeColor) {
          Object.assign(css, resolveThemeColorVariable(
            name,
            resolveBodyColor(optionColor.color ?? name),
            theme,
            context,
            { lightnessReverse: optionColor.lightnessReverse },
          ));
        }

        if (darkColor.color) {
          Object.assign(darkCss, resolveThemeColorVariable(
            name,
            resolveBodyColor(darkColor.color),
            theme,
            context,
            { lightnessReverse: darkColor.lightnessReverse },
          ));
        }
      }

      const rootCss = createRootCss(css);
      const darkVariablesCss = createDarkCss(darkCss, generator.config.presets);

      return `${rootCss}${darkVariablesCss}`;
    },
  }];
};

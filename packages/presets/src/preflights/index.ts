import type { PresetWind4Options } from '@unocss/preset-wind4';
import type { CSSObject, Preflight, Preset } from 'unocss';
import type { MagicColorContext } from '../typing';
import { resolveBodyColor } from '@unocss-preset-magicolor/utils';
import { resolveColorConfig, resolveMixtureColorConfig } from '../utils/color-config';
import { createCssVariableReference, generateColorName, generateSourceColorName } from '../utils/color-variable';
import { resolveThemeColorVariable } from '../utils/theme-colors';

const PRESET_NAME_LIST = ['@unocss/preset-mini', '@unocss/preset-wind3', '@unocss/preset-wind4'];
const DEFAULT_DARK_SELECTOR = '.dark';

/** Serializes non-empty CSS custom properties into a declaration block body. */
function stringifyCssVariables(css: CSSObject) {
  return Object.entries(css)
    .filter(([, value]) => value != null)
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n\t');
}

/** Checks whether a generated CSS object contains at least one real value. */
function hasCssVariables(css: CSSObject) {
  return Object.values(css).some(value => value != null);
}

/** Creates the light-mode variable block and skips empty output entirely. */
function createRootCss(css: CSSObject) {
  if (!hasCssVariables(css)) {
    return '';
  }

  return `:root {\n\t${stringifyCssVariables(css)}\n}\n`;
}

/** Creates dark-mode variables using the host preset's dark mode strategy. */
function createDarkCss(css: CSSObject, presets: readonly Preset[]) {
  if (!hasCssVariables(css)) {
    return '';
  }
  // Reuse UnoCSS preset dark-mode settings so this preset follows the app convention.
  const presetOptions = presets.find(preset => PRESET_NAME_LIST.includes(preset.name))?.options as PresetWind4Options | undefined;
  const darkMode = presetOptions?.dark === 'media' ? 'media' : 'class';

  const cssVariables = stringifyCssVariables(css);
  if (darkMode === 'media') {
    return `@media (prefers-color-scheme: dark) {
  :root {
    ${cssVariables}
  }\n}\n`;
  }
  // Object dark config can provide a custom selector; string dark config means `.dark`.
  const selector = typeof presetOptions?.dark === 'string'
    ? DEFAULT_DARK_SELECTOR
    : (presetOptions?.dark?.dark || DEFAULT_DARK_SELECTOR);
  return `${selector} {\n\t${cssVariables}\n}\n`;
}

/** Emits only the color variables that were discovered by the usage extractor. */
export function preflights(context?: MagicColorContext): Preflight[] {
  return [{
    getCSS: ({ theme, generator }) => {
      const sourceCss: CSSObject = {};
      const sourceDarkCss: CSSObject = {};
      const targetCss: CSSObject = {};
      for (const name of context?.usage.getUsageNames() ?? []) {
        const usage = context?.usage.getUsage(name);
        if (!usage) {
          continue;
        }
        // Light variables may come from explicit options or directly from UnoCSS theme colors.
        const optionColor = resolveMixtureColorConfig(name, theme, context);
        if (optionColor.color) {
          Object.assign(sourceCss, resolveThemeColorVariable(
            name,
            resolveBodyColor(optionColor.color),
            theme,
            usage,
            { lightnessReverse: optionColor.lightnessReverse },
            generateSourceColorName,
          ));
        }

        // Dark variables are emitted only for explicit dark aliases.
        const darkColor = resolveColorConfig(context?.options.dark?.[name]);
        if (darkColor.color) {
          Object.assign(sourceDarkCss, resolveThemeColorVariable(
            name,
            resolveBodyColor(darkColor.color),
            theme,
            usage,
            { lightnessReverse: darkColor.lightnessReverse },
            generateSourceColorName,
          ));
        }

        if (optionColor.color || darkColor.color) {
          for (const depth of usage) {
            targetCss[generateColorName(name, depth)] = createCssVariableReference(generateSourceColorName(name, depth));
          }
        }
      }

      const rootSourceCssStr = createRootCss(sourceCss);
      const rootSourceDarkCssStr = createDarkCss(sourceDarkCss, generator.config.presets);
      const rootCssStr = createRootCss(targetCss);

      return `${rootSourceCssStr}${rootSourceDarkCssStr}${rootCssStr}`;
    },
  }];
};

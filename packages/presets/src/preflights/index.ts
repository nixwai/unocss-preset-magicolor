import type { PresetWind4Options } from '@unocss/preset-wind4';
import type { CSSObject, Preflight, Preset } from 'unocss';
import type { MagicColorContext } from '../typing';
import type { MagicColorDepth } from '../utils/color-variable';
import { resolveBodyColor } from '@unocss-preset-magicolor/utils';
import { resolveColorConfig, resolveMixtureColorConfig } from '../utils/color-config';
import { createSourceColorVariableName, createTargetColorVariableName, toVar } from '../utils/color-variable';
import { resolveThemeColorCss } from '../utils/theme-colors';

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
      const rootSourceCss: CSSObject = {};
      const rootTargetCss: CSSObject = {};
      const sourceDarkCss: CSSObject = {};
      const colorNames = new Set([
        ...(context?.usage.getTargetNames() ?? []),
        ...(context?.usage.getSourceNames() ?? []),
      ]);

      for (const name of colorNames) {
        const targetDepths = context?.usage.getTargetDepths(name);
        const sourceDepths = context?.usage.getSourceDepths(name);
        const allDepths = new Set<MagicColorDepth>([...(targetDepths ?? []), ...(sourceDepths ?? [])]);

        if (!allDepths.size) {
          continue;
        }
        // Light variables may come from explicit options or directly from UnoCSS theme colors.
        const optionColor = resolveMixtureColorConfig(name, theme, context);
        if (optionColor.color) {
          Object.assign(rootSourceCss, resolveThemeColorCss(
            name,
            resolveBodyColor(optionColor.color),
            theme,
            allDepths,
            { lightnessReverse: optionColor.lightnessReverse },
            createSourceColorVariableName,
          ));
        }

        // Dark variables are emitted only for explicit dark aliases.
        const darkColor = resolveColorConfig(context?.options.dark?.[name]);
        if (darkColor.color) {
          Object.assign(sourceDarkCss, resolveThemeColorCss(
            name,
            resolveBodyColor(darkColor.color),
            theme,
            allDepths,
            { lightnessReverse: darkColor.lightnessReverse },
            createSourceColorVariableName,
          ));
        }

        if ((optionColor.color || darkColor.color) && targetDepths) {
          for (const depth of targetDepths) {
            rootTargetCss[createTargetColorVariableName(name, depth)] = toVar(createSourceColorVariableName(name, depth));
          }
        }
      }

      const rootSourceCssStr = createRootCss(rootSourceCss);
      const rootTargetCssStr = createRootCss(rootTargetCss);
      const rootSourceDarkCssStr = createDarkCss(sourceDarkCss, generator.config.presets);

      return `${rootSourceCssStr}${rootSourceDarkCssStr}${rootTargetCssStr}`;
    },
  }];
};

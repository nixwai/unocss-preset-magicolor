export interface PresetMcColorOptions {
  /** Source color name or arbitrary color used to generate magic-color depths. */
  color: string
  /** Reverse numeric depth lookups, for example 50 -> 950 and 450 -> 550. */
  lightnessReverse?: boolean
}

export type PresetMcColorValue = string | PresetMcColorOptions;

export interface MagicColorOptions extends Omit<PresetMcOptions, 'colors' | 'dark'> {
  colors?: Record<string, PresetMcColorOptions>
  dark?: Record<string, PresetMcColorOptions>
}

/** User-facing options accepted by `presetMagicolor`. */
export interface PresetMcOptions {
  /**
   * Global color aliases emitted into `:root` when matching usages are scanned.
   * camelCase aliases are also available from kebab-case magic-color classes.
   * Alias names should not end with digits because trailing digits are parsed as compact depth syntax.
   */
  colors?: Record<string, PresetMcColorValue>
  /**
   * Dark-mode color aliases emitted with the configured UnoCSS dark selector.
   * camelCase aliases are also available from kebab-case magic-color classes.
   * Alias names should not end with digits because trailing digits are parsed as compact depth syntax.
   */
  dark?: Record<string, PresetMcColorValue>
}

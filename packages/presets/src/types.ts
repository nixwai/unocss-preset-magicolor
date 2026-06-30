export interface PresetMcColorOptions {
  /** Source color name or arbitrary color used to generate magic-color depths. */
  color: string
  /** Reverse numeric depth lookups, for example 50 -> 950 and 450 -> 550. */
  lightnessReverse?: boolean
}

export type PresetMcColorValue = string | PresetMcColorOptions;

/** User-facing options accepted by `presetMagicolor`. */
export interface PresetMcOptions {
  /** Global color aliases emitted into `:root` when matching usages are scanned. */
  colors?: Record<string, PresetMcColorValue>
  /** Dark-mode color aliases emitted with the configured UnoCSS dark selector. */
  dark?: Record<string, PresetMcColorValue>
}

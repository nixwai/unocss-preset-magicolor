export interface PresetMcColorOptions {
  color: string
  lightnessReverse?: boolean
}

export type PresetMcColorValue = string | PresetMcColorOptions;

/** PresetMcOptions */
export interface PresetMcOptions {
  /** global colors variables */
  colors?: Record<string, PresetMcColorValue>
  /** dark mode color variables */
  dark?: Record<string, PresetMcColorValue>
}

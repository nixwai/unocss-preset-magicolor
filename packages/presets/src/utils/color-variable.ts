export const BASE_COLOR_DEPTH = 'DEFAULT';

export type MagicColorDepth = number | typeof BASE_COLOR_DEPTH;

/** Builds the CSS custom property name for a magic color and optional depth. */
export function generateColorName(name: string, depth: string | number = BASE_COLOR_DEPTH) {
  return `--mc-colors-${name}-${depth}`;
}

/** Creates a single CSS custom property object for generated variables. */
export function generateColorVariable(name: string, color: string, depth?: string | number) {
  return { [generateColorName(name, depth)]: color };
}

/** Parses definition bodies in the `name_source` format used by `mc-*` rules. */
export function parseMagicColorDefinition(body: string) {
  const firstUnderscoreIndex = body.indexOf('_');
  if (firstUnderscoreIndex < 0) {
    return;
  }
  const name = body.substring(0, firstUnderscoreIndex);
  const hue = body.substring(firstUnderscoreIndex + 1);
  if (!name || !hue) {
    return;
  }
  return { name, hue };
}

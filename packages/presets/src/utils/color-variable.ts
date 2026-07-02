export const BASE_COLOR_DEPTH = 'DEFAULT' as const;

export type MagicColorDepth = number | typeof BASE_COLOR_DEPTH;

/** Builds the public target CSS custom property name for a magic color depth. */
export function createTargetColorVariableName(name: string, depth: string | number = BASE_COLOR_DEPTH) {
  return `--mc-colors-${name}-${depth}`;
}

/** Builds the internal source CSS custom property name for a magic color depth. */
export function createSourceColorVariableName(name: string, depth: string | number = BASE_COLOR_DEPTH) {
  return `--mc-source-colors-${name}-${depth}`;
}

/** Wraps a CSS custom property name in a var() reference. */
export function toVar(variableName: string) {
  return `var(${variableName})`;
}

/** Creates a single target CSS custom property declaration. */
export function createTargetColorVariableDeclaration(name: string, color: string, depth?: string | number) {
  return { [createTargetColorVariableName(name, depth)]: color };
}

/** Parses definition bodies in the `name_source` format used by `mc-*` rules. */
export function parseColorVariableDefinition(body: string) {
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

export function generateColorName(name: string, depth?: string | number) {
  const suffix = depth == null ? '' : `-${depth}`;
  return `--mc-${name}${suffix}-color`;
}

export function generateColorVariable(name: string, color: string, depth?: string | number) {
  return { [generateColorName(name, depth)]: color };
}

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

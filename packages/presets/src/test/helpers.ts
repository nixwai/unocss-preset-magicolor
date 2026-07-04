import type { PresetMcOptions } from '../types';
import { createGenerator, presetWind4, transformerDirectives } from 'unocss';
import { presetMagicolor } from '../index';

/** Creates a UnoCSS generator with Wind4 and the magicolor preset for tests. */
export async function createUno(options: PresetMcOptions = {}, extra: Record<string, unknown> = {}) {
  return createGenerator({
    presets: [
      presetWind4(),
      presetMagicolor(options),
    ],
    ...extra,
  });
}

/** Generates CSS for test input with preflights enabled. */
export async function generate(input: string | string[], options: PresetMcOptions = {}, extra: Record<string, unknown> = {}) {
  const uno = await createUno(options, extra);
  return uno.generate(input, { preflights: true });
}

/** Generates CSS for directive transformer tests using a stable input id. */
export async function generateWithDirectives(input: string, options: PresetMcOptions = {}, id = 'directives.css') {
  const uno = await createUno(options, { transformers: [transformerDirectives()] });
  const result = await uno.generate(input, { preflights: true, id });
  return { ...result, transformed: input };
}

/** Generates CSS with explicit Wind4 options alongside the magicolor preset. */
export async function generateWithWind4(input: string | string[], options: PresetMcOptions = {}, wind4Options?: Parameters<typeof presetWind4>[0]) {
  const uno = await createGenerator({
    presets: [
      presetWind4(wind4Options),
      presetMagicolor(options),
    ],
  });
  return uno.generate(input, { preflights: true });
}

/** Generates CSS with only the magicolor preset installed. */
export async function generateWithoutWind4(input: string | string[], options: PresetMcOptions = {}) {
  const uno = await createGenerator({
    presets: [
      presetMagicolor(options),
    ],
  });
  return uno.generate(input, { preflights: true });
}

/** Escapes a string for safe interpolation into a regular expression. */
export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Reads a CSS custom property value from generated CSS text. */
export function getCssVar(css: string, name: string) {
  const match = css.match(new RegExp(`${escapeRegExp(name)}:\\s*([^;{}]+)`));
  return match?.[1]?.trim();
}

/** Extracts the contents of the generated `.dark` block. */
export function getDarkBlock(css: string) {
  return css.match(/\.dark\s*\{([\s\S]*?)\}/)?.[1] ?? '';
}

/** Extracts the declaration block for a generated selector. */
export function getSelectorBlock(css: string, selector: string) {
  return css.match(new RegExp(`${escapeRegExp(selector)}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? '';
}

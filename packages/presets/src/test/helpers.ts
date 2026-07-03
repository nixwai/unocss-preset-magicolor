import type { PresetMcOptions } from '../types';
import { createGenerator, presetWind4, transformerDirectives } from 'unocss';
import { presetMagicolor } from '../index';

export async function createUno(options: PresetMcOptions = {}, extra: Record<string, unknown> = {}) {
  return createGenerator({
    presets: [
      presetWind4(),
      presetMagicolor(options),
    ],
    ...extra,
  });
}

export async function generate(input: string | string[], options: PresetMcOptions = {}, extra: Record<string, unknown> = {}) {
  const uno = await createUno(options, extra);
  return uno.generate(input, { preflights: true });
}

export async function generateWithDirectives(input: string, options: PresetMcOptions = {}, id = 'directives.css') {
  const uno = await createUno(options, { transformers: [transformerDirectives()] });
  const result = await uno.generate(input, { preflights: true, id });
  return { ...result, transformed: input };
}

export async function generateWithWind4(input: string | string[], options: PresetMcOptions = {}, wind4Options?: Parameters<typeof presetWind4>[0]) {
  const uno = await createGenerator({
    presets: [
      presetWind4(wind4Options),
      presetMagicolor(options),
    ],
  });
  return uno.generate(input, { preflights: true });
}

export async function generateWithoutWind4(input: string | string[], options: PresetMcOptions = {}) {
  const uno = await createGenerator({
    presets: [
      presetMagicolor(options),
    ],
  });
  return uno.generate(input, { preflights: true });
}

export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getCssVar(css: string, name: string) {
  const match = css.match(new RegExp(`${escapeRegExp(name)}:\\s*([^;{}]+)`));
  return match?.[1]?.trim();
}

export function getDarkBlock(css: string) {
  return css.match(/\.dark\s*\{([\s\S]*?)\}/)?.[1] ?? '';
}

export function getSelectorBlock(css: string, selector: string) {
  return css.match(new RegExp(`${escapeRegExp(selector)}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? '';
}

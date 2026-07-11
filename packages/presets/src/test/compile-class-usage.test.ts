import { createGenerator, presetWind4, transformerCompileClass, transformerVariantGroup } from 'unocss';
import { describe, expect, it } from 'vitest';
import { presetMagicolor } from '../index';
import { getCssVar, getSelectorBlock } from './helpers';

class TestMagicString {
  original: string;
  private value: string;

  constructor(input: string) {
    this.original = input;
    this.value = input;
  }

  overwrite(start: number, end: number, replacement: string) {
    this.value = `${this.value.slice(0, start)}${replacement}${this.value.slice(end)}`;
  }

  toString() {
    return this.value;
  }
}

async function generateWithCompileClass(input: string) {
  const compileClass = transformerCompileClass();
  const uno = await createGenerator({
    presets: [
      presetWind4(),
      presetMagicolor({ colors: { primary: 'rose' } }),
    ],
    transformers: [
      transformerVariantGroup(),
      transformerCompileClass(),
    ],
  });

  const s = new TestMagicString(input);
  const tokens = new Set<string>();
  await compileClass.transform?.(s, 'compile-class.vue', {
    uno,
    tokens,
    invalidate: () => uno.cache.clear(),
  });

  const extracted = await uno.applyExtractors(s.toString(), 'compile-class.vue', tokens);
  const result = await uno.generate(extracted, { preflights: true, id: 'compile-class.vue' });

  return {
    ...result,
    transformed: s.toString(),
  };
}

function getCompiledClassSelector(css: string) {
  return css.match(/\.uno-[^{,\s]+/)?.[0] ?? '';
}

describe('compile class transformer usage extraction', () => {
  it('keeps locally defined magic color usage in compiled classes', async () => {
    const { css, transformed } = await generateWithCompileClass('<div class=":uno: mc-primary_blue ccc bg-mc-primary-330"></div>');
    const selector = getCompiledClassSelector(css);
    const block = getSelectorBlock(css, selector);

    expect(transformed).toContain('ccc');
    expect(transformed).not.toContain('mc-primary_blue');
    expect(transformed).not.toContain('bg-mc-primary-330');
    expect(selector).toMatch(/^\.uno-/);
    expect(getCssVar(block, '--mc-colors-primary-330')).toBe('var(--mc-source-colors-blue-330)');
    expect(getCssVar(css, '--mc-source-colors-blue-330')).toMatch(/^oklch\(/);
    expect(block).toContain('var(--mc-colors-primary-330)');
  });

  it('tracks global magic color usage inside compiled classes', async () => {
    const { css } = await generateWithCompileClass('<div class=":uno: bg-mc-primary-444"></div>');
    const selector = getCompiledClassSelector(css);
    const block = getSelectorBlock(css, selector);

    expect(selector).toMatch(/^\.uno-/);
    expect(getCssVar(css, '--mc-colors-primary-444')).toBe('var(--mc-source-colors-primary-444)');
    expect(getCssVar(css, '--mc-source-colors-primary-444')).toMatch(/^oklch\(/);
    expect(block).toContain('var(--mc-colors-primary-444)');
  });

  it('tracks variant-group magic color usage before compile class hashing', async () => {
    const { css } = await generateWithCompileClass('<div class=":uno: bg-(op-50 mc-primary-330) hover:(font-medium bg-mc-primary-444)"></div>');

    expect(getCssVar(css, '--mc-colors-primary-330')).toBe('var(--mc-source-colors-primary-330)');
    expect(getCssVar(css, '--mc-colors-primary-444')).toBe('var(--mc-source-colors-primary-444)');
    expect(getCssVar(css, '--mc-source-colors-primary-330')).toMatch(/^oklch\(/);
    expect(getCssVar(css, '--mc-source-colors-primary-444')).toMatch(/^oklch\(/);
    expect(css).toContain('var(--mc-colors-primary-330)');
    expect(css).toContain('var(--mc-colors-primary-444)');
  });

  it('keeps local lightness-reverse definitions in compiled classes', async () => {
    const { css, transformed } = await generateWithCompileClass('<div class=":uno: mc-lr-primary_primary c-mc-primary-80"></div>');
    const selector = getCompiledClassSelector(css);
    const block = getSelectorBlock(css, selector);

    expect(transformed).not.toContain('mc-lr-primary_primary');
    expect(transformed).not.toContain('c-mc-primary-80');
    expect(selector).toMatch(/^\.uno-/);
    expect(getCssVar(block, '--mc-colors-primary-80')).toBe('var(--mc-source-colors-primary-920)');
    expect(getCssVar(css, '--mc-source-colors-primary-920')).toMatch(/^oklch\(/);
    expect(block).toContain('var(--mc-colors-primary-80)');
  });

  it('keeps global lightness-reverse definitions in compiled classes', async () => {
    const { css, transformed } = await generateWithCompileClass('<div class=":uno: mc-lr bg-mc-primary-50"></div>');
    const selector = getCompiledClassSelector(css);
    const block = getSelectorBlock(css, selector);

    expect(transformed).not.toContain('mc-lr');
    expect(transformed).not.toContain('bg-mc-primary-50');
    expect(selector).toMatch(/^\.uno-/);
    expect(getCssVar(block, '--mc-colors-primary-50')).toBe('var(--mc-source-colors-primary-950)');
    expect(getCssVar(css, '--mc-source-colors-primary-950')).toMatch(/^oklch\(/);
    expect(block).toContain('var(--mc-colors-primary-50)');
  });
});

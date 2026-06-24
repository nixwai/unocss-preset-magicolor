import { createGenerator, presetWind4 } from 'unocss';
import { describe, expect, it } from 'vitest';
import { updateMagicColor } from './helper';
import { presetMagicolor } from './index';

async function generate(input: string | string[], options = {}) {
  const uno = await createGenerator({
    presets: [
      presetWind4(),
      presetMagicolor(options),
    ],
  });

  return uno.generate(input, { preflights: true });
}

describe('magicolor usage extraction', () => {
  it('generates only variables needed by scanned custom color depths', async () => {
    const { css } = await generate('<div class="mc-btn_red bg-mc-btn-640 c-mc-btn-200 c-mc-btn"></div>');

    expect(css).toContain('--mc-btn-color:');
    expect(css).toContain('--mc-btn-200-color:oklch(');
    expect(css).toContain('--mc-btn-640-color:oklch(');
    expect(css).not.toContain('--mc-btn-50-l:');
    expect(css).not.toContain('--mc-btn-100-l:');
    expect(css).not.toContain('--mc-btn-300-l:');
    expect(css).not.toContain('--mc-btn-400-l:');
    expect(css).not.toContain('--mc-btn-500-l:');
    expect(css).not.toContain('--mc-btn-800-l:');
    expect(css).not.toContain('--mc-btn-900-l:');
    expect(css).not.toContain('--mc-btn-950-l:');
    expect(css).not.toContain('--mc-btn-640-l:');
    expect(css).not.toContain('--mc-btn-640-c:');
    expect(css).not.toContain('--mc-btn-640-h:');
    expect(css).not.toContain('calc(');
  });

  it('uses generated depth color variables without per-selector channel variables', async () => {
    const { css } = await generate('<div class="mc-btn_red bg-mc-btn-640"></div>');

    expect(css).toContain('var(--mc-btn-640-color)');
    expect(css).toContain('--mc-btn-640-color:oklch(');
    expect(css).not.toContain('--mc-btn-color:');
    expect(css).not.toContain('--mc-btn-640-l:');
    expect(css).not.toContain('--mc-btn-640-c:');
    expect(css).not.toContain('--mc-btn-640-h:');
    expect(css).not.toContain('.bg-mc-btn-640{--mc-btn-640');
  });

  it('tracks custom color depths with opacity modifiers', async () => {
    const { css } = await generate('<div class="mc-btn_red bg-mc-btn-640/50"></div>');

    expect(css).toContain('--mc-btn-640-color:oklch(');
    expect(css).toContain('var(--mc-btn-640-color)');
    expect(css).not.toContain('.bg-mc-btn-640\\/50{--mc-btn-640');
    expect(css).not.toContain('--mc-btn-500-l:');
    expect(css).not.toContain('--mc-btn-600-l:');
    expect(css).not.toContain('--mc-btn-700-l:');
    expect(css).not.toContain('calc(');
  });

  it('does not generate depth variables when only the base custom color is used', async () => {
    const { css } = await generate('<div class="mc-btn_red c-mc-btn"></div>');

    expect(css).toContain('--mc-btn-color:');
    expect(css).toContain('var(--mc-btn-color)');
    expect(css).not.toContain('--mc-btn-50-l:');
    expect(css).not.toContain('--mc-btn-100-l:');
    expect(css).not.toContain('--mc-btn-200-l:');
    expect(css).not.toContain('--mc-btn-950-l:');
  });

  it('trims configured color variables by scanned usage', async () => {
    const { css } = await generate('<div class="c-mc-primary-457"></div>', { colors: { primary: 'rose' } });

    expect(css).toContain(':root');
    expect(css).not.toContain('--mc-primary-color:');
    expect(css).toMatch(/--mc-primary-457-color:\s*oklch\(/);
    expect(css).toContain('var(--mc-primary-457-color)');
    expect(css).not.toContain('--mc-primary-50-l:');
    expect(css).not.toContain('--mc-primary-400-l:');
    expect(css).not.toContain('--mc-primary-500-l:');
    expect(css).not.toContain('--mc-primary-600-l:');
    expect(css).not.toContain('--mc-primary-950-l:');
    expect(css).not.toContain('calc(');
  });

  it('does not emit unused configured colors', async () => {
    const { css } = await generate('<div class="c-mc-primary"></div>', { colors: { primary: 'rose', secondary: 'blue' } });

    expect(css).toContain('--mc-primary-color:');
    expect(css).not.toContain('--mc-secondary-color:');
  });

  it('does not generate arbitrary-depth variables without extractor scan', async () => {
    const { css } = await generate(['mc-btn_red', 'bg-mc-btn-640']);

    expect(css).not.toContain('--mc-btn-color:');
    expect(css).not.toContain('--mc-btn-640-color:');
    expect(css).not.toContain('--mc-btn-50-l:');
    expect(css).not.toContain('--mc-btn-950-l:');
    expect(css).not.toContain('--mc-btn-640-l:');
    expect(css).not.toContain('calc(');
  });

  it('generates configured theme color variables in preflight', async () => {
    const { css } = await generate('<div class="bg-mc-rose-445"></div>');

    expect(css).toContain(':root');
    expect(css).not.toContain('--mc-rose-color:');
    expect(css).toMatch(/--mc-rose-445-color:\s*oklch\(/);
    expect(css).toContain('var(--mc-rose-445-color)');
    expect(css).not.toContain('--mc-rose-400-l:');
    expect(css).not.toContain('--mc-rose-500-l:');
    expect(css).not.toContain('calc(');
  });

  it('generates configured base variables only when base color is used', async () => {
    const { css } = await generate('<div class="c-mc-primary c-mc-rose"></div>', { colors: { primary: 'rose' } });

    expect(css).toContain('--mc-primary-color:');
    expect(css).toContain('--mc-rose-color:');
    expect(css).toContain('var(--mc-primary-color)');
    expect(css).toContain('var(--mc-rose-color)');
    expect(css).not.toContain('--mc-primary-500-color:');
    expect(css).not.toContain('--mc-rose-500-color:');
  });

  it('keeps bracket arbitrary colors as direct computed values', async () => {
    const { css } = await generate('<div class="c-mc-[#789411]-430"></div>');

    expect(css).toMatch(/color:color-mix\(in oklab, oklch\(/);
    expect(css).not.toContain('--mc-[#789411]-430-color');
    expect(css).not.toContain('calc(');
  });
});

describe('updateMagicColor', () => {
  it('writes direct color variables without oklch channel variables', () => {
    const dom = document.createElement('div');

    updateMagicColor({ name: 'primary', color: '#9c1d1e-457', dom });

    expect(dom.style.getPropertyValue('--mc-primary-color')).toContain('oklch(');
    expect(dom.style.getPropertyValue('--mc-primary-50-color')).toContain('oklch(');
    expect(dom.style.getPropertyValue('--mc-primary-950-color')).toContain('oklch(');
    expect(dom.style.getPropertyValue('--mc-primary-500-l')).toBe('');
    expect(dom.style.cssText).not.toContain('-l:');
    expect(dom.style.cssText).not.toContain('-c:');
    expect(dom.style.cssText).not.toContain('-h:');
    expect(dom.style.cssText).not.toContain('calc(');
  });
});

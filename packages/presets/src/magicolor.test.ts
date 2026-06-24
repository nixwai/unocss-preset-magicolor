import { createGenerator, presetWind4 } from 'unocss';
import { describe, expect, it } from 'vitest';
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
    expect(css).toContain('--mc-btn-200-l:');
    expect(css).toContain('--mc-btn-600-l:');
    expect(css).toContain('--mc-btn-700-l:');
    expect(css).toContain('--mc-btn-640-color:oklch(calc(');
    expect(css).not.toContain('--mc-btn-50-l:');
    expect(css).not.toContain('--mc-btn-100-l:');
    expect(css).not.toContain('--mc-btn-300-l:');
    expect(css).not.toContain('--mc-btn-400-l:');
    expect(css).not.toContain('--mc-btn-500-l:');
    expect(css).not.toContain('--mc-btn-800-l:');
    expect(css).not.toContain('--mc-btn-900-l:');
    expect(css).not.toContain('--mc-btn-950-l:');
  });

  it('uses generated depth color variables without per-selector channel variables', async () => {
    const { css } = await generate('<div class="mc-btn_red bg-mc-btn-640"></div>');

    expect(css).toContain('var(--mc-btn-640-color)');
    expect(css).not.toContain('--mc-btn-640-l:');
    expect(css).not.toContain('--mc-btn-640-c:');
    expect(css).not.toContain('--mc-btn-640-h:');
    expect(css).not.toContain('.bg-mc-btn-640{--mc-btn-640');
  });

  it('tracks custom color depths with opacity modifiers', async () => {
    const { css } = await generate('<div class="mc-btn_red bg-mc-btn-640/50"></div>');

    expect(css).toContain('--mc-btn-600-l:');
    expect(css).toContain('--mc-btn-700-l:');
    expect(css).toContain('--mc-btn-640-color:oklch(calc(');
    expect(css).toContain('var(--mc-btn-640-color)');
    expect(css).not.toContain('.bg-mc-btn-640\\/50{--mc-btn-640');
    expect(css).not.toContain('--mc-btn-500-l:');
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
    expect(css).toContain('--mc-primary-color:');
    expect(css).toContain('--mc-primary-400-l:');
    expect(css).toContain('--mc-primary-500-l:');
    expect(css).toMatch(/--mc-primary-457-color:\s*oklch\(calc\(/);
    expect(css).toContain('var(--mc-primary-457-color)');
    expect(css).not.toContain('--mc-primary-50-l:');
    expect(css).not.toContain('--mc-primary-600-l:');
    expect(css).not.toContain('--mc-primary-950-l:');
  });

  it('falls back to full variables when generation has no extractor scan', async () => {
    const { css } = await generate(['mc-btn_red', 'bg-mc-btn-640']);

    expect(css).toContain('--mc-btn-50-l:');
    expect(css).toContain('--mc-btn-950-l:');
    expect(css).toContain('--mc-btn-640-l:calc(');
    expect(css).toContain('oklch(var(--mc-btn-640-l) var(--mc-btn-640-c) var(--mc-btn-640-h))');
  });
});

import { resolveColorParts, splitColorParts } from '@unocss-preset-magicolor/utils';
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

  it('tracks magic color utilities expanded from user shortcuts', async () => {
    const uno = await createGenerator({
      presets: [
        presetWind4(),
        presetMagicolor({ colors: { primary: 'rose' } }),
      ],
      shortcuts: [
        ['btn', 'bg-mc-primary hover:bg-mc-primary-630 text-white'],
      ],
    });

    const { css } = await uno.generate('<button class="btn"></button>', { preflights: true, id: 'shortcut.vue' });

    expect(css).toContain('--mc-primary-color:');
    expect(css).toMatch(/--mc-primary-630-color:\s*oklch\(/);
    expect(css).toContain('var(--mc-primary-color)');
    expect(css).toContain('var(--mc-primary-630-color)');
  });

  it('drops shortcut-expanded usage when the same input id no longer uses the shortcut', async () => {
    const uno = await createGenerator({
      presets: [
        presetWind4(),
        presetMagicolor({ colors: { primary: 'rose' } }),
      ],
      shortcuts: [
        ['btn', 'bg-mc-primary hover:bg-mc-primary-630 text-white'],
      ],
    });

    const first = await uno.generate('<button class="btn"></button>', { preflights: true, id: 'shortcut.vue' });
    expect(first.css).toContain('--mc-primary-color:');
    expect(first.css).toMatch(/--mc-primary-630-color:\s*oklch\(/);

    const second = await uno.generate('<button class="text-white"></button>', { preflights: true, id: 'shortcut.vue' });
    expect(second.css).not.toContain('--mc-primary-color:');
    expect(second.css).not.toContain('--mc-primary-630-color:');
    expect(second.css).not.toContain('var(--mc-primary-color)');
    expect(second.css).not.toContain('var(--mc-primary-630-color)');
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

  it('matches compact magic color depths without a hyphen separator', async () => {
    const { css } = await generate(
      '<div class="mc-btn_red bg-mc-grape120:20 bg-mc-grape123 bg-mc-grape-120 c-mc-btn230 c-mc-btn-230 c-mc-brand20"></div>',
      { colors: { brand: 'blue', grape: 'rose' } },
    );

    expect(css).toMatch(/--mc-brand-20-color:\s*oklch\(/);
    expect(css).toMatch(/--mc-grape-120-color:\s*oklch\(/);
    expect(css).toMatch(/--mc-grape-123-color:\s*oklch\(/);
    expect(css).toMatch(/--mc-btn-230-color:\s*oklch\(/);
    expect(css).toContain('var(--mc-brand-20-color)');
    expect(css).toContain('var(--mc-grape-120-color)');
    expect(css).toContain('var(--mc-grape-123-color)');
    expect(css).toContain('var(--mc-btn-230-color)');
    expect(css).not.toContain('--mc-brand20-color:');
    expect(css).not.toContain('--mc-grape120-color:');
    expect(css).not.toContain('--mc-grape123-color:');
    expect(css).not.toContain('--mc-btn230-color:');
  });

  it('matches hyphenated magic color names with depth and modifiers', async () => {
    const { css } = await generate(
      '<div class="c-mc-red-123 c-mc-btn-230 c-mc-my-btn-630 c-mc-gg-560:20 c-mc-aa-99/20 c-mc-ss:30 c-mc-qq/34:20"></div>',
      {
        colors: {
          'btn': 'blue',
          'my-btn': 'green',
          'gg': 'yellow',
          'aa': 'pink',
          'ss': 'rose',
          'qq': 'cyan',
        },
      },
    );

    expect(css).toContain('--mc-red-123-color:');
    expect(css).toContain('--mc-btn-230-color:');
    expect(css).toContain('--mc-my-btn-630-color:');
    expect(css).toContain('--mc-gg-560-color:');
    expect(css).toContain('--mc-aa-99-color:');
    expect(css).toContain('--mc-ss-color:');
    expect(css).toContain('--mc-qq-color:');
    expect(css).not.toContain('--mc-gg-color:');
    expect(css).not.toContain('--mc-aa-color:');
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

  it('supports bracket arbitrary colors with legal CSS color syntaxes', async () => {
    const { css } = await generate([
      'c-mc-[#789411]-430',
      'bg-mc-[#1313aa]1200',
      'bg-mc-[rgb(12,22,33)]',
      'bg-mc-[rgb(12_22_33)]-220',
      'bg-mc-[hsl(210_60%_40%)]-300',
      'bg-mc-[lab(60_20_10)]-350',
      'bg-mc-[lch(40_20_21.57)]-400',
      'bg-mc-[oklch(40.1%_0.123_21.57)]-200',
      'bg-mc-[oklab(40.1%_0.1_0.2)]-500',
    ]);

    expect(css).toMatch(/color:color-mix\(in oklab, oklch\(/);
    expect(css).toContain('.bg-mc-\\[\\#1313aa\\]1200{background-color:color-mix(in oklab, oklch(');
    expect(css).toContain('.bg-mc-\\[rgb\\(12\\,22\\,33\\)\\]{background-color:color-mix(in oklab, rgb(12,22,33)');
    expect(css).toContain('.bg-mc-\\[rgb\\(12_22_33\\)\\]-220{background-color:color-mix(in oklab, oklch(');
    expect(css).toContain('.bg-mc-\\[hsl\\(210_60\\%_40\\%\\)\\]-300{background-color:color-mix(in oklab, oklch(');
    expect(css).toContain('.bg-mc-\\[lab\\(60_20_10\\)\\]-350{background-color:color-mix(in oklab, oklch(');
    expect(css).toContain('.bg-mc-\\[lch\\(40_20_21\\.57\\)\\]-400{background-color:color-mix(in oklab, oklch(');
    expect(css).toContain('.bg-mc-\\[oklch\\(40\\.1\\%_0\\.123_21\\.57\\)\\]-200{background-color:color-mix(in oklab, oklch(');
    expect(css).toContain('.bg-mc-\\[oklab\\(40\\.1\\%_0\\.1_0\\.2\\)\\]-500{background-color:color-mix(in oklab, oklch(');
    expect(css).not.toContain('--mc-[#789411]-430-color');
    expect(css).not.toContain('--mc-[#1313aa]-1200-color');
    expect(css).not.toContain('calc(');
  });
});

describe('color parsing utilities', () => {
  it('parses bracket arbitrary colors with optional depth suffixes', () => {
    expect(resolveColorParts('[#1313aa]1200')).toEqual({ originColor: '[#1313aa]', bodyNo: '1200' });
    expect(resolveColorParts('[rgb(12,22,33)]')).toEqual({ originColor: '[rgb(12,22,33)]', bodyNo: undefined });
    expect(resolveColorParts('[hsl(210_60%_40%)]-300')).toEqual({ originColor: '[hsl(210_60%_40%)]', bodyNo: '300' });
    expect(resolveColorParts('[lab(60_20_10)]-350')).toEqual({ originColor: '[lab(60_20_10)]', bodyNo: '350' });
    expect(resolveColorParts('[lch(40_20_21.57)]-400')).toEqual({ originColor: '[lch(40_20_21.57)]', bodyNo: '400' });
    expect(resolveColorParts('[oklch(40.1%_0.123_21.57)]-200')).toEqual({ originColor: '[oklch(40.1%_0.123_21.57)]', bodyNo: '200' });
  });

  it('keeps opacity and modifiers outside bracket arbitrary colors', () => {
    expect(splitColorParts('[oklch(20.1%_0.1_20/50)]-200/40:dark')).toEqual(['[oklch(20.1%_0.1_20/50)]-200', '40', 'dark']);
  });
});

describe('updateMagicColor', () => {
  it('writes only defined direct color variables without oklch channel variables', () => {
    const dom = document.createElement('div');
    dom.style.setProperty('--mc-primary-color', 'red');
    dom.style.setProperty('--mc-primary-457-color', 'red');

    updateMagicColor({ name: 'primary', color: '#9c1d1e-457', dom });

    expect(dom.style.getPropertyValue('--mc-primary-color')).toContain('oklch(');
    expect(dom.style.getPropertyValue('--mc-primary-457-color')).toContain('oklch(');
    expect(dom.style.getPropertyValue('--mc-primary-50-color')).toBe('');
    expect(dom.style.getPropertyValue('--mc-primary-950-color')).toBe('');
    expect(dom.style.getPropertyValue('--mc-primary-500-l')).toBe('');
    expect(dom.style.cssText).not.toContain('-l:');
    expect(dom.style.cssText).not.toContain('-c:');
    expect(dom.style.cssText).not.toContain('-h:');
    expect(dom.style.cssText).not.toContain('calc(');
  });

  it('writes arbitrary depth variables defined on the target dom', () => {
    const dom = document.createElement('div');
    dom.style.setProperty('--mc-primary-457-color', 'red');

    updateMagicColor({ name: 'primary', color: '#9c1d1e', dom });

    expect(dom.style.getPropertyValue('--mc-primary-457-color')).toContain('oklch(');
    expect(dom.style.getPropertyValue('--mc-primary-color')).toBe('');
    expect(dom.style.getPropertyValue('--mc-primary-50-color')).toBe('');
    expect(dom.style.getPropertyValue('--mc-primary-950-color')).toBe('');
  });

  it('reads defined color variables from computed styles', () => {
    const style = document.createElement('style');
    const dom = document.createElement('div');
    style.textContent = '.magic-color-scope { --mc-primary-color: red; --mc-primary-457-color: red; }';
    dom.className = 'magic-color-scope';
    document.head.append(style);
    document.body.append(dom);

    try {
      updateMagicColor({ name: 'primary', color: '#9c1d1e', dom });

      expect(dom.style.getPropertyValue('--mc-primary-color')).toContain('oklch(');
      expect(dom.style.getPropertyValue('--mc-primary-457-color')).toContain('oklch(');
    }
    finally {
      dom.remove();
      style.remove();
    }
  });

  it('writes multiple arbitrary depth variables defined on the target dom', () => {
    const dom = document.createElement('div');
    dom.style.setProperty('--mc-primary-630-color', 'red');
    dom.style.setProperty('--mc-primary-230-color', 'red');

    updateMagicColor({ name: 'primary', color: '#9c1d1e', dom });

    expect(dom.style.getPropertyValue('--mc-primary-630-color')).toContain('oklch(');
    expect(dom.style.getPropertyValue('--mc-primary-230-color')).toContain('oklch(');
  });

  it('only writes arbitrary depth variables for the target color name', () => {
    const dom = document.createElement('div');
    dom.style.setProperty('--mc-primary-457-color', 'red');
    dom.style.setProperty('--mc-secondary-630-color', 'red');

    updateMagicColor({ name: 'primary', color: '#9c1d1e', dom });

    expect(dom.style.getPropertyValue('--mc-primary-457-color')).toContain('oklch(');
    expect(dom.style.getPropertyValue('--mc-secondary-630-color')).toBe('red');
  });

  it('does not infer depth variables from classes when css variables are absent', () => {
    const dom = document.createElement('div');
    dom.innerHTML = '<button class="bg-mc-primary-457"></button>';

    updateMagicColor({ name: 'primary', color: '#9c1d1e', dom });

    expect(dom.style.getPropertyValue('--mc-primary-457-color')).toBe('');
  });
});

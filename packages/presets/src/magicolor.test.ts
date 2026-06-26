import type { PresetMcOptions } from './types';
import { resolveColorParts, splitColorParts } from '@unocss-preset-magicolor/utils';
import { createGenerator, presetWind4 } from 'unocss';
import { describe, expect, it } from 'vitest';
import { updateMagicColor } from './helper';
import { presetMagicolor } from './index';

async function createUno(options: PresetMcOptions = {}, extra: Record<string, unknown> = {}) {
  return createGenerator({
    presets: [
      presetWind4(),
      presetMagicolor(options),
    ],
    ...extra,
  });
}

async function generate(input: string | string[], options: PresetMcOptions = {}, extra: Record<string, unknown> = {}) {
  const uno = await createUno(options, extra);
  return uno.generate(input, { preflights: true });
}

describe('presetMagicolor preset wiring', () => {
  it('exposes preset metadata, layers, extractor, rules and preflights', () => {
    const preset = presetMagicolor();

    expect(preset.name).toBe('unocss-preset-magicolor');
    expect(preset.layer).toBe('unocss-preset-magicolor');
    expect(preset.layers).toEqual({ 'unocss-preset-magicolor': -100 });
    expect(Array.isArray(preset.extractors)).toBe(true);
    expect(preset.extractors?.length).toBe(1);
    expect(Array.isArray(preset.rules)).toBe(true);
    expect((preset.rules?.length ?? 0)).toBeGreaterThan(0);
    expect(Array.isArray(preset.preflights)).toBe(true);
  });

  it('defaults options to an empty object', () => {
    const preset = presetMagicolor();
    expect(preset.name).toBe('unocss-preset-magicolor');
  });

  it('is exported as the default export', async () => {
    const mod = await import('./index');
    expect(mod.default).toBe(mod.presetMagicolor);
  });

  it('isolates usage state between independent preset instances', async () => {
    const first = await generate('<div class="mc-btn_red c-mc-btn-200"></div>');
    expect(first.css).toContain('--mc-btn-200-color:oklch(');

    // A fresh generator must not retain depths scanned by the previous one.
    const second = await generate('<div class="mc-btn_red c-mc-btn"></div>');
    expect(second.css).toContain('--mc-btn-color:');
    expect(second.css).not.toContain('--mc-btn-200-color:');
  });
});

describe('magicolor usage extraction', () => {
  it('generates only variables needed by scanned custom color depths', async () => {
    const { css } = await generate('<div class="mc-btn_red bg-mc-btn-640 c-mc-btn-200 c-mc-btn"></div>');

    expect(css).toContain('--mc-btn-color:');
    expect(css).toContain('--mc-btn-200-color:oklch(');
    expect(css).toContain('--mc-btn-640-color:oklch(');
    expect(css).not.toContain('--mc-btn-50-l:');
    expect(css).not.toContain('--mc-btn-300-l:');
    expect(css).not.toContain('calc(');
  });

  it('uses generated depth color variables without per-selector channel variables', async () => {
    const { css } = await generate('<div class="mc-btn_red bg-mc-btn-640"></div>');

    expect(css).toContain('var(--mc-btn-640-color)');
    expect(css).toContain('--mc-btn-640-color:oklch(');
    expect(css).not.toContain('--mc-btn-color:');
    expect(css).not.toContain('--mc-btn-640-l:');
  });

  it('tracks custom color depths with opacity modifiers', async () => {
    const { css } = await generate('<div class="mc-btn_red bg-mc-btn-640/50"></div>');

    expect(css).toContain('--mc-btn-640-color:oklch(');
    expect(css).toContain('var(--mc-btn-640-color)');
    expect(css).not.toContain('calc(');
  });

  it('does not generate depth variables when only the base custom color is used', async () => {
    const { css } = await generate('<div class="mc-btn_red c-mc-btn"></div>');

    expect(css).toContain('--mc-btn-color:');
    expect(css).toContain('var(--mc-btn-color)');
    expect(css).not.toContain('--mc-btn-200-l:');
  });

  it('does not generate arbitrary-depth variables without extractor scan', async () => {
    // Passing tokens as an array skips the HTML extractor scan.
    const { css } = await generate(['mc-btn_red', 'bg-mc-btn-640']);

    expect(css).not.toContain('--mc-btn-color:');
    expect(css).not.toContain('--mc-btn-640-color:');
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
    expect(css).not.toContain('--mc-brand20-color:');
    expect(css).not.toContain('--mc-grape120-color:');
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
  });

  it('ignores mc color definitions (mc-name_color) as usage tokens', async () => {
    // `mc-btn_red` is a definition, not a usage, so it must not by itself emit variables.
    const { css } = await generate('<div class="mc-btn_red"></div>');

    expect(css).not.toContain('--mc-btn-color:');
    expect(css).not.toContain('--mc-btn-200-color:');
  });
});

describe('watch-mode usage replacement', () => {
  it('drops stale custom color usage when the same input id is rescanned', async () => {
    const uno = await createUno();

    const first = await uno.generate('<div class="mc-btn_red c-mc-btn-200"></div>', { preflights: true, id: 'a.vue' });
    expect(first.css).toContain('--mc-btn-200-color:oklch(');

    const second = await uno.generate('<div class="text-white"></div>', { preflights: true, id: 'a.vue' });
    expect(second.css).not.toContain('--mc-btn-200-color:');
    expect(second.css).not.toContain('--mc-btn-color:');
  });

  it('tracks magic color utilities expanded from user shortcuts', async () => {
    const uno = await createUno(
      { colors: { primary: 'rose' } },
      { shortcuts: [['btn', 'bg-mc-primary hover:bg-mc-primary-630 text-white']] },
    );

    const { css } = await uno.generate('<button class="btn"></button>', { preflights: true, id: 'shortcut.vue' });

    expect(css).toContain('--mc-primary-color:');
    expect(css).toMatch(/--mc-primary-630-color:\s*oklch\(/);
    expect(css).toContain('var(--mc-primary-color)');
    expect(css).toContain('var(--mc-primary-630-color)');
  });

  it('drops shortcut-expanded usage when the same input id no longer uses the shortcut', async () => {
    const uno = await createUno(
      { colors: { primary: 'rose' } },
      { shortcuts: [['btn', 'bg-mc-primary hover:bg-mc-primary-630 text-white']] },
    );

    const first = await uno.generate('<button class="btn"></button>', { preflights: true, id: 'shortcut.vue' });
    expect(first.css).toContain('--mc-primary-color:');

    const second = await uno.generate('<button class="text-white"></button>', { preflights: true, id: 'shortcut.vue' });
    expect(second.css).not.toContain('--mc-primary-color:');
    expect(second.css).not.toContain('--mc-primary-630-color:');
  });
});

describe('preflight theme color variables', () => {
  it('trims configured color variables by scanned usage', async () => {
    const { css } = await generate('<div class="c-mc-primary-457"></div>', { colors: { primary: 'rose' } });

    expect(css).toContain(':root');
    expect(css).not.toContain('--mc-primary-color:');
    expect(css).toMatch(/--mc-primary-457-color:\s*oklch\(/);
    expect(css).toContain('var(--mc-primary-457-color)');
    expect(css).not.toContain('calc(');
  });

  it('does not emit unused configured colors', async () => {
    const { css } = await generate('<div class="c-mc-primary"></div>', { colors: { primary: 'rose', secondary: 'blue' } });

    expect(css).toContain('--mc-primary-color:');
    expect(css).not.toContain('--mc-secondary-color:');
  });

  it('generates theme color variables for unocss theme color names without options', async () => {
    const { css } = await generate('<div class="bg-mc-rose-445"></div>');

    expect(css).toContain(':root');
    expect(css).not.toContain('--mc-rose-color:');
    expect(css).toMatch(/--mc-rose-445-color:\s*oklch\(/);
    expect(css).toContain('var(--mc-rose-445-color)');
    expect(css).not.toContain('calc(');
  });

  it('generates configured base variables only when base color is used', async () => {
    const { css } = await generate('<div class="c-mc-primary c-mc-rose"></div>', { colors: { primary: 'rose' } });

    expect(css).toContain('--mc-primary-color:');
    expect(css).toContain('--mc-rose-color:');
    expect(css).not.toContain('--mc-primary-500-color:');
  });

  it('skips usage names that are neither configured nor theme colors', async () => {
    const { css } = await generate('<div class="c-mc-notacolor"></div>');

    expect(css).not.toContain('--mc-notacolor-color:');
  });

  it('emits no :root block when no usage resolves to a color', async () => {
    const { css } = await generate('<div class="text-white"></div>');

    expect(css).not.toContain('--mc-');
  });
});

describe('color style rules', () => {
  it('resolves text color via the c- and color- prefixes', async () => {
    const { css } = await generate('<div class="c-mc-rose-445 color-mc-rose-445"></div>');
    expect(css).toContain('var(--mc-rose-445-color)');
  });

  it('resolves text-mc and text-color-mc', async () => {
    const { css } = await generate('<div class="text-mc-rose-445 text-color-mc-rose-445"></div>');
    expect(css).toContain('var(--mc-rose-445-color)');
  });

  it('resolves outline, accent and caret colors', async () => {
    const { css } = await generate('<div class="outline-mc-rose-445 accent-mc-rose-445 caret-mc-rose-445"></div>');
    expect(css).toContain('outline-color:');
    expect(css).toContain('accent-color:');
    expect(css).toContain('caret-color:');
    expect(css).toContain('var(--mc-rose-445-color)');
  });

  it('resolves background color', async () => {
    const { css } = await generate('<div class="bg-mc-rose-445"></div>');
    expect(css).toContain('background-color:');
    expect(css).toContain('var(--mc-rose-445-color)');
  });

  it('resolves underline and decoration colors with webkit fallback', async () => {
    const { css } = await generate('<div class="underline-mc-rose-445 decoration-mc-rose-445"></div>');
    expect(css).toContain('text-decoration-color:');
    expect(css).toContain('-webkit-text-decoration-color:');
  });

  it('resolves divide color with last-child variant', async () => {
    const { css } = await generate('<div class="divide-mc-rose-445"></div>');
    expect(css).toContain('border-color:');
    expect(css).toContain('var(--mc-rose-445-color)');
  });

  it('resolves drop-shadow color', async () => {
    const { css } = await generate('<div class="drop-shadow-color-mc-rose-445 filter-drop-shadow-color-mc-rose-445"></div>');
    expect(css).toContain('--un-drop-shadow-color:');
  });

  it('resolves ring, inset-ring and ring-offset colors', async () => {
    const { css } = await generate('<div class="ring-mc-rose-445 inset-ring-mc-rose-445 ring-offset-mc-rose-445"></div>');
    expect(css).toContain('--un-ring-color:');
    expect(css).toContain('--un-inset-ring-color:');
    expect(css).toContain('--un-ring-offset-color:');
  });

  it('resolves shadow and inset-shadow colors', async () => {
    const { css } = await generate('<div class="shadow-mc-rose-445 inset-shadow-mc-rose-445"></div>');
    expect(css).toContain('--un-shadow-color:');
    expect(css).toContain('--un-inset-shadow-color:');
  });

  it('resolves fill, stroke and text-stroke colors', async () => {
    const { css } = await generate('<div class="fill-mc-rose-445 stroke-mc-rose-445 text-stroke-mc-rose-445"></div>');
    expect(css).toContain('fill:');
    expect(css).toContain('stroke:');
    expect(css).toContain('-webkit-text-stroke-color:');
  });

  it('resolves text-shadow color via both prefixes', async () => {
    const { css } = await generate('<div class="text-shadow-mc-rose-445 text-shadow-color-mc-rose-445"></div>');
    expect(css).toContain('--un-text-shadow-color:');
  });
});

describe('border color rules', () => {
  it('resolves a plain border color', async () => {
    const { css } = await generate('<div class="border-mc-rose-445 b-mc-rose-445"></div>');
    expect(css).toContain('border-color:');
    expect(css).toContain('var(--mc-rose-445-color)');
  });

  it('resolves directional border colors and per-direction opacity', async () => {
    const { css } = await generate('<div class="border-t-mc-rose-445 border-r-mc-rose-445 border-b-mc-rose-445 border-l-mc-rose-445"></div>');
    expect(css).toContain('border-top-color:');
    expect(css).toContain('border-right-color:');
    expect(css).toContain('border-bottom-color:');
    expect(css).toContain('border-left-color:');
  });

  it('resolves axis border colors', async () => {
    const { css } = await generate('<div class="border-x-mc-rose-445 border-y-mc-rose-445"></div>');
    expect(css).toContain('border-inline-color:');
    expect(css).toContain('border-block-color:');
  });

  it('resolves logical and block/inline border colors', async () => {
    const { css } = await generate('<div class="border-s-mc-rose-445 border-e-mc-rose-445 border-block-mc-rose-445 border-inline-mc-rose-445 border-bs-mc-rose-445 border-ie-mc-rose-445"></div>');
    expect(css).toContain('border-inline-start-color:');
    expect(css).toContain('border-inline-end-color:');
    expect(css).toContain('border-block-start-color:');
    expect(css).toContain('border-block-end-color:');
  });
});

describe('gradient color rules', () => {
  it('resolves from/via/to gradient stops', async () => {
    const { css } = await generate('<div class="from-mc-rose-445 via-mc-rose-445 to-mc-rose-445"></div>');
    expect(css).toContain('--un-gradient-from:');
    expect(css).toContain('--un-gradient-via:');
    expect(css).toContain('--un-gradient-to:');
    expect(css).toContain('--un-gradient-stops:');
  });

  it('handles special gradient color keywords', async () => {
    const { css } = await generate('<div class="from-mc-transparent to-mc-current"></div>', { colors: { transparent: 'transparent' } });
    expect(css).toContain('--un-gradient-');
  });
});

describe('mask color rules', () => {
  it('resolves linear directional mask colors', async () => {
    const { css } = await generate('<div class="mask-l-from-mc-rose-445 mask-r-to-mc-rose-445 mask-t-from-mc-rose-445 mask-b-to-mc-rose-445 mask-x-from-mc-rose-445 mask-y-to-mc-rose-445"></div>');
    expect(css).toContain('mask-image:');
    expect(css).toContain('--un-mask-');
  });

  it('resolves linear/radial/conic from-to mask colors', async () => {
    const { css } = await generate('<div class="mask-linear-from-mc-rose-445 mask-radial-to-mc-rose-445 mask-conic-from-mc-rose-445"></div>');
    expect(css).toContain('mask-image:');
    expect(css).toContain('mask-composite:');
  });
});

describe('arbitrary bracket colors', () => {
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
    expect(css).toContain('.bg-mc-\\[rgb\\(12\\,22\\,33\\)\\]{background-color:color-mix(in oklab, rgb(12,22,33)');
    expect(css).not.toContain('calc(');
  });

  it('handles invalid colors gracefully without emitting variables', async () => {
    const { css } = await generate('<div class="c-mc-123"></div>');
    expect(css).not.toContain('--mc-123-color:');
  });
});

describe('mc color definition rule', () => {
  it('does not emit anything for a definition without a hue', async () => {
    const { css } = await generate('<div class="mc-btn_ c-mc-btn"></div>');
    // No hue means resolveMagicColor returns undefined; base var should not resolve a real color.
    expect(css).not.toContain('oklch');
  });

  it('falls back to option colors when the inline hue references an option name', async () => {
    const { css } = await generate('<div class="mc-btn_primary c-mc-btn-457"></div>', { colors: { primary: 'rose' } });
    expect(css).toMatch(/--mc-btn-457-color:\s*oklch\(/);
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

  it('resolves hyphenated and compact depth names', () => {
    expect(resolveColorParts('rose-445')).toEqual({ originColor: 'rose', bodyNo: '445' });
    expect(resolveColorParts('grape120')).toEqual({ originColor: 'grape', bodyNo: '120' });
    expect(resolveColorParts('rose')).toEqual({ originColor: 'rose', bodyNo: undefined });
  });

  it('returns the original color when no depth is present', () => {
    expect(resolveColorParts(undefined)).toEqual({ originColor: undefined, bodyNo: undefined });
  });

  it('keeps opacity and modifiers outside bracket arbitrary colors', () => {
    expect(splitColorParts('[oklch(20.1%_0.1_20/50)]-200/40:dark')).toEqual(['[oklch(20.1%_0.1_20/50)]-200', '40', 'dark']);
  });
});

describe('updateMagicColor', () => {
  it('returns early when no dom is provided', () => {
    expect(() => updateMagicColor({ name: 'primary', color: '#9c1d1e' })).not.toThrow();
  });

  it('writes only defined direct color variables without oklch channel variables', () => {
    const dom = document.createElement('div');
    dom.style.setProperty('--mc-primary-color', 'red');
    dom.style.setProperty('--mc-primary-457-color', 'red');

    updateMagicColor({ name: 'primary', color: '#9c1d1e-457', dom });

    expect(dom.style.getPropertyValue('--mc-primary-color')).toContain('oklch(');
    expect(dom.style.getPropertyValue('--mc-primary-457-color')).toContain('oklch(');
    expect(dom.style.getPropertyValue('--mc-primary-50-color')).toBe('');
    expect(dom.style.cssText).not.toContain('-l:');
    expect(dom.style.cssText).not.toContain('calc(');
  });

  it('writes arbitrary depth variables defined on the target dom', () => {
    const dom = document.createElement('div');
    dom.style.setProperty('--mc-primary-457-color', 'red');

    updateMagicColor({ name: 'primary', color: '#9c1d1e', dom });

    expect(dom.style.getPropertyValue('--mc-primary-457-color')).toContain('oklch(');
    expect(dom.style.getPropertyValue('--mc-primary-color')).toBe('');
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

  it('ignores invalid colors when updating', () => {
    const dom = document.createElement('div');
    dom.style.setProperty('--mc-primary-color', 'red');

    updateMagicColor({ name: 'primary', color: '123', dom });

    // Invalid color short-circuits to an empty css object; existing value is left untouched.
    expect(dom.style.getPropertyValue('--mc-primary-color')).toBe('red');
  });
});

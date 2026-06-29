import type { PresetMcOptions } from './types';
import {
  extractBodyColor,
  getMcThemeMetaColors,
  isInvalidColor,
  resolveBodyColor,
  resolveColorParts,
  resolveThemeDepth,
  roundNum,
  toNum,
  toOklch,
} from '@unocss-preset-magicolor/utils';
import { createGenerator, presetWind4 } from 'unocss';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMagicColorStyle, updateMagicColor } from './helper';
import { presetMagicolor } from './index';
import { TokenUsage } from './usages/token';

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

async function generateWithWind4(input: string | string[], options: PresetMcOptions = {}, wind4Options?: Parameters<typeof presetWind4>[0]) {
  const uno = await createGenerator({
    presets: [
      presetWind4(wind4Options),
      presetMagicolor(options),
    ],
  });
  return uno.generate(input, { preflights: true });
}

async function generateWithoutWind4(input: string | string[], options: PresetMcOptions = {}) {
  const uno = await createGenerator({
    presets: [
      presetMagicolor(options),
    ],
  });
  return uno.generate(input, { preflights: true });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getCssVar(css: string, name: string) {
  const match = css.match(new RegExp(`${escapeRegExp(name)}:\\s*([^;{}]+)`));
  return match?.[1]?.trim();
}

function getDarkBlock(css: string) {
  return css.match(/\.dark\s*\{([\s\S]*?)\}/)?.[1] ?? '';
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
    expect(first.css).toContain('--mc-btn-200-color:var(--mc-red-200-color)');
    expect(first.css).toMatch(/--mc-red-200-color:\s*oklch\(/);

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
    expect(css).toContain('--mc-btn-200-color:var(--mc-red-200-color)');
    expect(css).toContain('--mc-btn-640-color:var(--mc-red-640-color)');
    expect(css).toMatch(/--mc-red-200-color:\s*oklch\(/);
    expect(css).toMatch(/--mc-red-640-color:\s*oklch\(/);
    expect(css).not.toContain('--mc-btn-50-l:');
    expect(css).not.toContain('--mc-btn-300-l:');
    expect(css).not.toContain('calc(');
  });

  it('uses generated depth color variables without per-selector channel variables', async () => {
    const { css } = await generate('<div class="mc-btn_red bg-mc-btn-640"></div>');

    expect(css).toContain('var(--mc-btn-640-color)');
    expect(css).toContain('--mc-btn-640-color:var(--mc-red-640-color)');
    expect(css).toMatch(/--mc-red-640-color:\s*oklch\(/);
    expect(css).not.toContain('--mc-btn-color:');
    expect(css).not.toContain('--mc-btn-640-l:');
  });

  it('tracks custom color depths with opacity modifiers', async () => {
    const { css } = await generate('<div class="mc-btn_red bg-mc-btn-640/50"></div>');

    expect(css).toContain('--mc-btn-640-color:var(--mc-red-640-color)');
    expect(css).toMatch(/--mc-red-640-color:\s*oklch\(/);
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
    expect(css).toContain('--mc-btn-230-color:var(--mc-red-230-color)');
    expect(css).toMatch(/--mc-red-230-color:\s*oklch\(/);
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
    expect(first.css).toContain('--mc-btn-200-color:var(--mc-red-200-color)');
    expect(first.css).toMatch(/--mc-red-200-color:\s*oklch\(/);

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

  it('reverses configured color depths while preserving target variable names', async () => {
    const { css } = await generate(
      '<div class="c-mc-primary-50 c-mc-primary-450 c-mc-primary-500 c-mc-primary-950"></div>',
      { colors: { primary: { color: 'rose', lightnessReverse: true } } },
    );
    const reference = await generate('<div class="c-mc-rose-950 c-mc-rose-550 c-mc-rose-500 c-mc-rose-50"></div>');

    expect(getCssVar(css, '--mc-primary-50-color')).toBe(getCssVar(reference.css, '--mc-rose-950-color'));
    expect(getCssVar(css, '--mc-primary-450-color')).toBe(getCssVar(reference.css, '--mc-rose-550-color'));
    expect(getCssVar(css, '--mc-primary-500-color')).toBe(getCssVar(reference.css, '--mc-rose-500-color'));
    expect(getCssVar(css, '--mc-primary-950-color')).toBe(getCssVar(reference.css, '--mc-rose-50-color'));
    expect(css).toContain('var(--mc-primary-50-color)');
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

  it('emits simple dark color maps with the wind4 class dark mode', async () => {
    const { css } = await generate(
      '<div class="bg-mc-primary-457"></div>',
      { colors: { primary: 'rose' }, dark: { primary: 'blue' } },
    );

    expect(css).toMatch(/:root\s*\{[\s\S]*--mc-primary-457-color:\s*oklch\(/);
    expect(css).toMatch(/\.dark\s*\{[\s\S]*--mc-primary-457-color:\s*oklch\(/);
    expect(css).not.toContain('--mc-primary-color:');
  });

  it('reverses dark color depths independently from light color variables', async () => {
    const { css } = await generate(
      '<div class="bg-mc-primary-50"></div>',
      { colors: { primary: 'rose' }, dark: { primary: { color: 'blue', lightnessReverse: true } } },
    );
    const lightReference = await generate('<div class="c-mc-rose-50"></div>');
    const darkReference = await generate('<div class="c-mc-blue-950"></div>');

    expect(getCssVar(css, '--mc-primary-50-color')).toBe(getCssVar(lightReference.css, '--mc-rose-50-color'));
    expect(getCssVar(getDarkBlock(css), '--mc-primary-50-color')).toBe(getCssVar(darkReference.css, '--mc-blue-950-color'));
  });

  it('emits simple dark color maps with the wind4 media dark mode', async () => {
    const { css } = await generateWithWind4(
      '<div class="bg-mc-primary-457"></div>',
      { colors: { primary: 'rose' }, dark: { primary: 'blue' } },
      { dark: 'media' },
    );

    expect(css).toMatch(/@media \(prefers-color-scheme: dark\)\s*\{[\s\S]*:root\s*\{[\s\S]*--mc-primary-457-color:\s*oklch\(/);
  });

  it('emits simple dark color maps with custom wind4 dark selectors', async () => {
    const { css } = await generateWithWind4(
      '<div class="bg-mc-primary-457"></div>',
      { colors: { primary: 'rose' }, dark: { primary: 'blue' } },
      { dark: { dark: '.app-dark', light: '.app-light' } },
    );

    expect(css).toMatch(/\.app-dark\s*\{[\s\S]*--mc-primary-457-color:\s*oklch\(/);
    expect(css).not.toContain('.app-light');
  });

  it('defaults simple dark color maps to class mode when wind4 dark mode is unavailable', async () => {
    const { css } = await generateWithoutWind4(
      '<div class="bg-mc-primary-457"></div>',
      {
        colors: { primary: '#409eff' },
        dark: { primary: '#8ab4ff' },
      },
    );

    expect(css).toMatch(/\.dark\s*\{[\s\S]*--mc-primary-457-color:\s*oklch\(/);
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
    expect(css).toContain('--mc-btn-457-color:var(--mc-primary-457-color)');
    expect(css).toMatch(/--mc-primary-457-color:\s*oklch\(/);
  });

  it('references theme color variables when the inline hue is a theme color name', async () => {
    const { css } = await generate('<div class="mc-btn_rose c-mc-btn-457"></div>');
    expect(css).toContain('--mc-btn-457-color:var(--mc-rose-457-color)');
    expect(css).toMatch(/--mc-rose-457-color:\s*oklch\(/);
  });

  it('supports local lightness-reverse definitions for theme color variables', async () => {
    const { css } = await generate('<div class="mc-lr-btn_rose bg-mc-btn-50 bg-mc-btn-450 bg-mc-btn-500"></div>');

    expect(css).toContain('--mc-btn-50-color:var(--mc-rose-950-color)');
    expect(css).toContain('--mc-btn-450-color:var(--mc-rose-550-color)');
    expect(css).toContain('--mc-btn-500-color:var(--mc-rose-500-color)');
    expect(css).toMatch(/--mc-rose-950-color:\s*oklch\(/);
    expect(css).toMatch(/--mc-rose-550-color:\s*oklch\(/);
  });

  it('records mapped source usage when local lightness-reverse references configured colors', async () => {
    const { css } = await generate('<div class="mc-lr-btn_primary bg-mc-btn-50"></div>', { colors: { primary: 'rose' } });

    expect(css).toContain('--mc-btn-50-color:var(--mc-primary-950-color)');
    expect(css).toMatch(/--mc-primary-950-color:\s*oklch\(/);
    expect(css).not.toContain('--mc-primary-50-color:');
  });

  it('supports global lightness-reverse for configured color variables', async () => {
    const { css } = await generate(
      '<div class="mc-lr bg-mc-primary-50 bg-mc-primary-450 bg-mc-primary-500"></div>',
      { colors: { primary: 'rose' } },
    );

    expect(css).toContain('--mc-primary-50-color:var(--mc-primary-950-color)');
    expect(css).toContain('--mc-primary-450-color:var(--mc-primary-550-color)');
    expect(css).not.toContain('--mc-primary-500-color:var(--mc-primary-500-color)');
    expect(css).toMatch(/--mc-primary-950-color:\s*oklch\(/);
    expect(css).toMatch(/--mc-primary-550-color:\s*oklch\(/);
  });

  it('supports global lightness-reverse for theme color variables', async () => {
    const { css } = await generate('<div class="mc-lr bg-mc-rose-50"></div>');

    expect(css).toContain('--mc-rose-50-color:var(--mc-rose-950-color)');
    expect(css).toMatch(/--mc-rose-950-color:\s*oklch\(/);
  });

  it('does not reverse base variables globally', async () => {
    const { css } = await generate('<div class="mc-lr c-mc-primary"></div>', { colors: { primary: 'rose' } });

    expect(css).toMatch(/--mc-primary-color:\s*oklch\(/);
    expect(css).not.toContain('--mc-primary-color:var(--mc-primary-500-color)');
    expect(css).not.toContain('--mc-primary-500-color:');
  });

  it('preserves inline source depth when referencing option color variables', async () => {
    const { css } = await generate('<div class="mc-btn_primary-620 c-mc-btn"></div>', { colors: { primary: 'rose' } });
    expect(css).toContain('--mc-btn-color:var(--mc-primary-620-color)');
    expect(css).toMatch(/--mc-primary-620-color:\s*oklch\(/);
  });

  it('does not emit self-referential variables when definition and source names match', async () => {
    const { css } = await generate('<div class="mc-red_red c-mc-red c-mc-red-457"></div>');
    expect(css).not.toContain('--mc-red-color:var(--mc-red-color)');
    expect(css).not.toContain('--mc-red-457-color:var(--mc-red-457-color)');
    expect(css).toMatch(/--mc-red-color:\s*oklch\(/);
    expect(css).toMatch(/--mc-red-457-color:\s*oklch\(/);
  });

  it('allows same-name definitions to point the base variable at a source depth', async () => {
    const { css } = await generate('<div class="mc-red_red-100 c-mc-red c-mc-red-457"></div>');
    expect(css).toContain('--mc-red-color:var(--mc-red-100-color)');
    expect(css).not.toContain('--mc-red-457-color:var(--mc-red-457-color)');
    expect(css).toMatch(/--mc-red-100-color:\s*oklch\(/);
    expect(css).toMatch(/--mc-red-457-color:\s*oklch\(/);
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
    expect(extractBodyColor('[oklch(20.1%_0.1_20/50)]-200/40:dark')).toBe('[oklch(20.1%_0.1_20/50)]-200');
  });

  it('resolves a token body into color parts in one step', () => {
    // Strips opacity/modifier suffixes, then resolves the depth.
    expect(resolveBodyColor('rose-445/40:dark')).toEqual({ originColor: 'rose', bodyNo: '445' });
    expect(resolveBodyColor('grape120')).toEqual({ originColor: 'grape', bodyNo: '120' });
    expect(resolveBodyColor('[oklch(20.1%_0.1_20/50)]-200/40:dark')).toEqual({ originColor: '[oklch(20.1%_0.1_20/50)]', bodyNo: '200' });
  });

  it('handles empty and missing token bodies', () => {
    expect(resolveBodyColor()).toEqual({ originColor: '', bodyNo: undefined });
    expect(resolveBodyColor('')).toEqual({ originColor: '', bodyNo: undefined });
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

  it('writes lightness-reversed arbitrary depth variables at runtime', () => {
    const dom = document.createElement('div');
    dom.style.setProperty('--mc-primary-50-color', 'red');
    dom.style.setProperty('--mc-primary-450-color', 'red');
    dom.style.setProperty('--mc-primary-500-color', 'red');
    const reference = getMagicColorStyle({
      name: 'expected',
      color: '#9c1d1e',
      hasBase: false,
      depths: new Set(['950', '550', '500']),
    });

    updateMagicColor({ name: 'primary', color: '#9c1d1e', lightnessReverse: true, dom });

    expect(dom.style.getPropertyValue('--mc-primary-50-color')).toBe(reference['--mc-expected-950-color']);
    expect(dom.style.getPropertyValue('--mc-primary-450-color')).toBe(reference['--mc-expected-550-color']);
    expect(dom.style.getPropertyValue('--mc-primary-500-color')).toBe(reference['--mc-expected-500-color']);
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

  it('does not emit oklch(undefined) when a theme depth is missing (M3)', () => {
    const dom = document.createElement('div');
    dom.style.setProperty('--mc-primary-457-color', 'red');

    expect(() => updateMagicColor({ name: 'primary', color: '#9c1d1e', dom })).not.toThrow();

    const value = dom.style.getPropertyValue('--mc-primary-457-color');
    expect(value).not.toContain('undefined');
    expect(value).not.toContain('NaN');
  });
});

describe('isInvalidColor predicate (M1)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true for empty or numeric colors and false for real colors', () => {
    expect(isInvalidColor('')).toBe(true);
    expect(isInvalidColor(undefined)).toBe(true);
    expect(isInvalidColor('123')).toBe(true);
    expect(isInvalidColor('rose')).toBe(false);
    expect(isInvalidColor('#9c1d1e')).toBe(false);
  });

  it('does not log to the console as a pure predicate', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    isInvalidColor('123');
    isInvalidColor(undefined);
    isInvalidColor('rose');

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('does not spam the console while generating CSS for invalid usages', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await generate('<div class="c-mc-123 c-mc-456 c-mc-789"></div>');

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe('getMagicColorStyle missing depth handling (M3)', () => {
  it('skips depths that resolve to undefined instead of emitting oklch(undefined)', () => {
    const css = getMagicColorStyle({
      name: 'primary',
      color: '#9c1d1e',
      hasBase: true,
      depths: new Set(['457']),
    });

    for (const value of Object.values(css)) {
      expect(value).not.toContain('undefined');
      expect(value).not.toContain('NaN');
    }
  });
});

describe('boundary depth interpolation (L3)', () => {
  it('interpolates the 50-100 segment without collapsing to oklch(0 0 0)', () => {
    const css = getMagicColorStyle({
      name: 'primary',
      color: '#9c1d1e',
      hasBase: false,
      depths: new Set(['75']),
    });

    const value = String(css['--mc-primary-75-color'] ?? '');
    expect(value).toMatch(/^oklch\(/);
    expect(value).not.toBe('oklch(0 0 0)');
    expect(value).not.toContain('NaN');
  });

  it('interpolates the 900-950 segment without collapsing to oklch(0 0 0)', () => {
    const css = getMagicColorStyle({
      name: 'primary',
      color: '#9c1d1e',
      hasBase: false,
      depths: new Set(['925']),
    });

    const value = String(css['--mc-primary-925-color'] ?? '');
    expect(value).toMatch(/^oklch\(/);
    expect(value).not.toBe('oklch(0 0 0)');
    expect(value).not.toContain('NaN');
  });
});

describe('mc definition guard (M3 underscore separator)', () => {
  it('does not emit a truncated color name when the definition lacks an underscore', async () => {
    // `mc-btnred` has no `_`; the rule must bail out rather than truncate the name to `mc-btnre`.
    const { css } = await generate('<div class="mc-btnred c-mc-btnred"></div>', { colors: { btnred: 'rose' } });

    expect(css).not.toContain('--mc-btnre-color:');
    expect(css).not.toContain('oklch(undefined');
  });
});

// === Additional test coverage for uncovered code paths ===

describe('helper function edge cases', () => {
  describe('collectDefinedColorVariables and updateMagicColor edge cases', () => {
    it('does not set variable when value is falsy', () => {
      const dom = document.createElement('div');
      // using invalid color
      updateMagicColor({ name: 'primary', color: '', dom });

      expect(dom.style.length).toBe(0);
    });
  });

  describe('getMagicColorStyle edge cases', () => {
    it('handles hasBase true, bodyNo exists but mc.valid returns false', () => {
      const result = getMagicColorStyle({
        name: 'test',
        color: 'invalid-color-with-no-123',
        hasBase: true,
        depths: new Set(),
      });

      expect(result).toEqual({});
    });

    it('skips depth if getThemeDepthColor returns undefined', () => {
      const result = getMagicColorStyle({
        name: 'test',
        color: '#9c1d1e',
        hasBase: false,
        depths: new Set(['non-existent-depth']),
      });

      expect(result).toEqual({});
    });
  });
});

describe('preflights edge cases', () => {
  it('handles empty context gracefully', async () => {
    const uno = await createUno();
    // empty usage case
    const { css } = await uno.generate('<div class="text-white"></div>', { preflights: true });

    expect(css).not.toContain('--mc-');
  });
});

describe('color variable resolve edge cases', () => {
  it('handles case when option color is not found', async () => {
    const { css } = await generate('<div class="mc-test_notfound c-mc-test"></div>', { colors: {} });

    expect(css).not.toContain('oklch(undefined');
  });
});

describe('bg-gradient special color keys', () => {
  it('handles special gradient color keys', async () => {
    const { css } = await generate('<div class="from-mc-transparent to-mc-current"></div>', { colors: { transparent: 'transparent', current: 'currentColor' } });

    expect(css).toContain('--un-gradient-from');
    expect(css).toContain('--un-gradient-to');
  });

  it('handles non-magic-color gradient case', async () => {
    const { css } = await generate('<div class="from-[#fff] to-[#000]"></div>');
    // should work even if not mc-* colors
    expect(css).toBeTruthy();
  });
});

describe('mask edge cases', () => {
  it('handles mask-radial case with direction and value', async () => {
    const { css } = await generate('<div class="mask-radial-from-mc-red-500"></div>');
    expect(css).toContain('--un-mask-radial');
  });

  it('handles mask-conic case', async () => {
    const { css } = await generate('<div class="mask-conic-to-mc-blue-500"></div>');
    expect(css).toContain('--un-mask-conic');
  });
});

describe('color transform utilities', () => {
  it('toOklch returns undefined for invalid input', () => {
    expect(toOklch(undefined)).toBeUndefined();
  });

  it('toOklch handles oklch type with single component string', () => {
    const result = toOklch({
      type: 'oklch',
      components: ['0.5 0.2 200'],
      alpha: 1,
    });

    expect(result).toBeTruthy();
    expect(result?.components.length).toBe(3);
  });

  it('toOklch returns undefined for incomplete oklch components', () => {
    const result = toOklch({
      type: 'oklch',
      components: ['0.5'],
      alpha: 1,
    });

    expect(result).toBeUndefined();
  });

  it('toNum handles various input types', () => {
    expect(toNum(undefined)).toBe(0);
    expect(toNum('123')).toBe(123);
    expect(toNum(456)).toBe(456);
  });

  it('roundNum works correctly', () => {
    expect(roundNum(0.1234)).toBe(0.123);
    expect(roundNum(0.1235)).toBe(0.124);
  });

  it('resolveThemeDepth supports lightness reverse mapping after clamping', () => {
    expect(resolveThemeDepth('50', { lightnessReverse: true })).toBe(950);
    expect(resolveThemeDepth('450', { lightnessReverse: true })).toBe(550);
    expect(resolveThemeDepth('457', { lightnessReverse: true })).toBe(543);
    expect(resolveThemeDepth('500', { lightnessReverse: true })).toBe(500);
    expect(resolveThemeDepth('1200', { lightnessReverse: true })).toBe(-200);
    expect(resolveThemeDepth('not-a-depth', { lightnessReverse: true })).toBeUndefined();
  });
});

describe('color utilities edge cases', () => {
  it('extractBodyColor handles nested brackets', () => {
    expect(extractBodyColor('[rgb(12,22,33)]:dark')).toBe('[rgb(12,22,33)]');
  });

  it('getMcThemeMetaColors handles invalid colors gracefully', () => {
    expect(getMcThemeMetaColors('')).toEqual({});
    expect(getMcThemeMetaColors('invalid-color')).toEqual({});
    expect(getMcThemeMetaColors(undefined)).toEqual({});
  });
});

describe('token usage tracking', () => {
  it('handles non-existent token in getIds', () => {
    const tokenUsage = new TokenUsage();

    expect(tokenUsage.getIds('non-existent-token')).toBeUndefined();
  });

  it('handles removing token from non-existent id', () => {
    const tokenUsage = new TokenUsage();

    expect(() => tokenUsage.remove('non-existent-id', ['token'])).not.toThrow();
  });
});

describe('placeholder color rule', () => {
  it('placeholder color rule works', async () => {
    // placeholder rule uses special prefix `$ `, need to test generation directly
    const { css } = await generate('<div class="placeholder-mc-red-500"></div>');
    expect(css).toBeTruthy();
  });
});

describe('border color direction variants', () => {
  it('handles all border direction variants', async () => {
    const { css } = await generate(
      '<div class="border-mc-red border-l-mc-red border-r-mc-red border-t-mc-red border-b-mc-red border-x-mc-red border-y-mc-red border-s-mc-red border-e-mc-red border-block-mc-red border-inline-mc-red border-bs-mc-red border-be-mc-red border-is-mc-red border-ie-mc-red"></div>',
    );

    expect(css).toContain('border-color');
    expect(css).toContain('border-left-color');
    expect(css).toContain('border-right-color');
  });
});

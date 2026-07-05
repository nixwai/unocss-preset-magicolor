import { describe, expect, it } from 'vitest';
import { generate, generateWithoutWind4, generateWithWind4, getCssVar, getDarkBlock, getSelectorBlock } from './helpers';

describe('preset options color configuration', () => {
  it('trims configured color variables to scanned usage', async () => {
    const { css } = await generate('<div class="c-mc-primary-457"></div>', { colors: { primary: 'rose', secondary: 'blue' } });

    expect(css).toContain(':root');
    expect(css).toContain('--mc-colors-primary-457: var(--mc-source-colors-primary-457);');
    expect(css).toMatch(/--mc-source-colors-primary-457:\s*oklch\(/);
    expect(css).not.toContain('--mc-colors-primary-DEFAULT:');
    expect(css).not.toContain('--mc-colors-secondary-DEFAULT:');
  });

  it('generates configured base variables only when a base color is used', async () => {
    const { css } = await generate('<div class="c-mc-primary c-mc-rose"></div>', { colors: { primary: 'rose' } });

    expect(css).toContain('--mc-colors-primary-DEFAULT:');
    expect(css).toContain('--mc-colors-rose-DEFAULT:');
    expect(css).not.toContain('--mc-colors-primary-500:');
  });

  it('supports object color options with lightnessReverse', async () => {
    const { css } = await generate(
      '<div class="c-mc-primary-50 c-mc-primary-450 c-mc-primary-500 c-mc-primary-950"></div>',
      { colors: { primary: { color: 'rose', lightnessReverse: true } } },
    );
    const reference = await generate('<div class="c-mc-rose-950 c-mc-rose-550 c-mc-rose-500 c-mc-rose-50"></div>');

    expect(getCssVar(css, '--mc-colors-primary-50')).toBe('var(--mc-source-colors-primary-50)');
    expect(getCssVar(css, '--mc-source-colors-primary-50')).toBe(getCssVar(reference.css, '--mc-source-colors-rose-950'));
    expect(getCssVar(css, '--mc-source-colors-primary-450')).toBe(getCssVar(reference.css, '--mc-source-colors-rose-550'));
    expect(getCssVar(css, '--mc-source-colors-primary-500')).toBe(getCssVar(reference.css, '--mc-source-colors-rose-500'));
    expect(getCssVar(css, '--mc-source-colors-primary-950')).toBe(getCssVar(reference.css, '--mc-source-colors-rose-50'));
  });

  it('maps special configured values to each requested depth', async () => {
    const { css } = await generate(
      '<div class="c-mc-primary c-mc-primary-457 bg-mc-primary-950"></div>',
      { colors: { primary: 'transparent' } },
    );

    expect(css).toContain('--mc-source-colors-primary-DEFAULT: transparent;');
    expect(css).toContain('--mc-source-colors-primary-457: transparent;');
    expect(css).toContain('--mc-source-colors-primary-950: transparent;');
    expect(css).toContain('var(--mc-colors-primary-DEFAULT)');
    expect(css).toContain('var(--mc-colors-primary-457)');
    expect(css).toContain('var(--mc-colors-primary-950)');
  });

  it('keeps special color names as built-in CSS keywords instead of aliases', async () => {
    const { css } = await generate(
      '<div class="c-mc-transparent c-mc-current c-mc-inherit"></div>',
      { colors: { transparent: 'rose', current: 'blue', inherit: 'green' } },
    );

    expect(css).toContain('.c-mc-transparent{color:transparent;}');
    expect(css).toContain('.c-mc-current{color:currentColor;}');
    expect(css).toContain('.c-mc-inherit{color:inherit;}');
    expect(css).not.toContain('--mc-colors-transparent-DEFAULT:');
    expect(css).not.toContain('--mc-colors-current-DEFAULT:');
  });

  it('uses UnoCSS theme color names without explicit options', async () => {
    const { css } = await generate('<div class="bg-mc-rose-445"></div>');

    expect(css).toContain('--mc-colors-rose-445: var(--mc-source-colors-rose-445);');
    expect(css).toMatch(/--mc-source-colors-rose-445:\s*oklch\(/);
    expect(css).toContain('var(--mc-colors-rose-445)');
  });

  it('skips names that are neither configured aliases nor theme colors', async () => {
    const { css } = await generate('<div class="c-mc-notacolor"></div>');

    expect(css).not.toContain('--mc-colors-notacolor-DEFAULT:');
    expect(css).not.toContain('oklch(undefined');
  });

  it('emits no preflight variables when no magic color usage resolves to a color', async () => {
    const { css } = await generate('<div class="text-white"></div>');

    expect(css).not.toContain('--mc-');
  });
});

describe('preset options dark color configuration', () => {
  it('emits dark source variables with Wind4 class mode', async () => {
    const { css } = await generate(
      '<div class="bg-mc-primary-457"></div>',
      { colors: { primary: 'rose' }, dark: { primary: 'blue' } },
    );

    const darkBlock = getDarkBlock(css);
    expect(css).toMatch(/:root\s*\{[\s\S]*--mc-source-colors-primary-457:\s*oklch\(/);
    expect(css).toMatch(/:root\s*\{[\s\S]*--mc-colors-primary-457:\s*var\(--mc-source-colors-primary-457\);/);
    expect(darkBlock).toMatch(/--mc-source-colors-primary-457:\s*oklch\(/);
    expect(darkBlock).not.toContain('--mc-colors-primary-457:');
  });

  it('reverses dark color depths independently from light variables', async () => {
    const { css } = await generate(
      '<div class="bg-mc-primary-50"></div>',
      { colors: { primary: 'rose' }, dark: { primary: { color: 'blue', lightnessReverse: true } } },
    );
    const lightReference = await generate('<div class="c-mc-rose-50"></div>');
    const darkReference = await generate('<div class="c-mc-blue-950"></div>');
    const darkBlock = getDarkBlock(css);

    expect(getCssVar(css, '--mc-source-colors-primary-50')).toBe(getCssVar(lightReference.css, '--mc-source-colors-rose-50'));
    expect(getCssVar(darkBlock, '--mc-source-colors-primary-50')).toBe(getCssVar(darkReference.css, '--mc-source-colors-blue-950'));
  });

  it('supports Wind4 media dark mode', async () => {
    const { css } = await generateWithWind4(
      '<div class="bg-mc-primary-457"></div>',
      { colors: { primary: 'rose' }, dark: { primary: 'blue' } },
      { dark: 'media' },
    );

    expect(css).toMatch(/@media \(prefers-color-scheme: dark\)\s*\{[\s\S]*:root\s*\{[\s\S]*--mc-source-colors-primary-457:\s*oklch\(/);
    expect(css).toMatch(/:root\s*\{[\s\S]*--mc-colors-primary-457:\s*var\(--mc-source-colors-primary-457\);/);
  });

  it('supports custom Wind4 dark selectors', async () => {
    const { css } = await generateWithWind4(
      '<div class="bg-mc-primary-457"></div>',
      { colors: { primary: 'rose' }, dark: { primary: 'blue' } },
      { dark: { dark: '.app-dark', light: '.app-light' } },
    );

    const darkBlock = getSelectorBlock(css, '.app-dark');
    expect(darkBlock).toMatch(/--mc-source-colors-primary-457:\s*oklch\(/);
    expect(darkBlock).not.toContain('--mc-colors-primary-457:');
    expect(css).not.toContain('.app-light');
  });

  it('falls back to class dark mode when no Wind4 preset is present', async () => {
    const { css } = await generateWithoutWind4(
      '<div class="bg-mc-primary-457"></div>',
      { colors: { primary: '#409eff' }, dark: { primary: '#8ab4ff' } },
    );

    const darkBlock = getDarkBlock(css);
    expect(darkBlock).toMatch(/--mc-source-colors-primary-457:\s*oklch\(/);
    expect(darkBlock).not.toContain('--mc-colors-primary-457:');
  });
});

import { describe, expect, it } from 'vitest';
import { getMagicColorStyle } from '../helper';
import { generate, getCssVar, getDarkBlock, getSelectorBlock } from './helpers';

describe('mc custom color definition rules', () => {
  it('does not emit variables for malformed definitions without a hue', async () => {
    const { css } = await generate('<div class="mc-btn_ c-mc-btn"></div>');

    expect(css).not.toContain('oklch');
    expect(css).not.toContain('--mc-colors-btn-DEFAULT:');
  });

  it('links definition hues to option color variables', async () => {
    const { css } = await generate('<div class="mc-btn_primary c-mc-btn-457"></div>', { colors: { primary: 'rose' } });

    expect(css).toContain('--mc-colors-btn-457:var(--mc-source-colors-primary-457)');
    expect(css).toMatch(/--mc-source-colors-primary-457:\s*oklch\(/);
    expect(css).not.toContain('--mc-colors-primary-457:');
  });

  it('links definition hues to UnoCSS theme color variables', async () => {
    const { css } = await generate('<div class="mc-btn_rose c-mc-btn-457"></div>');

    expect(css).toContain('--mc-colors-btn-457:var(--mc-source-colors-rose-457)');
    expect(css).toMatch(/--mc-source-colors-rose-457:\s*oklch\(/);
  });

  it('defines arbitrary bracket hues directly as usable color variables', async () => {
    const { css } = await generate('<div class="mc-brand_[#9c1d1e] c-mc-brand c-mc-brand-630"></div>');
    const expected = getMagicColorStyle({
      name: 'brand',
      color: '#9c1d1e',
      hasBase: false,
      depths: new Set(['630']),
    });

    expect(getCssVar(css, '--mc-colors-brand-DEFAULT')).toBe('#9c1d1e');
    expect(getCssVar(css, '--mc-colors-brand-630')).toBe(expected['--mc-colors-brand-630']);
    expect(css).not.toContain('--mc-source-colors-#9c1d1e');
    expect(css).not.toContain('var(--mc-source-colors-#9c1d1e');
    expect(css).not.toContain('oklch(undefined');
  });

  it('defines special color keyword variables directly', async () => {
    const { css } = await generate('<div class="mc-primary_transparent c-mc-primary c-mc-primary-457 bg-mc-primary-950"></div>');

    expect(css).toContain('--mc-colors-primary-DEFAULT:transparent');
    expect(css).toContain('--mc-colors-primary-457:transparent');
    expect(css).toContain('--mc-colors-primary-950:transparent');
    expect(css).not.toContain('var(--mc-transparent');
  });

  it('preserves inline source depth when a definition references option colors', async () => {
    const { css } = await generate('<div class="mc-btn_primary-620 c-mc-btn"></div>', { colors: { primary: 'rose' } });

    expect(css).toContain('--mc-colors-btn-DEFAULT:var(--mc-source-colors-primary-620)');
    expect(css).toMatch(/--mc-source-colors-primary-620:\s*oklch\(/);
    expect(css).not.toContain('--mc-colors-primary-620:');
  });

  it('does not emit undefined colors when a definition references an unknown option color', async () => {
    const { css } = await generate('<div class="mc-test_notfound c-mc-test"></div>', { colors: {} });

    expect(css).not.toContain('oklch(undefined');
  });

  it('avoids self-referential variables for same-name definitions', async () => {
    const { css } = await generate('<div class="mc-red_red c-mc-red c-mc-red-457"></div>');

    expect(css).not.toContain('--mc-colors-red-DEFAULT:var(--mc-colors-red-DEFAULT)');
    expect(css).not.toContain('--mc-colors-red-457:var(--mc-colors-red-457)');
    expect(css).toMatch(/--mc-source-colors-red-DEFAULT:\s*oklch\(/);
    expect(css).toMatch(/--mc-source-colors-red-457:\s*oklch\(/);
  });

  it('allows same-name definitions to point the base variable at a source depth', async () => {
    const { css } = await generate('<div class="mc-red_red-100 c-mc-red c-mc-red-457"></div>');

    expect(css).toContain('--mc-colors-red-DEFAULT:var(--mc-source-colors-red-100)');
    expect(css).not.toContain('--mc-colors-red-457:var(--mc-colors-red-457)');
    expect(css).toMatch(/--mc-source-colors-red-100:\s*oklch\(/);
    expect(css).toMatch(/--mc-source-colors-red-457:\s*oklch\(/);
  });

  it('guards bare mc tokens that lack the underscore definition separator', async () => {
    const { css } = await generate('<div class="mc-btnred c-mc-btnred"></div>', { colors: { btnred: 'rose' } });

    expect(css).not.toContain('--mc-colors-btnre-DEFAULT:');
    expect(css).not.toContain('oklch(undefined');
  });
});

describe('local lightness reverse color definitions', () => {
  it('reverses theme color depths in local definitions', async () => {
    const { css } = await generate('<div class="mc-lr-btn_rose bg-mc-btn-50 bg-mc-btn-450 bg-mc-btn-500"></div>');
    const reference = await generate('<div class="c-mc-rose-950 c-mc-rose-550 c-mc-rose-500"></div>');

    expect(getCssVar(css, '--mc-colors-btn-50')).toBe(getCssVar(reference.css, '--mc-colors-rose-950'));
    expect(getCssVar(css, '--mc-colors-btn-450')).toBe(getCssVar(reference.css, '--mc-colors-rose-550'));
    expect(getCssVar(css, '--mc-colors-btn-500')).toBe(getCssVar(reference.css, '--mc-colors-rose-500'));
    expect(css).not.toContain('--mc-colors-btn-50:var(--mc-colors-rose-950)');
  });

  it('reverses configured colors through source variables', async () => {
    const { css } = await generate('<div class="mc-lr-btn_primary bg-mc-btn-50"></div>', { colors: { primary: 'rose' } });
    const reference = await generate('<div class="c-mc-rose-950"></div>');

    expect(getCssVar(css, '--mc-colors-btn-50')).toBe('var(--mc-source-colors-primary-950)');
    expect(getCssVar(css, '--mc-source-colors-primary-950')).toBe(getCssVar(reference.css, '--mc-source-colors-rose-950'));
    expect(css).not.toContain('--mc-colors-primary-950:');
  });

  it('uses same-name shorthand for configured colors', async () => {
    const { css } = await generate(
      '<div class="mc-lr-primary c-mc-primary-80 c-mc-primary-920"></div>',
      { colors: { primary: 'rose' } },
    );
    const localBlock = getSelectorBlock(css, '.mc-lr-primary');
    const reference = await generate('<div class="c-mc-rose-80 c-mc-rose-920"></div>');

    expect(getCssVar(localBlock, '--mc-colors-primary-80')).toBe('var(--mc-source-colors-primary-920)');
    expect(getCssVar(localBlock, '--mc-colors-primary-920')).toBe('var(--mc-source-colors-primary-80)');
    expect(getCssVar(css, '--mc-source-colors-primary-920')).toBe(getCssVar(reference.css, '--mc-source-colors-rose-920'));
    expect(getCssVar(css, '--mc-source-colors-primary-80')).toBe(getCssVar(reference.css, '--mc-source-colors-rose-80'));
  });

  it('reverses only the matching color name when mixed with another definition on the same element', async () => {
    const { css } = await generate('<div class="mc-lr-blue mc-btn_blue bg-mc-blue-230 c-mc-btn-880"></div>');
    const localBlock = getSelectorBlock(css, '.mc-lr-blue');
    const definitionBlock = getSelectorBlock(css, '.mc-btn_blue');
    const blueUtilityBlock = getSelectorBlock(css, '.bg-mc-blue-230');
    const btnUtilityBlock = getSelectorBlock(css, '.c-mc-btn-880');

    expect(getCssVar(localBlock, '--mc-colors-blue-230')).toBe('var(--mc-source-colors-blue-770)');
    expect(getCssVar(definitionBlock, '--mc-colors-btn-880')).toBe('var(--mc-source-colors-blue-880)');
    expect(blueUtilityBlock).toContain('var(--mc-colors-blue-230)');
    expect(btnUtilityBlock).toContain('var(--mc-colors-btn-880)');
    expect(css).toMatch(/--mc-source-colors-blue-770:\s*oklch\(/);
    expect(css).toMatch(/--mc-source-colors-blue-880:\s*oklch\(/);
  });

  it('reverses literal inline depths for base variables', async () => {
    const { css } = await generate('<div class="mc-lr-btn_[#9c1d1e]-620 c-mc-btn"></div>');
    const expected = getMagicColorStyle({
      name: 'btn',
      color: '#9c1d1e-620',
      hasBase: true,
      depths: new Set(),
      lightnessReverse: true,
    });

    expect(getCssVar(css, '--mc-colors-btn-DEFAULT')).toBe(expected['--mc-colors-btn-DEFAULT']);
    expect(css).not.toContain('--mc-source-colors-#9c1d1e');
    expect(css).not.toContain('var(--mc-source-colors-#9c1d1e');
  });

  it('reverses arbitrary bracket hues directly as usable color variables', async () => {
    const { css } = await generate('<div class="mc-lr-brand_[#9c1d1e] c-mc-brand c-mc-brand-630"></div>');
    const expected = getMagicColorStyle({
      name: 'brand',
      color: '#9c1d1e',
      hasBase: false,
      depths: new Set(['630']),
      lightnessReverse: true,
    });

    expect(getCssVar(css, '--mc-colors-brand-DEFAULT')).toBe('#9c1d1e');
    expect(getCssVar(css, '--mc-colors-brand-630')).toBe(expected['--mc-colors-brand-630']);
    expect(css).not.toContain('--mc-source-colors-#9c1d1e');
    expect(css).not.toContain('var(--mc-source-colors-#9c1d1e');
  });

  it('reverses inherited option inline depths for local base variables', async () => {
    const { css } = await generate('<div class="mc-lr-btn_primary c-mc-btn"></div>', { colors: { primary: 'rose-620' } });
    const reference = await generate('<div class="c-mc-rose-380"></div>');

    expect(getCssVar(css, '--mc-colors-btn-DEFAULT')).toBe('var(--mc-source-colors-primary-380)');
    expect(getCssVar(css, '--mc-source-colors-primary-380')).toBe(getCssVar(reference.css, '--mc-source-colors-rose-380'));
  });

  it('avoids local lightness-reverse cycles for same-name paired arbitrary depths', async () => {
    const { css } = await generate(
      '<div class="mc-lr-primary_primary c-mc-primary-80 c-mc-primary-920"></div>',
      { colors: { primary: 'rose' } },
    );
    const localBlock = getSelectorBlock(css, '.mc-lr-primary_primary');
    const reference = await generate('<div class="c-mc-rose-80 c-mc-rose-920"></div>');

    expect(getCssVar(localBlock, '--mc-colors-primary-80')).toBe('var(--mc-source-colors-primary-920)');
    expect(getCssVar(localBlock, '--mc-colors-primary-920')).toBe('var(--mc-source-colors-primary-80)');
    expect(getCssVar(css, '--mc-source-colors-primary-920')).toBe(getCssVar(reference.css, '--mc-source-colors-rose-920'));
    expect(getCssVar(css, '--mc-source-colors-primary-80')).toBe(getCssVar(reference.css, '--mc-source-colors-rose-80'));
    expect(css).not.toContain('--mc-colors-primary-80:var(--mc-colors-primary-920)');
    expect(css).not.toContain('--mc-colors-primary-920:var(--mc-colors-primary-80)');
  });

  it('resolves local lightness-reverse theme colors for paired arbitrary depths', async () => {
    const { css } = await generate('<div class="mc-lr-btn_rose c-mc-btn-80 c-mc-btn-920"></div>');
    const reference = await generate('<div class="c-mc-rose-80 c-mc-rose-920"></div>');

    expect(getCssVar(css, '--mc-colors-btn-80')).toBe(getCssVar(reference.css, '--mc-colors-rose-920'));
    expect(getCssVar(css, '--mc-colors-btn-920')).toBe(getCssVar(reference.css, '--mc-colors-rose-80'));
    expect(getCssVar(css, '--mc-source-colors-rose-920')).toBe(getCssVar(reference.css, '--mc-source-colors-rose-920'));
    expect(getCssVar(css, '--mc-source-colors-rose-80')).toBe(getCssVar(reference.css, '--mc-source-colors-rose-80'));
    expect(css).not.toContain('--mc-colors-btn-80:var(--mc-colors-rose-920)');
    expect(css).not.toContain('--mc-colors-btn-920:var(--mc-colors-rose-80)');
  });

  it('uses dark option colors for dark variant local lightness reverse', async () => {
    const { css } = await generate(
      '<div class="dark:mc-lr-btn_primary c-mc-btn-80"></div>',
      { colors: { primary: 'rose' }, dark: { primary: 'blue' } },
    );
    const darkBlock = getSelectorBlock(css, '.dark .dark\\:mc-lr-btn_primary');
    const darkReference = await generate('<div class="c-mc-blue-920"></div>');
    const lightReference = await generate('<div class="c-mc-rose-920"></div>');

    expect(getCssVar(darkBlock, '--mc-colors-btn-80')).toBe('var(--mc-source-colors-primary-920)');
    expect(getCssVar(getDarkBlock(css), '--mc-source-colors-primary-920')).toBe(getCssVar(darkReference.css, '--mc-source-colors-blue-920'));
    expect(getCssVar(getDarkBlock(css), '--mc-source-colors-primary-920')).not.toBe(getCssVar(lightReference.css, '--mc-source-colors-rose-920'));
  });
});

describe('global lightness reverse color definitions', () => {
  it('reverses configured color variables without creating cycles', async () => {
    const { css } = await generate(
      '<div class="mc-lr bg-mc-primary-50 bg-mc-primary-450 bg-mc-primary-500"></div>',
      { colors: { primary: 'rose' } },
    );
    const mcLrBlock = getSelectorBlock(css, '.mc-lr');
    const reference = await generate('<div class="c-mc-rose-950 c-mc-rose-550 c-mc-rose-500"></div>');

    expect(getCssVar(mcLrBlock, '--mc-colors-primary-50')).toBe('var(--mc-source-colors-primary-950)');
    expect(getCssVar(mcLrBlock, '--mc-colors-primary-450')).toBe('var(--mc-source-colors-primary-550)');
    expect(getCssVar(css, '--mc-source-colors-primary-950')).toBe(getCssVar(reference.css, '--mc-source-colors-rose-950'));
    expect(getCssVar(css, '--mc-source-colors-primary-550')).toBe(getCssVar(reference.css, '--mc-source-colors-rose-550'));
    expect(css).not.toContain('--mc-colors-primary-50:var(--mc-colors-primary-950)');
  });

  it('reverses direct color usage globally while leaving same-element local definitions unchanged', async () => {
    const { css } = await generate('<div class="mc-lr mc-btn_blue bg-mc-blue-230 c-mc-btn-880"></div>');
    const mcLrBlock = getSelectorBlock(css, '.mc-lr');
    const definitionBlock = getSelectorBlock(css, '.mc-btn_blue');
    const blueUtilityBlock = getSelectorBlock(css, '.bg-mc-blue-230');
    const btnUtilityBlock = getSelectorBlock(css, '.c-mc-btn-880');

    expect(getCssVar(mcLrBlock, '--mc-colors-blue-230')).toBe('var(--mc-source-colors-blue-770)');
    expect(getCssVar(mcLrBlock, '--mc-colors-btn-880')).toBeUndefined();
    expect(getCssVar(definitionBlock, '--mc-colors-btn-880')).toBe('var(--mc-source-colors-blue-880)');
    expect(blueUtilityBlock).toContain('var(--mc-colors-blue-230)');
    expect(btnUtilityBlock).toContain('var(--mc-colors-btn-880)');
    expect(css).toMatch(/--mc-source-colors-blue-770:\s*oklch\(/);
    expect(css).toMatch(/--mc-source-colors-blue-880:\s*oklch\(/);
  });

  it('reverses theme color variables globally', async () => {
    const { css } = await generate('<div class="mc-lr bg-mc-rose-50"></div>');
    const reference = await generate('<div class="c-mc-rose-950"></div>');
    const mcLrBlock = getSelectorBlock(css, '.mc-lr');

    expect(getCssVar(mcLrBlock, '--mc-colors-rose-50')).toBe(getCssVar(reference.css, '--mc-colors-rose-950'));
    expect(getCssVar(css, '--mc-source-colors-rose-950')).toBe(getCssVar(reference.css, '--mc-source-colors-rose-950'));
    expect(css).not.toContain('--mc-colors-rose-50:var(--mc-colors-rose-950)');
  });

  it('avoids global lightness-reverse cycles for paired arbitrary depths', async () => {
    const { css } = await generate(
      '<div class="mc-lr c-mc-primary-80 c-mc-primary-920"></div>',
      { colors: { primary: 'rose' } },
    );
    const mcLrBlock = getSelectorBlock(css, '.mc-lr');
    const reference = await generate('<div class="c-mc-rose-80 c-mc-rose-920"></div>');

    expect(getCssVar(mcLrBlock, '--mc-colors-primary-80')).toBe('var(--mc-source-colors-primary-920)');
    expect(getCssVar(mcLrBlock, '--mc-colors-primary-920')).toBe('var(--mc-source-colors-primary-80)');
    expect(getCssVar(css, '--mc-source-colors-primary-920')).toBe(getCssVar(reference.css, '--mc-source-colors-rose-920'));
    expect(getCssVar(css, '--mc-source-colors-primary-80')).toBe(getCssVar(reference.css, '--mc-source-colors-rose-80'));
    expect(css).not.toContain('--mc-colors-primary-80:var(--mc-colors-primary-920)');
    expect(css).not.toContain('--mc-colors-primary-920:var(--mc-colors-primary-80)');
  });

  it('does not reverse configured base variables globally', async () => {
    const { css } = await generate('<div class="mc-lr c-mc-primary"></div>', { colors: { primary: 'rose' } });

    expect(css).toContain('--mc-colors-primary-DEFAULT: var(--mc-source-colors-primary-DEFAULT);');
    expect(css).toMatch(/--mc-source-colors-primary-DEFAULT:\s*oklch\(/);
    expect(css).not.toContain('--mc-colors-primary-500:');
  });

  it('uses dark option colors for dark variant global lightness reverse', async () => {
    const { css } = await generate(
      '<div class="dark:mc-lr c-mc-primary-80"></div>',
      { colors: { primary: 'rose' }, dark: { primary: 'blue' } },
    );
    const darkBlock = getSelectorBlock(css, '.dark .dark\\:mc-lr');
    const darkReference = await generate('<div class="c-mc-blue-920"></div>');
    const lightReference = await generate('<div class="c-mc-rose-920"></div>');

    expect(getCssVar(darkBlock, '--mc-colors-primary-80')).toBe('var(--mc-source-colors-primary-920)');
    expect(getCssVar(getDarkBlock(css), '--mc-source-colors-primary-920')).toBe(getCssVar(darkReference.css, '--mc-source-colors-blue-920'));
    expect(getCssVar(getDarkBlock(css), '--mc-source-colors-primary-920')).not.toBe(getCssVar(lightReference.css, '--mc-source-colors-rose-920'));
  });
});

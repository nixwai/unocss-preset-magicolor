import { describe, expect, it } from 'vitest';
import { scanUsage } from '../usages/scanner';
import { normalizeMagicColorToken } from '../utils/magic-color-token';
import { generateWithAttributify } from './helpers';

describe('attributify usage extraction', () => {
  it('normalizes mc="lr" Attributify selectors to the lightness-reverse token name', () => {
    expect(normalizeMagicColorToken('[mc~="lr"]')).toBe('mc-lr');

    const scan = scanUsage(new Set(['[mc~="lr"]']));

    expect(scan.colors.size).toBe(0);
  });

  it('normalizes raw Attributify selectors before scanning target usage', () => {
    const scan = scanUsage(new Set([
      '[bg~="mc-primary-333"]',
      '[hover:bg~="mc-secondary-640"]',
      '[bg~="hover:mc-accent-200"]',
      '[text~="focus:!mc-label-456/50"]',
      '[bg~="mc-tone-200:40"]',
      '[mc~="lr"]',
      '[mc~="lr-primary"]',
      '[mc~="!lr"]',
      '[mc~="!lr-primary"]',
      '[mc-definition=""]',
      '[bg-mc-self-210~="~"]',
      '[un-mc-definition_rose=""]',
    ]));

    expect(scan.colors.get('primary')).toEqual(new Set([333]));
    expect(scan.colors.get('secondary')).toEqual(new Set([640]));
    expect(scan.colors.get('accent')).toEqual(new Set([200]));
    expect(scan.colors.get('label')).toEqual(new Set([456]));
    expect(scan.colors.get('tone')).toEqual(new Set([200]));
    expect(scan.colors.get('self')).toEqual(new Set([210]));
    expect(scan.colors.get('definition')).toEqual(new Set(['DEFAULT']));
    expect(scan.colors.has('lr')).toBe(false);
    expect(scan.colors.has('lr-primary')).toBe(false);
  });

  it('normalizes all Attributify selector shapes emitted by presetAttributify', () => {
    const scan = scanUsage(new Set([
      '[bg~="mc-primary-333"]',
      '[text~="hover:mc-secondary-640"]',
      '[focus:bg~="mc-accent-210"]',
      '[c-mc-label-456~="~"]',
      '[un-bg~="dark:!mc-tone-515/60"]',
      '[un-c-mc-muted-480=""]',
      '[mc-definition=""]',
      '[un-mc-brand_rose-200=""]',
      '[bg~="[color:var(--x)]"]',
      '[opacity~="50"]',
    ]));

    expect(scan.colors.get('primary')).toEqual(new Set([333]));
    expect(scan.colors.get('secondary')).toEqual(new Set([640]));
    expect(scan.colors.get('accent')).toEqual(new Set([210]));
    expect(scan.colors.get('label')).toEqual(new Set([456]));
    expect(scan.colors.get('tone')).toEqual(new Set([515]));
    expect(scan.colors.get('muted')).toEqual(new Set([480]));
    expect(scan.colors.get('definition')).toEqual(new Set(['DEFAULT']));
    expect(scan.colors.has('brand')).toBe(false);
  });

  it('treats true-valued Attributify selectors as non-valued selector usage', () => {
    const scan = scanUsage(new Set([
      '[mc-definition="true"]',
      '[c-mc-label-456="true"]',
    ]));

    expect(scan.colors.get('definition')).toEqual(new Set(['DEFAULT']));
    expect(scan.colors.get('label')).toEqual(new Set([456]));
    expect(scan.colors.has('definition-true')).toBe(false);
    expect(scan.colors.has('label-456')).toBe(false);
  });

  it('skips Attributify lightness-reverse selectors when scanning target usage', () => {
    const scan = scanUsage(new Set([
      '[bg~="mc-lr-primary-333"]',
      '[bg~="!mc-lr-primary-444"]',
      '[bg~="hover:!mc-lr-secondary-555"]',
      '[mc~="lr"]',
      '[mc~="lr-primary"]',
      '[mc~="!lr"]',
      '[mc~="!lr-primary"]',
    ]));

    expect(scan.colors.size).toBe(0);
  });

  it('tracks Attributify attributes and attribute-name variants', async () => {
    const { css } = await generateWithAttributify(
      '<div bg="mc-primary-333" hover:bg="mc-secondary640" c="mc-label"></div>',
      {
        colors: {
          label: 'blue',
          primary: 'rose',
          secondary: 'green',
        },
      },
    );

    expect(css).toContain('--mc-colors-primary-333:');
    expect(css).toContain('--mc-colors-secondary-640:');
    expect(css).toContain('--mc-colors-label-DEFAULT:');
    expect(css).toContain('var(--mc-colors-primary-333)');
    expect(css).toContain('var(--mc-colors-secondary-640)');
    expect(css).toContain('var(--mc-colors-label-DEFAULT)');
  });

  it('tracks Attributify value variants with prefixed-only attributes alongside the default extractor', async () => {
    const { css } = await generateWithAttributify(
      '<div un-bg="hover:mc-primary-333 focus:mc-secondary-640" bg="mc-ignored-200"></div>',
      {
        colors: {
          ignored: 'cyan',
          primary: 'rose',
          secondary: 'green',
        },
      },
      { prefixedOnly: true },
    );

    expect(css).toContain('--mc-colors-primary-333:');
    expect(css).toContain('--mc-colors-secondary-640:');
    expect(css).toContain('var(--mc-colors-primary-333)');
    expect(css).toContain('var(--mc-colors-secondary-640)');
    expect(css).toContain('--mc-colors-ignored-200:');
  });

  it('respects Attributify ignored attributes in strict mode', async () => {
    const { css } = await generateWithAttributify(
      '<div placeholder="mc-ignored-200" bg="mc-primary-333"></div>',
      {
        colors: {
          ignored: 'cyan',
          primary: 'rose',
        },
      },
      { strict: true },
    );

    expect(css).toContain('--mc-colors-primary-333:');
    expect(css).not.toContain('--mc-colors-ignored-200:');
  });

  it('tracks Attributify self-referencing attribute values', async () => {
    const { css } = await generateWithAttributify(
      '<div bg-mc-primary-333="~" c-mc-secondary-640="true" mc-definition=""></div>',
      {
        colors: {
          definition: 'cyan',
          primary: 'rose',
          secondary: 'green',
        },
      },
      { trueToNonValued: true },
    );

    expect(css).toContain('--mc-colors-primary-333:');
    expect(css).toContain('--mc-colors-secondary-640:');
    expect(css).toContain('var(--mc-colors-primary-333)');
    expect(css).toContain('var(--mc-colors-secondary-640)');
    expect(css).toContain('--mc-colors-definition-DEFAULT:');
  });

  it('keeps dev cache tokens internal for Attributify mc-* definition attributes', async () => {
    const { css } = await generateWithAttributify(
      '<div mc-definition="" un-mc-brand_rose="" c-mc-brand="true" c-mc-definition-320="true"></div>',
      {
        colors: { definition: 'cyan' },
        devCacheToken: true,
      },
      { trueToNonValued: true },
      { envMode: 'dev' },
    );

    expect(css).toContain('--mc-colors-definition-320:');
    expect(css).toContain('--mc-colors-brand-DEFAULT:');
    expect(css).toContain('var(--mc-colors-definition-320)');
    expect(css).not.toContain('mc-dev');
  });

  it('keeps Attributify lightness-reverse controls working in dev cache mode', async () => {
    const { css } = await generateWithAttributify(
      '<div mc="lr" c-mc-primary-80="true"></div>',
      {
        colors: { primary: 'rose' },
        devCacheToken: true,
      },
      { trueToNonValued: true },
      { envMode: 'dev' },
    );

    expect(css).toContain('--mc-source-colors-primary-920:');
    expect(css).toContain('var(--mc-colors-primary-80)');
    expect(css).not.toContain('mc-dev');
  });

  it('applies Attributify lightness-reverse controls to class magic-color usage', async () => {
    const { css } = await generateWithAttributify('<div mc="lr" class="bg-mc-red-66" />');

    expect(css).toContain('--mc-source-colors-red-934:');
    expect(css).toContain('[mc~="lr"]{--mc-colors-red-66:var(--mc-source-colors-red-934);}');
    expect(css).toContain('--mc-colors-red-66:var(--mc-source-colors-red-934)');
    expect(css).toContain('var(--mc-colors-red-66)');
  });

  it('applies Attributify lightness-reverse controls to class magic-color usage in dev cache mode', async () => {
    const { css } = await generateWithAttributify(
      '<div mc="lr" class="bg-mc-red-66" />',
      { devCacheToken: true },
      undefined,
      { envMode: 'dev' },
    );

    expect(css).toContain('--mc-source-colors-red-934:');
    expect(css).toContain('[mc~="lr"]{--mc-colors-red-66:var(--mc-source-colors-red-934);}');
    expect(css).not.toContain('.\[mc\~\=\"lr\"\]');
    expect(css).toContain('--mc-colors-red-66:var(--mc-source-colors-red-934)');
    expect(css).toContain('var(--mc-colors-red-66)');
    expect(css).not.toContain('mc-dev');
  });

  it('tracks Attributify true-valued non-valued attributes in strict mode', async () => {
    const { css } = await generateWithAttributify(
      '<div mc-definition="true" c-mc-label-456="true"></div>',
      {
        colors: {
          definition: 'cyan',
          label: 'blue',
        },
      },
      { strict: true, trueToNonValued: true },
    );

    expect(css).toContain('--mc-colors-definition-DEFAULT:');
    expect(css).toContain('--mc-colors-label-456:');
    expect(css).toContain('var(--mc-colors-label-456)');
  });

  it('tracks Attributify content from dynamic attribute names and nested html', async () => {
    const { css } = await generateWithAttributify(
      '<div :bg="mc-primary-333" v-bind:c="mc-label-456" data-html="<span bg=\'mc-secondary-640\'></span>"></div>',
      {
        colors: {
          label: 'blue',
          primary: 'rose',
          secondary: 'green',
        },
      },
      { strict: true },
    );

    expect(css).toContain('--mc-colors-primary-333:');
    expect(css).toContain('--mc-colors-label-456:');
    expect(css).toContain('--mc-colors-secondary-640:');
    expect(css).toContain('var(--mc-colors-primary-333)');
    expect(css).toContain('var(--mc-colors-label-456)');
    expect(css).toContain('var(--mc-colors-secondary-640)');
  });

  it('respects Attributify nonValuedAttribute=false in strict mode', async () => {
    const { css } = await generateWithAttributify(
      '<div mc-definition c-mc-label-456 bg="mc-primary-333"></div>',
      {
        colors: {
          definition: 'cyan',
          label: 'blue',
          primary: 'rose',
        },
      },
      { strict: true, nonValuedAttribute: false },
    );

    expect(css).toContain('--mc-colors-primary-333:');
    expect(css).not.toContain('--mc-colors-definition-DEFAULT:');
    expect(css).not.toContain('--mc-colors-label-456:');
  });

  it('respects Attributify prefixedOnly in strict mode', async () => {
    const { css } = await generateWithAttributify(
      '<div un-bg="mc-primary-333" bg="mc-ignored-200" un-mc-definition=""></div>',
      {
        colors: {
          definition: 'cyan',
          ignored: 'blue',
          primary: 'rose',
        },
      },
      { strict: true, prefixedOnly: true },
    );

    expect(css).toContain('--mc-colors-primary-333:');
    expect(css).toContain('--mc-colors-definition-DEFAULT:');
    expect(css).not.toContain('--mc-colors-ignored-200:');
    expect(css).toContain('var(--mc-colors-primary-333)');
  });

  it('passes class/className tokens through in strict Attributify mode', async () => {
    const { css } = await generateWithAttributify(
      '<div class="bg-mc-primary-333" className="c-mc-label-456"></div>',
      {
        colors: {
          label: 'blue',
          primary: 'rose',
        },
      },
      { strict: true },
    );

    expect(css).toContain('--mc-colors-primary-333:');
    expect(css).toContain('--mc-colors-label-456:');
    expect(css).toContain('var(--mc-colors-primary-333)');
    expect(css).toContain('var(--mc-colors-label-456)');
  });
});

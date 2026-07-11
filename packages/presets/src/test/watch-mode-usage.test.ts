import { describe, expect, it } from 'vitest';
import { createUno, getCssVar, getSelectorBlock } from './helpers';

describe('watch-mode usage replacement', () => {
  it('drops stale custom color usage when the same input id is rescanned', async () => {
    const uno = await createUno();

    const first = await uno.generate('<div class="mc-btn_red c-mc-btn-200"></div>', { preflights: true, id: 'a.vue' });
    expect(first.css).toContain('--mc-colors-btn-200:var(--mc-source-colors-red-200)');

    const second = await uno.generate('<div class="text-white"></div>', { preflights: true, id: 'a.vue' });
    expect(second.css).not.toContain('--mc-colors-btn-200:');
    expect(second.css).not.toContain('--mc-colors-btn-DEFAULT:');
  });

  it('keeps usage from another input id when a later file has no magic color usage', async () => {
    const uno = await createUno({ colors: { primary: 'rose' } });

    const first = await uno.generate('<div class="c-mc-primary-457"></div>', { preflights: true, id: 'a.vue' });
    expect(first.css).toContain('--mc-colors-primary-457:');

    const second = await uno.generate('<div class="text-white"></div>', { preflights: true, id: 'b.vue' });
    expect(second.css).toContain('--mc-colors-primary-457:');
    expect(second.css).toMatch(/--mc-source-colors-primary-457:\s*oklch\(/);
  });

  it('drops lightness-reverse source usage when a selector is removed from the same input id', async () => {
    const uno = await createUno({ colors: { primary: 'rose' } });

    const first = await uno.generate('<div class="mc-lr c-mc-primary-80"></div>', { preflights: true, id: 'lr.vue' });
    expect(first.css).toContain('--mc-source-colors-primary-920:');

    const second = await uno.generate('<div class="c-mc-primary-80"></div>', { preflights: true, id: 'lr.vue' });
    expect(second.css).toContain('--mc-source-colors-primary-80:');
    expect(second.css).not.toContain('--mc-source-colors-primary-920:');
  });

  it('updates custom definition output when target depths change', async () => {
    const uno = await createUno({}, { envMode: 'dev' });

    const first = await uno.generate('<div class="mc-btn_red c-mc-btn-80"></div>', { preflights: true, id: 'definition.vue' });
    expect(getCssVar(getSelectorBlock(first.css, '.mc-btn_red'), '--mc-colors-btn-80')).toBe('var(--mc-source-colors-red-80)');

    const second = await uno.generate('<div class="mc-btn_red c-mc-btn-100"></div>', { preflights: true, id: 'definition.vue' });
    const definitionBlock = getSelectorBlock(second.css, '.mc-btn_red');

    expect(getCssVar(definitionBlock, '--mc-colors-btn-100')).toBe('var(--mc-source-colors-red-100)');
    expect(getCssVar(definitionBlock, '--mc-colors-btn-80')).toBeUndefined();
    expect(second.css).toContain('var(--mc-colors-btn-100)');
  });

  it('updates custom definition output when target usage is removed from the same input id', async () => {
    const uno = await createUno({}, { envMode: 'dev' });

    const first = await uno.generate('<div class="mc-btn_red c-mc-btn-80"></div>', { preflights: true, id: 'definition-remove.vue' });
    expect(getCssVar(getSelectorBlock(first.css, '.mc-btn_red'), '--mc-colors-btn-80')).toBe('var(--mc-source-colors-red-80)');

    const second = await uno.generate('<div class="mc-btn_red"></div>', { preflights: true, id: 'definition-remove.vue' });

    expect(getSelectorBlock(second.css, '.mc-btn_red')).not.toContain('--mc-colors-btn-80');
  });

  it('updates global lightness-reverse output when target depths change', async () => {
    const uno = await createUno({ colors: { primary: 'rose' } }, { envMode: 'dev' });

    const first = await uno.generate('<div class="mc-lr c-mc-primary-80"></div>', { preflights: true, id: 'global-lr.vue' });
    expect(getCssVar(getSelectorBlock(first.css, '.mc-lr'), '--mc-colors-primary-80')).toBe('var(--mc-source-colors-primary-920)');

    const second = await uno.generate('<div class="mc-lr c-mc-primary-100"></div>', { preflights: true, id: 'global-lr.vue' });
    const lrBlock = getSelectorBlock(second.css, '.mc-lr');

    expect(getCssVar(lrBlock, '--mc-colors-primary-100')).toBe('var(--mc-source-colors-primary-900)');
    expect(getCssVar(lrBlock, '--mc-colors-primary-80')).toBeUndefined();
    expect(second.css).toContain('var(--mc-colors-primary-100)');
  });

  it('keeps variant definition selectors stable in dev mode', async () => {
    const uno = await createUno({}, { envMode: 'dev' });

    const { css } = await uno.generate('<div class="hover:mc-btn_red c-mc-btn-100"></div>', { preflights: true, id: 'variant-definition.vue' });
    const hoverBlock = getSelectorBlock(css, '.hover\\:mc-btn_red:hover');

    expect(getCssVar(hoverBlock, '--mc-colors-btn-100')).toBe('var(--mc-source-colors-red-100)');
  });

  it('keeps arbitrary color definition selectors stable in dev mode', async () => {
    const uno = await createUno({}, { envMode: 'dev' });

    const { css } = await uno.generate('<div class="mc-brand_[#9c1d1e] c-mc-brand"></div>', { preflights: true, id: 'arbitrary-definition.vue' });
    const definitionBlock = getSelectorBlock(css, '.mc-brand_\\[\\#9c1d1e\\]');

    expect(getCssVar(definitionBlock, '--mc-colors-brand-DEFAULT')).toBe('#9c1d1e');
  });
});

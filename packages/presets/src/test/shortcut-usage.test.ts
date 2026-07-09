import { describe, expect, it } from 'vitest';
import { createUno, getCssVar, getSelectorBlock } from './helpers';

describe('shortcut usage extraction', () => {
  it('tracks magic color utilities expanded from user shortcuts', async () => {
    const uno = await createUno(
      { colors: { primary: 'rose' } },
      { shortcuts: [['btn', 'bg-mc-primary hover:bg-mc-primary-630 text-white']] },
    );

    const { css } = await uno.generate('<button class="btn"></button>', { preflights: true, id: 'shortcut.vue' });

    expect(css).toContain('--mc-colors-primary-DEFAULT:');
    expect(css).toMatch(/--mc-source-colors-primary-630:\s*oklch\(/);
    expect(css).toContain('var(--mc-colors-primary-DEFAULT)');
    expect(css).toContain('var(--mc-colors-primary-630)');
  });

  it('uses shortcut grouped-variant depths when resolving external magic color definitions', async () => {
    const uno = await createUno(
      {},
      { shortcuts: [['btn', 'p-5 bg-mc-custom-777 hover:(bg-mc-custom-888 c-mc-custom-333)']] },
    );

    const { css } = await uno.generate('<button class="mc-custom_red btn"></button>', { preflights: true, id: 'grouped-variant-shortcut-definition.vue' });
    const definitionBlock = getSelectorBlock(css, '.mc-custom_red');

    expect(getCssVar(definitionBlock, '--mc-colors-custom-777')).toBe('var(--mc-source-colors-red-777)');
    expect(getCssVar(definitionBlock, '--mc-colors-custom-888')).toBe('var(--mc-source-colors-red-888)');
    expect(getCssVar(definitionBlock, '--mc-colors-custom-333')).toBe('var(--mc-source-colors-red-333)');
    expect(css).toMatch(/--mc-source-colors-red-777:\s*oklch\(/);
    expect(css).toMatch(/--mc-source-colors-red-888:\s*oklch\(/);
    expect(css).toMatch(/--mc-source-colors-red-333:\s*oklch\(/);
    expect(css).toContain('var(--mc-colors-custom-777)');
    expect(css).toContain('var(--mc-colors-custom-888)');
    expect(css).toContain('var(--mc-colors-custom-333)');
  });

  it('uses shortcut-declared depths when resolving magic color definitions', async () => {
    const uno = await createUno(
      {},
      { shortcuts: [['btn', 'bg-mc-btn-333 text-white']] },
    );

    const { css } = await uno.generate('<button class="btn mc-btn_red"></button>', { preflights: true, id: 'shortcut-definition.vue' });

    expect(css).toContain('--mc-colors-btn-333:var(--mc-source-colors-red-333)');
    expect(css).toMatch(/--mc-source-colors-red-333:\s*oklch\(/);
    expect(css).toContain('var(--mc-colors-btn-333)');
  });

  it('supports mixed inline and shortcut magic-color definitions on the same element', async () => {
    const uno = await createUno(
      {},
      { shortcuts: [['btn', 'mc-btn_blue-200 bg-mc-btn c-mc-btn-600']] },
    );

    const { css } = await uno.generate('<button class="mc-btn_red-100 btn"></button>', { preflights: true, id: 'mixed-shortcut-definition.vue' });
    const inlineDefinitionBlock = getSelectorBlock(css, '.mc-btn_red-100');
    const shortcutBlock = getSelectorBlock(css, '.btn');

    expect(getCssVar(inlineDefinitionBlock, '--mc-colors-btn-DEFAULT')).toBe('var(--mc-source-colors-red-100)');
    expect(getCssVar(inlineDefinitionBlock, '--mc-colors-btn-600')).toBe('var(--mc-source-colors-red-600)');
    expect(getCssVar(shortcutBlock, '--mc-colors-btn-DEFAULT')).toBe('var(--mc-source-colors-blue-200)');
    expect(getCssVar(shortcutBlock, '--mc-colors-btn-600')).toBe('var(--mc-source-colors-blue-600)');
    expect(shortcutBlock).toContain('var(--mc-colors-btn-DEFAULT)');
    expect(shortcutBlock).toContain('var(--mc-colors-btn-600)');
    expect(css).toMatch(/--mc-source-colors-red-100:\s*oklch\(/);
    expect(css).toMatch(/--mc-source-colors-red-600:\s*oklch\(/);
    expect(css).toMatch(/--mc-source-colors-blue-200:\s*oklch\(/);
    expect(css).toMatch(/--mc-source-colors-blue-600:\s*oklch\(/);
  });

  it('ignores configured shortcut target usage when the shortcut selector is not used', async () => {
    const uno = await createUno(
      { colors: { primary: 'rose' } },
      { shortcuts: [['unused-btn', 'bg-mc-primary-630 text-white']] },
    );

    const { css } = await uno.generate('<button class="mc-btn_red"></button>', { preflights: true, id: 'unused-shortcut.vue' });

    expect(css).not.toContain('--mc-colors-primary-630:');
    expect(css).not.toMatch(/--mc-source-colors-primary-630:\s*oklch\(/);
    expect(css).not.toContain('var(--mc-colors-primary-630)');
  });

  it('drops shortcut-expanded usage when the same input no longer uses the shortcut', async () => {
    const uno = await createUno(
      { colors: { primary: 'rose' } },
      { shortcuts: [['btn', 'bg-mc-primary hover:bg-mc-primary-630 text-white']] },
    );

    const first = await uno.generate('<button class="btn"></button>', { preflights: true, id: 'shortcut.vue' });
    expect(first.css).toContain('--mc-colors-primary-DEFAULT:');

    const second = await uno.generate('<button class="text-white"></button>', { preflights: true, id: 'shortcut.vue' });
    expect(second.css).not.toContain('--mc-colors-primary-DEFAULT:');
    expect(second.css).not.toContain('--mc-colors-primary-630:');
  });

  it('tracks shortcut-expanded usage for selector-local lightness reverse', async () => {
    const uno = await createUno(
      { colors: { primary: 'rose' } },
      { shortcuts: [['btn', 'p-5 bg-mc-primary-333 text-white cursor-pointer']] },
    );

    const { css } = await uno.generate('<div class="btn hover:mc-lr-primary_primary">5555</div>', { preflights: true, id: 'shortcut-lr.vue' });
    const hoverBlock = getSelectorBlock(css, '.hover\\:mc-lr-primary_primary:hover');

    expect(getCssVar(hoverBlock, '--mc-colors-primary-333')).toBe('var(--mc-source-colors-primary-667)');
    expect(getCssVar(css, '--mc-colors-primary-333')).toBe('var(--mc-source-colors-primary-333)');
    expect(css).toContain('var(--mc-colors-primary-333)');
  });

  it('uses dynamic shortcut-declared depths when resolving magic color definitions', async () => {
    const uno = await createUno(
      {},
      { shortcuts: [[/^btn$/, () => 'bg-mc-btn-333 text-white']] },
    );

    const { css } = await uno.generate('<button class="btn mc-btn_red"></button>', { preflights: true, id: 'dynamic-shortcut-definition.vue' });
    const definitionBlock = getSelectorBlock(css, '.mc-btn_red');

    expect(getCssVar(definitionBlock, '--mc-colors-btn-333')).toBe('var(--mc-source-colors-red-333)');
    expect(getCssVar(css, '--mc-source-colors-red-333')).toMatch(/^oklch\(/);
    expect(css).toContain('var(--mc-colors-btn-333)');
  });
});

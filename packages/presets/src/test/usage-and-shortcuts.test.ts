import type { RuleContext, Shortcut } from 'unocss';
import { describe, expect, it } from 'vitest';
import { MagicColorUsage } from '../usages';
import { scanUsage } from '../usages/scanner';
import { createUno, generateWithDirectives, getCssVar, getSelectorBlock } from './helpers';

function createShortcutRuleContext(shortcuts: Shortcut[]): RuleContext {
  return { generator: { config: { shortcuts } } } as unknown as RuleContext;
}

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

  it('updates dev cached custom definition output when target depths change', async () => {
    const uno = await createUno({ devCacheToken: true }, { envMode: 'dev' });

    const first = await uno.generate('<div class="mc-btn_red c-mc-btn-80"></div>', { preflights: true, id: 'definition.vue' });
    expect(getCssVar(getSelectorBlock(first.css, '.mc-btn_red'), '--mc-colors-btn-80')).toBe('var(--mc-source-colors-red-80)');

    const second = await uno.generate('<div class="mc-btn_red c-mc-btn-100"></div>', { preflights: true, id: 'definition.vue' });
    const definitionBlock = getSelectorBlock(second.css, '.mc-btn_red');

    expect(getCssVar(definitionBlock, '--mc-colors-btn-100')).toBe('var(--mc-source-colors-red-100)');
    expect(getCssVar(definitionBlock, '--mc-colors-btn-80')).toBeUndefined();
    expect(second.css).toContain('var(--mc-colors-btn-100)');
    expect(second.css).not.toContain('mc-dev');
  });

  it('keeps dev token out when target usage is removed', async () => {
    const uno = await createUno({ devCacheToken: true }, { envMode: 'dev' });

    const first = await uno.generate('<div class="mc-btn_red c-mc-btn-80"></div>', { preflights: true, id: 'definition-remove.vue' });
    expect(getCssVar(getSelectorBlock(first.css, '.mc-btn_red'), '--mc-colors-btn-80')).toBe('var(--mc-source-colors-red-80)');

    const second = await uno.generate('<div class="mc-btn_red"></div>', { preflights: true, id: 'definition-remove.vue' });

    expect(getSelectorBlock(second.css, '.mc-btn_red')).not.toContain('--mc-colors-btn-80');
    expect(second.css).not.toContain('mc-dev');
  });

  it('updates dev cached global lightness-reverse output when target depths change', async () => {
    const uno = await createUno({ colors: { primary: 'rose' }, devCacheToken: true }, { envMode: 'dev' });

    const first = await uno.generate('<div class="mc-lr c-mc-primary-80"></div>', { preflights: true, id: 'global-lr.vue' });
    expect(getCssVar(getSelectorBlock(first.css, '.mc-lr'), '--mc-colors-primary-80')).toBe('var(--mc-source-colors-primary-920)');

    const second = await uno.generate('<div class="mc-lr c-mc-primary-100"></div>', { preflights: true, id: 'global-lr.vue' });
    const lrBlock = getSelectorBlock(second.css, '.mc-lr');

    expect(getCssVar(lrBlock, '--mc-colors-primary-100')).toBe('var(--mc-source-colors-primary-900)');
    expect(getCssVar(lrBlock, '--mc-colors-primary-80')).toBeUndefined();
    expect(second.css).toContain('var(--mc-colors-primary-100)');
    expect(second.css).not.toContain('mc-dev');
  });

  it('keeps dev token out of variant definition selectors', async () => {
    const uno = await createUno({ devCacheToken: true }, { envMode: 'dev' });

    const { css } = await uno.generate('<div class="hover:mc-btn_red c-mc-btn-100"></div>', { preflights: true, id: 'variant-definition.vue' });
    const hoverBlock = getSelectorBlock(css, '.hover\\:mc-btn_red:hover');

    expect(getCssVar(hoverBlock, '--mc-colors-btn-100')).toBe('var(--mc-source-colors-red-100)');
    expect(css).not.toContain('mc-dev');
  });

  it('keeps dev token out of arbitrary color definition selectors', async () => {
    const uno = await createUno({ devCacheToken: true }, { envMode: 'dev' });

    const { css } = await uno.generate('<div class="mc-brand_[#9c1d1e] c-mc-brand"></div>', { preflights: true, id: 'arbitrary-definition.vue' });
    const definitionBlock = getSelectorBlock(css, '.mc-brand_\\[\\#9c1d1e\\]');

    expect(getCssVar(definitionBlock, '--mc-colors-brand-DEFAULT')).toBe('#9c1d1e');
    expect(css).not.toContain('mc-dev');
  });
});

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

describe('usage scanner and cache bookkeeping', () => {
  it('adds dev cache tokens only when explicitly enabled', () => {
    const disabledUsage = new MagicColorUsage();
    const disabledExtracted = new Set(['mc-btn_red']);

    disabledUsage.extractor.extract?.({
      extracted: disabledExtracted,
      id: 'dev-cache-disabled.vue',
      original: '',
      code: '',
      envMode: 'dev',
    });

    expect(disabledExtracted).toEqual(new Set(['mc-btn_red']));

    const enabledUsage = new MagicColorUsage({ devCacheToken: true });
    const enabledExtracted = new Set(['mc-btn_red']);

    enabledUsage.extractor.extract?.({
      extracted: enabledExtracted,
      id: 'dev-cache-enabled.vue',
      original: '',
      code: '',
      envMode: 'dev',
    });

    expect(Array.from(enabledExtracted)).toEqual(['mc-btn_red:mc-dev-1']);
  });

  it('records all shortcut-expanded target usage when explicitly requested', () => {
    const usage = new MagicColorUsage();
    const context = createShortcutRuleContext([
      ['btn', 'bg-mc-primary-333 text-mc-secondary-640'],
    ]);

    usage.extractor.extract?.({
      extracted: new Set(['btn']),
      id: 'shortcut-all.vue',
      original: '',
      code: '',
    });

    expect(usage.getTargetDepths('primary')).toBeUndefined();

    usage.recordShortcutTargetUsages(context);

    expect(usage.getTargetDepths('primary')).toEqual(new Set([333]));
    expect(usage.getTargetDepths('secondary')).toEqual(new Set([640]));
  });

  it('scans shortcut target usage once per extractor version', () => {
    const usage = new MagicColorUsage();
    let resolveCount = 0;
    const context = createShortcutRuleContext([
      [/^btn$/, () => {
        resolveCount += 1;
        return 'bg-mc-primary-333 text-mc-secondary-640';
      }],
    ]);

    usage.extractor.extract?.({
      extracted: new Set(['btn']),
      id: 'shortcut-once.vue',
      original: '',
      code: '',
    });

    usage.recordShortcutTargetUsages(context);
    usage.recordShortcutTargetUsages(context);

    expect(usage.getTargetDepths('primary')).toEqual(new Set([333]));
    expect(usage.getTargetDepths('secondary')).toEqual(new Set([640]));
    expect(usage.getTargetNames()).toEqual(expect.arrayContaining(['primary', 'secondary']));
    expect(resolveCount).toBe(1);
  });

  it('merges repeated lightness-reverse source usage for the same selector', () => {
    const usage = new MagicColorUsage();

    usage.extractor.extract?.({
      extracted: new Set(['mc-lr-primary_primary']),
      id: 'same-selector.vue',
      original: '',
      code: '',
    });
    usage.recordSourceUsage('mc-lr-primary_primary', new Map([
      ['primary', new Set([920])],
    ]));
    usage.recordSourceUsage('mc-lr-primary_primary', new Map([
      ['primary', new Set([80])],
      ['secondary', new Set([880])],
    ]));

    expect(usage.getSourceDepths('primary')).toEqual(new Set([920, 80]));
    expect(usage.getSourceDepths('secondary')).toEqual(new Set([880]));
  });

  it('keeps cache references stable when repeated selector updates add no new data', () => {
    const usage = new MagicColorUsage();

    usage.extractor.extract?.({
      extracted: new Set(['mc-lr-primary_primary']),
      id: 'cache.vue',
      original: '',
      code: '',
    });
    usage.recordSourceUsage('mc-lr-primary_primary', new Map([
      ['primary', new Set([920])],
    ]));

    const cachedDepths = usage.getSourceDepths('primary');

    usage.recordSourceUsage('mc-lr-primary_primary', new Map([
      ['primary', new Set([920])],
    ]));

    expect(usage.getSourceDepths('primary')).toBe(cachedDepths);

    usage.recordSourceUsage('mc-lr-primary_primary', new Map([
      ['primary', new Set([80])],
    ]));

    expect(usage.getSourceDepths('primary')).toEqual(new Set([920, 80]));
    expect(usage.getSourceDepths('primary')).not.toBe(cachedDepths);
  });

  it('normalizes variants while preserving opacity and modifier suffixes', () => {
    const scan = scanUsage(new Set([
      'hover:bg-mc-primary-333/50',
      'dark:focus:c-mc-secondary640:20',
      'mc-primary_rose',
    ]));

    expect(scan.colors.get('primary')).toEqual(new Set([333]));
    expect(scan.colors.get('secondary')).toEqual(new Set([640]));
    expect(scan.colors.has('primary_rose')).toBe(false);
  });

  it('ignores literal and function colors in usage scans', () => {
    const scan = scanUsage(new Set([
      'bg-mc-primary-333',
      'c-mc-[#123456]-500',
      'bg-mc-[rgb(12,22,33)]',
      'bg-mc-[hsl(210_60%_40%)]-300',
      'bg-mc-[hsb(210_60%_40%)]-300',
      'bg-mc-[lab(60_20_10)]-350',
      'bg-mc-[lch(40_20_21.57)]-400',
      'bg-mc-[oklch(40.1%_0.123_21.57)]-200',
      'bg-mc-[oklab(40.1%_0.1_0.2)]-500',
      'bg-mc-[var(--brand-color)]',
      'bg-mc-[calc(var(--brand-depth)_*_1%)]',
    ]));

    expect(scan.colors).toEqual(new Map([
      ['primary', new Set([333])],
    ]));
  });
});

describe('directive and safelist usage extraction', () => {
  it('tracks magic color usage from --at-apply declarations', async () => {
    const { css } = await generateWithDirectives(
      '.btn { --at-apply: bg-mc-primary-630; p-5; }',
      { colors: { primary: 'rose' } },
      'at-apply.css',
    );

    expect(css).toContain('--mc-colors-primary-630:');
    expect(css).toMatch(/--mc-source-colors-primary-630:\s*oklch\(/);
  });

  it('tracks magic color usage from @apply declarations', async () => {
    const { css } = await generateWithDirectives(
      '.card { @apply c-mc-primary-457; p-5; }',
      { colors: { primary: 'rose' } },
      'apply.css',
    );

    expect(css).toContain('--mc-colors-primary-457:');
    expect(css).toMatch(/--mc-source-colors-primary-457:\s*oklch\(/);
  });

  it('tracks ownerless magic color usage from safelist rules', async () => {
    const uno = await createUno(
      { colors: { primary: 'rose' } },
      { safelist: ['bg-mc-primary-630'] },
    );

    const { css } = await uno.generate('<div class="text-white"></div>', { preflights: true, id: 'safelist.vue' });

    expect(css).toContain('--mc-colors-primary-630:');
    expect(css).toMatch(/--mc-source-colors-primary-630:\s*oklch\(/);
    expect(css).toContain('var(--mc-colors-primary-630)');
  });

  it('tracks ownerless magic color usage from safelist rules in dev mode', async () => {
    const uno = await createUno(
      { colors: { primary: 'rose' } },
      { envMode: 'dev', safelist: ['bg-mc-primary-630'] },
    );

    const { css } = await uno.generate('<div class="text-white"></div>', { preflights: true, id: 'safelist-dev.vue' });

    expect(css).toContain('--mc-colors-primary-630:');
    expect(css).toMatch(/--mc-source-colors-primary-630:\s*oklch\(/);
    expect(css).toContain('var(--mc-colors-primary-630)');
    expect(css).not.toContain('mc-dev');
  });
});

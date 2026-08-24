import type { RuleContext, Shortcut } from 'unocss';
import { describe, expect, it } from 'vitest';
import { MagicColorUsage } from '../usages';
import { scanUsage } from '../usages/scanner';

function createShortcutRuleContext(shortcuts: Shortcut[]): RuleContext {
  return { generator: { config: { shortcuts } } } as unknown as RuleContext;
}

function createRuleContext(rawSelector: string, invalidatedTokens: string[] = []): RuleContext {
  return {
    rawSelector,
    generator: { invalidateToken: (token: string) => invalidatedTokens.push(token) },
  } as unknown as RuleContext;
}

describe('usage scanner and cache bookkeeping', () => {
  it('does not mutate extracted tokens while scanning usage', () => {
    const usage = new MagicColorUsage();
    const extracted = new Set([
      'mc-btn_red',
      '[mc-definition=""]',
      '[mc~="lr"]',
      '[un-mc-brand_rose=""]',
    ]);

    usage.extractor.extract?.({
      extracted,
      id: 'usage-scan.vue',
      original: '',
      code: '',
      envMode: 'dev',
    });

    expect(extracted).toEqual(new Set([
      'mc-btn_red',
      '[mc~="lr"]',
      '[mc-definition=""]',
      '[un-mc-brand_rose=""]',
    ]));
  });

  it('invalidates usage-dependent tokens only when rule usage changes', () => {
    const usage = new MagicColorUsage();
    const invalidatedTokens: string[] = [];
    const context = createRuleContext('mc-btn_red', invalidatedTokens);

    usage.recordUsageDependentToken(context);
    usage.recordRuleSourceUsage(context, new Map([
      ['primary', new Set([333])],
    ]));

    expect(invalidatedTokens).toEqual(['mc-btn_red']);
    expect(invalidatedTokens).not.toContain('hover:mc-lr-primary_primary');
    expect(invalidatedTokens).not.toContain('bg-mc-primary-333');
    expect(invalidatedTokens).not.toContain('text-white');

    usage.recordRuleSourceUsage(context, new Map([
      ['primary', new Set([333])],
    ]));

    expect(invalidatedTokens).toEqual(['mc-btn_red']);
  });

  it('keeps source rule scan recording separate from cache token registration', () => {
    const usage = new MagicColorUsage();
    const invalidatedTokens: string[] = [];
    const context = createRuleContext('mc-btn_red', invalidatedTokens);

    usage.recordRuleSourceUsage(context, new Map([
      ['primary', new Set([333])],
    ]));

    expect(invalidatedTokens).toEqual([]);
  });

  it('seeds direct target rule usage during extractor scans', () => {
    const usage = new MagicColorUsage();
    const invalidatedTokens: string[] = [];
    const sourceContext = createRuleContext('mc-btn_red', invalidatedTokens);

    usage.recordRuleSourceUsage(sourceContext, new Map([
      ['primary', new Set([333])],
    ]));

    usage.extractor.extract?.({
      extracted: new Set(['bg-mc-primary-333']),
      id: 'target-seed.vue',
      original: '',
      code: '',
    });

    const targetContext = createRuleContext('bg-mc-primary-333', invalidatedTokens);
    usage.recordRuleTargetUsage(targetContext, new Map([
      ['primary', new Set([333])],
    ]));
    usage.recordRuleTargetUsage(targetContext, new Map([
      ['primary', new Set([333])],
    ]));

    expect(invalidatedTokens).toEqual([]);
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
    const context = createRuleContext('mc-lr-primary_primary');

    usage.extractor.extract?.({
      extracted: new Set(['mc-lr-primary_primary']),
      id: 'same-selector.vue',
      original: '',
      code: '',
    });
    usage.recordRuleSourceUsage(context, new Map([
      ['primary', new Set([920])],
    ]));
    usage.recordRuleSourceUsage(context, new Map([
      ['primary', new Set([80])],
      ['secondary', new Set([880])],
    ]));

    expect(usage.getSourceDepths('primary')).toEqual(new Set([920, 80]));
    expect(usage.getSourceDepths('secondary')).toEqual(new Set([880]));
  });

  it('keeps cache references stable when repeated selector updates add no new data', () => {
    const usage = new MagicColorUsage();
    const context = createRuleContext('mc-lr-primary_primary');

    usage.extractor.extract?.({
      extracted: new Set(['mc-lr-primary_primary']),
      id: 'cache.vue',
      original: '',
      code: '',
    });
    usage.recordRuleSourceUsage(context, new Map([
      ['primary', new Set([920])],
    ]));

    const cachedDepths = usage.getSourceDepths('primary');

    usage.recordRuleSourceUsage(context, new Map([
      ['primary', new Set([920])],
    ]));

    expect(usage.getSourceDepths('primary')).toBe(cachedDepths);

    usage.recordRuleSourceUsage(context, new Map([
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

    expect(scan.get('primary')).toEqual(new Set([333]));
    expect(scan.get('secondary')).toEqual(new Set([640]));
    expect(scan.has('primary_rose')).toBe(false);
  });

  it('accepts any iterable token collection while scanning usage', () => {
    const scan = scanUsage([
      'bg-mc-primary-333',
      'text-mc-secondary-640',
    ]);

    expect(scan.get('primary')).toEqual(new Set([333]));
    expect(scan.get('secondary')).toEqual(new Set([640]));
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

    expect(scan).toEqual(new Map([
      ['primary', new Set([333])],
    ]));
  });
});

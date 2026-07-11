import { describe, expect, it } from 'vitest';
import { scanUsage } from '../usages/scanner';
import { generate } from './helpers';

describe('basic magic color usage', () => {
  it('generates only variables required by scanned custom color depths', async () => {
    const { css } = await generate('<div class="mc-btn_red bg-mc-btn-640 c-mc-btn-200 c-mc-btn"></div>');

    expect(css).toContain('--mc-colors-btn-DEFAULT:');
    expect(css).toContain('--mc-colors-btn-200:var(--mc-source-colors-red-200)');
    expect(css).toContain('--mc-colors-btn-640:var(--mc-source-colors-red-640)');
    expect(css).toMatch(/--mc-source-colors-red-200:\s*oklch\(/);
    expect(css).toMatch(/--mc-source-colors-red-640:\s*oklch\(/);
    expect(css).not.toContain('--mc-btn-300-l:');
  });

  it('uses generated depth color variables without per-selector channel variables', async () => {
    const { css } = await generate('<div class="mc-btn_red bg-mc-btn-640"></div>');

    expect(css).toContain('var(--mc-colors-btn-640)');
    expect(css).toContain('--mc-colors-btn-640:var(--mc-source-colors-red-640)');
    expect(css).toMatch(/--mc-source-colors-red-640:\s*oklch\(/);
    expect(css).not.toContain('--mc-colors-btn-DEFAULT:');
    expect(css).not.toContain('--mc-btn-640-l:');
  });

  it('tracks custom color depths with opacity modifiers', async () => {
    const { css } = await generate('<div class="mc-btn_red bg-mc-btn-640/50"></div>');

    expect(css).toContain('--mc-colors-btn-640:var(--mc-source-colors-red-640)');
    expect(css).toMatch(/--mc-source-colors-red-640:\s*oklch\(/);
    expect(css).toContain('var(--mc-colors-btn-640)');
  });

  it('does not generate depth variables when only a base custom color is used', async () => {
    const { css } = await generate('<div class="mc-btn_red c-mc-btn"></div>');

    expect(css).toContain('--mc-colors-btn-DEFAULT:');
    expect(css).toContain('var(--mc-colors-btn-DEFAULT)');
    expect(css).not.toContain('--mc-colors-btn-200:');
  });

  it('does not treat a color definition token as a public usage token', async () => {
    const { css } = await generate('<div class="mc-btn_red"></div>');

    expect(css).not.toContain('--mc-colors-btn-DEFAULT:');
    expect(css).not.toContain('--mc-colors-btn-200:');
  });

  it('requires extractor-scanned input before arbitrary-depth variables are emitted', async () => {
    const { css } = await generate(['mc-btn_red', 'bg-mc-btn-640']);

    expect(css).not.toContain('--mc-colors-btn-DEFAULT:');
    expect(css).not.toContain('--mc-colors-btn-640:');
  });

  it('matches compact and hyphenated depth syntaxes', async () => {
    const { css } = await generate(
      '<div class="mc-btn_red bg-mc-grape120:20 bg-mc-grape-123 c-mc-btn230 c-mc-my-btn-630"></div>',
      { colors: { 'grape': 'rose', 'my-btn': 'green' } },
    );

    expect(css).toMatch(/--mc-source-colors-grape-120:\s*oklch\(/);
    expect(css).toMatch(/--mc-source-colors-grape-123:\s*oklch\(/);
    expect(css).toContain('--mc-colors-btn-230:var(--mc-source-colors-red-230)');
    expect(css).toContain('--mc-colors-my-btn-630:');
    expect(css).not.toContain('--mc-colors-grape120-DEFAULT:');
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

    expect(css).toContain('--mc-colors-red-123:');
    expect(css).toContain('--mc-colors-btn-230:');
    expect(css).toContain('--mc-colors-my-btn-630:');
    expect(css).toContain('--mc-colors-gg-560:');
    expect(css).toContain('--mc-colors-aa-99:');
    expect(css).toContain('--mc-colors-ss-DEFAULT:');
    expect(css).toContain('--mc-colors-qq-DEFAULT:');
  });

  it('ignores mc-prefixed definition and control tokens in direct scans', () => {
    const scan = scanUsage(new Set([
      'mc-btn_red',
      'mc-primary',
      'mc-lr-primary',
      'hover:mc-primary',
      'hover:mc-lr-my-btn',
    ]));

    expect(scan.size).toBe(1);
  });
});

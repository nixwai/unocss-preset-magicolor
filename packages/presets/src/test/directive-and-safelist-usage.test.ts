import { describe, expect, it } from 'vitest';
import { createUno, generateWithDirectives } from './helpers';

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

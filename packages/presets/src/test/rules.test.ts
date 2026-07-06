import { describe, expect, it } from 'vitest';
import { generate } from './helpers';

describe('color style rules', () => {
  it('resolves text and background aliases through magic color variables', async () => {
    const { css } = await generate('<div class="c-mc-rose-445 color-mc-rose-445 text-mc-rose-445 text-color-mc-rose-445 bg-mc-rose-445"></div>');

    expect(css).toContain('color:');
    expect(css).toContain('background-color:');
    expect(css).toContain('var(--mc-colors-rose-445)');
  });

  it('uses variables for configured colors and UnoCSS theme colors scanned from markup', async () => {
    const { css } = await generate(
      '<div class="c-mc-primary-333 bg-mc-brand-700 border-mc-rose-445 outline-mc-red-600 ring-mc-blue-200"></div>',
      { colors: { primary: 'rose', brand: '#4f7bff' } },
    );

    expect(css).toContain('--mc-colors-primary-333: var(--mc-source-colors-primary-333);');
    expect(css).toContain('--mc-colors-brand-700: var(--mc-source-colors-brand-700);');
    expect(css).toContain('--mc-colors-rose-445: var(--mc-source-colors-rose-445);');
    expect(css).toContain('--mc-colors-red-600: var(--mc-source-colors-red-600);');
    expect(css).toContain('--mc-colors-blue-200: var(--mc-source-colors-blue-200);');
    expect(css).toMatch(/--mc-source-colors-primary-333:\s*oklch\(/);
    expect(css).toMatch(/--mc-source-colors-brand-700:\s*oklch\(/);
    expect(css).toMatch(/--mc-source-colors-rose-445:\s*oklch\(/);
    expect(css).toMatch(/--mc-source-colors-red-600:\s*oklch\(/);
    expect(css).toMatch(/--mc-source-colors-blue-200:\s*oklch\(/);
    expect(css).toContain('color:color-mix(in oklab, var(--mc-colors-primary-333)');
    expect(css).toContain('background-color:color-mix(in oklab, var(--mc-colors-brand-700)');
    expect(css).toContain('border-color:color-mix(in oklab, var(--mc-colors-rose-445)');
    expect(css).toContain('outline-color:color-mix(in srgb, var(--mc-colors-red-600)');
    expect(css).toContain('--un-ring-color:color-mix(in srgb, var(--mc-colors-blue-200)');
  });

  it('resolves form, outline and decoration colors', async () => {
    const { css } = await generate('<div class="outline-mc-rose-445 outline-color-mc-rose-445 accent-mc-rose-445 caret-mc-rose-445 underline-mc-rose-445 decoration-mc-rose-445"></div>');

    expect(css).toContain('outline-color:');
    expect(css).toContain('accent-color:');
    expect(css).toContain('caret-color:');
    expect(css).toContain('text-decoration-color:');
    expect(css).toContain('-webkit-text-decoration-color:');
  });

  it('resolves divide, ring, shadow, fill, stroke and text-shadow color rules', async () => {
    const { css } = await generate('<div class="divide-mc-rose-445 ring-mc-rose-445 inset-ring-mc-rose-445 ring-offset-mc-rose-445 shadow-mc-rose-445 inset-shadow-mc-rose-445 fill-mc-rose-445 stroke-mc-rose-445 text-stroke-mc-rose-445 text-shadow-mc-rose-445 text-shadow-color-mc-rose-445"></div>');

    expect(css).toContain('border-color:');
    expect(css).toContain('--un-ring-color:');
    expect(css).toContain('--un-inset-ring-color:');
    expect(css).toContain('--un-ring-offset-color:');
    expect(css).toContain('--un-shadow-color:');
    expect(css).toContain('--un-inset-shadow-color:');
    expect(css).toContain('fill:');
    expect(css).toContain('stroke:');
    expect(css).toContain('-webkit-text-stroke-color:');
    expect(css).toContain('--un-text-shadow-color:');
  });

  it('resolves drop-shadow color rule aliases', async () => {
    const { css } = await generate('<div class="drop-shadow-color-mc-rose-445 filter-drop-shadow-color-mc-rose-445"></div>');

    expect(css).toContain('--un-drop-shadow-color:');
  });

  it('resolves direct drop-shadow color aliases like Wind4 color shadows', async () => {
    const { css } = await generate('<div class="drop-shadow-mc-rose-445 filter-drop-shadow-mc-rose-445"></div>');

    expect(css).toContain('.drop-shadow-mc-rose-445');
    expect(css).toContain('.filter-drop-shadow-mc-rose-445');
    expect(css).toContain('--un-drop-shadow-color:');
    expect(css).toContain('var(--mc-colors-rose-445)');
  });

  it('resolves direct placeholder color aliases through the placeholder selector', async () => {
    const { css } = await generate('<input class="placeholder-mc-rose-445 placeholder-mc-rose-445/50">');

    expect(css).toContain('.placeholder-mc-rose-445::placeholder');
    expect(css).toContain('.placeholder-mc-rose-445\\/50::placeholder');
    expect(css).toContain('--un-placeholder-opacity');
    expect(css).toContain('var(--mc-colors-rose-445)');
  });

  it('resolves special color keywords directly without generated variables', async () => {
    const { css } = await generate('<div class="c-mc-transparent c-mc-transparent-500 c-mc-current c-mc-inherit"></div>');

    expect(css).toMatch(/\.c-mc-transparent,\s*\.c-mc-transparent-500\{color:transparent;\}/);
    expect(css).toContain('.c-mc-current{color:currentColor;}');
    expect(css).toContain('.c-mc-inherit{color:inherit;}');
    expect(css).not.toContain('--mc-colors-transparent-DEFAULT:');
    expect(css).not.toContain('--mc-colors-transparent-500:');
  });
});

describe('border color rules', () => {
  it('resolves plain, shorthand, directional, axis and logical border colors', async () => {
    const { css } = await generate(
      '<div class="border-mc-rose-445 b-mc-rose-445 border-l-mc-rose-445 border-r-mc-rose-445 border-t-mc-rose-445 border-b-mc-rose-445 border-x-mc-rose-445 border-y-mc-rose-445 border-s-mc-rose-445 border-e-mc-rose-445 border-block-mc-rose-445 border-inline-mc-rose-445 border-bs-mc-rose-445 border-be-mc-rose-445 border-is-mc-rose-445 border-ie-mc-rose-445"></div>',
    );

    expect(css).toContain('border-color:');
    expect(css).toContain('border-left-color:');
    expect(css).toContain('border-right-color:');
    expect(css).toContain('border-top-color:');
    expect(css).toContain('border-bottom-color:');
    expect(css).toContain('border-inline-color:');
    expect(css).toContain('border-block-color:');
    expect(css).toContain('border-inline-start-color:');
    expect(css).toContain('border-inline-end-color:');
    expect(css).toContain('border-block-start-color:');
    expect(css).toContain('border-block-end-color:');
  });

  it('resolves optional color- segments and b- aliases for every border rule group', async () => {
    const { css } = await generate(
      '<div class="border-color-mc-rose-445 b-color-mc-rose-445 b-x-color-mc-rose-445 border-y-color-mc-rose-445 b-l-color-mc-rose-445 border-e-color-mc-rose-445 b-block-color-mc-rose-445 border-inline-color-mc-rose-445 b-bs-color-mc-rose-445 border-ie-color-mc-rose-445"></div>',
    );

    expect(css).toContain('border-color:');
    expect(css).toContain('border-inline-color:');
    expect(css).toContain('border-block-color:');
    expect(css).toContain('border-left-color:');
    expect(css).toContain('border-inline-end-color:');
    expect(css).toContain('border-block-start-color:');
  });
});

describe('gradient and mask color rules', () => {
  it('resolves from, via, to and stops gradient colors', async () => {
    const { css } = await generate('<div class="from-mc-rose-445 via-mc-rose-445 to-mc-rose-445 stops-mc-rose-445"></div>');

    expect(css).toContain('--un-gradient-from:');
    expect(css).toContain('--un-gradient-via:');
    expect(css).toContain('--un-gradient-to:');
    expect(css).toContain('--un-gradient-stops:');
  });

  it('handles special gradient color keys and non-magic arbitrary gradient colors', async () => {
    const special = await generate('<div class="from-mc-transparent to-mc-current"></div>', { colors: { transparent: 'transparent', current: 'currentColor' } });
    const arbitrary = await generate('<div class="from-[#fff] to-[#000]"></div>');

    expect(special.css).toContain('--un-gradient-from');
    expect(special.css).toContain('--un-gradient-to');
    expect(arbitrary.css).toBeTruthy();
  });

  it('resolves linear, radial and conic mask color stops in from and to positions', async () => {
    const { css } = await generate('<div class="mask-linear-from-mc-rose-445 mask-linear-to-mc-rose-445 mask-radial-from-mc-rose-445 mask-radial-to-mc-rose-445 mask-conic-from-mc-rose-445 mask-conic-to-mc-rose-445"></div>');

    expect(css).toContain('mask-image:');
    expect(css).toContain('mask-composite:');
    expect(css).toContain('--un-mask-linear');
    expect(css).toContain('--un-mask-radial');
    expect(css).toContain('--un-mask-conic');
  });

  it('resolves every directional mask color stop shorthand', async () => {
    const { css } = await generate('<div class="mask-t-from-mc-rose-445 mask-t-to-mc-rose-445 mask-r-from-mc-rose-445 mask-r-to-mc-rose-445 mask-b-from-mc-rose-445 mask-b-to-mc-rose-445 mask-l-from-mc-rose-445 mask-l-to-mc-rose-445 mask-x-from-mc-rose-445 mask-x-to-mc-rose-445 mask-y-from-mc-rose-445 mask-y-to-mc-rose-445"></div>');

    expect(css).toContain('mask-image:');
    expect(css).toContain('--un-mask-top');
    expect(css).toContain('--un-mask-right');
    expect(css).toContain('--un-mask-bottom');
    expect(css).toContain('--un-mask-left');
  });
});

describe('arbitrary and invalid color rule inputs', () => {
  it('supports bracket arbitrary colors with legal CSS color syntaxes', async () => {
    const { css } = await generate(
      '<div class="c-mc-[#789411]-430 bg-mc-[#1313aa]1200 bg-mc-[rgb(12,22,33)] bg-mc-[rgb(12_22_33)]-220 bg-mc-[hsl(210_60%_40%)]-300 bg-mc-[lab(60_20_10)]-350 bg-mc-[lch(40_20_21.57)]-400 bg-mc-[oklch(40.1%_0.123_21.57)]-200 bg-mc-[oklab(40.1%_0.1_0.2)]-500"></div>',
    );

    expect(css).toMatch(/color:color-mix\(in oklab, oklch\(/);
    expect(css).toContain('.bg-mc-\\[rgb\\(12\\,22\\,33\\)\\]{background-color:color-mix(in oklab, rgb(12,22,33)');
    expect(css).not.toContain('var(--mc-colors-[');
    expect(css).not.toContain('--mc-colors-[');
  });

  it('ignores invalid numeric magic colors without console-facing variables', async () => {
    const { css } = await generate('<div class="c-mc-123"></div>');

    expect(css).not.toContain('.c-mc-123');
    expect(css).not.toContain('--mc-colors-123-DEFAULT:');
    expect(css).not.toContain('oklch(undefined');
  });

  it('keeps unresolved magic color names as target variables', async () => {
    const { css } = await generate('<div class="c-mc-notacolor bg-mc-notacolor"></div>');

    expect(css).toContain('.c-mc-notacolor');
    expect(css).toContain('.bg-mc-notacolor');
    expect(css).toContain('var(--mc-colors-notacolor-DEFAULT)');
    expect(css).not.toContain('--mc-colors-notacolor-DEFAULT:');
  });
});

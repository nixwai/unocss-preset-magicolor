import { describe, expect, it } from 'vitest';
import { presetMagicolor } from '../index';
import { generate } from './helpers';

describe('presetMagicolor wiring', () => {
  it('exposes preset metadata, layers, extractor, rules and preflights', () => {
    const preset = presetMagicolor();

    expect(preset.name).toBe('unocss-preset-magicolor');
    expect(preset.layer).toBe('unocss-preset-magicolor');
    expect(preset.layers).toEqual({ 'unocss-preset-magicolor': -100 });
    expect(Array.isArray(preset.extractors)).toBe(true);
    expect(preset.extractors).toHaveLength(1);
    expect(Array.isArray(preset.rules)).toBe(true);
    expect((preset.rules?.length ?? 0)).toBeGreaterThan(0);
    expect(Array.isArray(preset.preflights)).toBe(true);
  });

  it('accepts omitted options and keeps the default export aligned', async () => {
    const mod = await import('../index');

    expect(presetMagicolor().name).toBe('unocss-preset-magicolor');
    expect(mod.default).toBe(mod.presetMagicolor);
  });

  it('isolates scanned usage state between preset instances', async () => {
    const first = await generate('<div class="mc-btn_red c-mc-btn-200"></div>');
    expect(first.css).toContain('--mc-colors-btn-200:var(--mc-source-colors-red-200)');
    expect(first.css).toMatch(/--mc-source-colors-red-200:\s*oklch\(/);

    const second = await generate('<div class="mc-btn_red c-mc-btn"></div>');
    expect(second.css).toContain('--mc-colors-btn-DEFAULT:');
    expect(second.css).not.toContain('--mc-colors-btn-200:');
  });
});

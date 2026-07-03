import {
  extractBodyColor,
  getMcThemeMetaColors,
  isInvalidColor,
  resolveBodyColor,
  resolveColorParts,
  resolveSpecialColor,
  resolveThemeDepth,
  roundNum,
  toNum,
  toOklch,
} from '@unocss-preset-magicolor/utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMagicColorStyle, updateMagicColor } from '../helper';
import { generate } from './helpers';

describe('runtime updateMagicColor helper', () => {
  it('returns early when no dom is provided', () => {
    expect(() => updateMagicColor({ name: 'primary', color: '#9c1d1e' })).not.toThrow();
  });

  it('writes only CSS variables already defined on the target element', () => {
    const dom = document.createElement('div');
    dom.style.setProperty('--mc-colors-primary-DEFAULT', 'red');
    dom.style.setProperty('--mc-colors-primary-457', 'red');

    updateMagicColor({ name: 'primary', color: '#9c1d1e-457', dom });

    expect(dom.style.getPropertyValue('--mc-colors-primary-DEFAULT')).toContain('oklch(');
    expect(dom.style.getPropertyValue('--mc-colors-primary-457')).toContain('oklch(');
    expect(dom.style.getPropertyValue('--mc-colors-primary-50')).toBe('');
    expect(dom.style.cssText).not.toContain('-l:');
  });

  it('writes arbitrary depth variables defined on the target element', () => {
    const dom = document.createElement('div');
    dom.style.setProperty('--mc-colors-primary-457', 'red');

    updateMagicColor({ name: 'primary', color: '#9c1d1e', dom });

    expect(dom.style.getPropertyValue('--mc-colors-primary-457')).toContain('oklch(');
    expect(dom.style.getPropertyValue('--mc-colors-primary-DEFAULT')).toBe('');
  });

  it('writes multiple arbitrary depth variables defined on the target element', () => {
    const dom = document.createElement('div');
    dom.style.setProperty('--mc-colors-primary-630', 'red');
    dom.style.setProperty('--mc-colors-primary-230', 'red');

    updateMagicColor({ name: 'primary', color: '#9c1d1e', dom });

    expect(dom.style.getPropertyValue('--mc-colors-primary-630')).toContain('oklch(');
    expect(dom.style.getPropertyValue('--mc-colors-primary-230')).toContain('oklch(');
  });

  it('reads variable definitions from computed styles', () => {
    const style = document.createElement('style');
    const dom = document.createElement('div');
    style.textContent = '.magic-color-scope { --mc-colors-primary-DEFAULT: red; --mc-colors-primary-457: red; }';
    dom.className = 'magic-color-scope';
    document.head.append(style);
    document.body.append(dom);

    try {
      updateMagicColor({ name: 'primary', color: '#9c1d1e', dom });

      expect(dom.style.getPropertyValue('--mc-colors-primary-DEFAULT')).toContain('oklch(');
      expect(dom.style.getPropertyValue('--mc-colors-primary-457')).toContain('oklch(');
    }
    finally {
      dom.remove();
      style.remove();
    }
  });

  it('writes lightness-reversed arbitrary depth variables at runtime', () => {
    const dom = document.createElement('div');
    dom.style.setProperty('--mc-colors-primary-50', 'red');
    dom.style.setProperty('--mc-colors-primary-450', 'red');
    dom.style.setProperty('--mc-colors-primary-500', 'red');
    const reference = getMagicColorStyle({
      name: 'expected',
      color: '#9c1d1e',
      hasBase: false,
      depths: new Set(['950', '550', '500']),
    });

    updateMagicColor({ name: 'primary', color: '#9c1d1e', lightnessReverse: true, dom });

    expect(dom.style.getPropertyValue('--mc-colors-primary-50')).toBe(reference['--mc-colors-expected-950']);
    expect(dom.style.getPropertyValue('--mc-colors-primary-450')).toBe(reference['--mc-colors-expected-550']);
    expect(dom.style.getPropertyValue('--mc-colors-primary-500')).toBe(reference['--mc-colors-expected-500']);
  });

  it('writes special colors and ignores invalid updates', () => {
    const dom = document.createElement('div');
    dom.style.setProperty('--mc-colors-primary-DEFAULT', 'red');
    dom.style.setProperty('--mc-colors-primary-630', 'red');

    updateMagicColor({ name: 'primary', color: 'transparent', dom });
    expect(dom.style.getPropertyValue('--mc-colors-primary-DEFAULT')).toBe('transparent');
    expect(dom.style.getPropertyValue('--mc-colors-primary-630')).toBe('transparent');

    updateMagicColor({ name: 'primary', color: '123', dom });
    expect(dom.style.getPropertyValue('--mc-colors-primary-DEFAULT')).toBe('transparent');
  });

  it('does not set variables when the update color is falsy', () => {
    const dom = document.createElement('div');

    updateMagicColor({ name: 'primary', color: '', dom });

    expect(dom.style.length).toBe(0);
  });

  it('updates only the requested color name and does not infer usage from child classes', () => {
    const dom = document.createElement('div');
    dom.style.setProperty('--mc-colors-primary-457', 'red');
    dom.style.setProperty('--mc-colors-secondary-630', 'red');
    dom.innerHTML = '<button class="bg-mc-primary-950"></button>';

    updateMagicColor({ name: 'primary', color: '#9c1d1e', dom });

    expect(dom.style.getPropertyValue('--mc-colors-primary-457')).toContain('oklch(');
    expect(dom.style.getPropertyValue('--mc-colors-secondary-630')).toBe('red');
    expect(dom.style.getPropertyValue('--mc-colors-primary-950')).toBe('');
  });

  it('does not emit undefined or NaN when a theme depth is missing', () => {
    const dom = document.createElement('div');
    dom.style.setProperty('--mc-colors-primary-457', 'red');

    expect(() => updateMagicColor({ name: 'primary', color: '#9c1d1e', dom })).not.toThrow();

    const value = dom.style.getPropertyValue('--mc-colors-primary-457');
    expect(value).not.toContain('undefined');
    expect(value).not.toContain('NaN');
  });
});

describe('getMagicColorStyle helper', () => {
  it('skips missing or invalid depth values instead of emitting undefined colors', () => {
    const css = getMagicColorStyle({
      name: 'primary',
      color: '#9c1d1e',
      hasBase: true,
      depths: new Set(['457', 'non-existent-depth']),
    });

    for (const value of Object.values(css)) {
      expect(value).not.toContain('undefined');
      expect(value).not.toContain('NaN');
    }
  });

  it('interpolates lower and upper boundary depth segments', () => {
    const lower = getMagicColorStyle({
      name: 'primary',
      color: '#9c1d1e',
      hasBase: false,
      depths: new Set(['75']),
    });
    const upper = getMagicColorStyle({
      name: 'primary',
      color: '#9c1d1e',
      hasBase: false,
      depths: new Set(['925']),
    });

    expect(String(lower['--mc-colors-primary-75'] ?? '')).toMatch(/^oklch\(/);
    expect(String(lower['--mc-colors-primary-75'] ?? '')).not.toBe('oklch(0 0 0)');
    expect(String(upper['--mc-colors-primary-925'] ?? '')).toMatch(/^oklch\(/);
    expect(String(upper['--mc-colors-primary-925'] ?? '')).not.toBe('oklch(0 0 0)');
  });

  it('returns an empty object for invalid base colors', () => {
    expect(getMagicColorStyle({
      name: 'test',
      color: 'invalid-color-with-no-123',
      hasBase: true,
      depths: new Set(),
    })).toEqual({});
  });
});

describe('color parsing utilities', () => {
  it('parses bracket arbitrary colors with optional depth suffixes', () => {
    expect(resolveColorParts('[#1313aa]1200')).toEqual({ originColor: '[#1313aa]', originDepth: '1200' });
    expect(resolveColorParts('[rgb(12,22,33)]')).toEqual({ originColor: '[rgb(12,22,33)]', originDepth: undefined });
    expect(resolveColorParts('[hsl(210_60%_40%)]-300')).toEqual({ originColor: '[hsl(210_60%_40%)]', originDepth: '300' });
    expect(resolveColorParts('[lab(60_20_10)]-350')).toEqual({ originColor: '[lab(60_20_10)]', originDepth: '350' });
    expect(resolveColorParts('[lch(40_20_21.57)]-400')).toEqual({ originColor: '[lch(40_20_21.57)]', originDepth: '400' });
    expect(resolveColorParts('[oklch(40.1%_0.123_21.57)]-200')).toEqual({ originColor: '[oklch(40.1%_0.123_21.57)]', originDepth: '200' });
  });

  it('resolves hyphenated and compact depth names', () => {
    expect(resolveColorParts('rose-445')).toEqual({ originColor: 'rose', originDepth: '445' });
    expect(resolveColorParts('grape120')).toEqual({ originColor: 'grape', originDepth: '120' });
    expect(resolveColorParts('rose')).toEqual({ originColor: 'rose', originDepth: undefined });
    expect(resolveColorParts(undefined)).toEqual({ originColor: undefined, originDepth: undefined });
  });

  it('strips opacity and modifiers outside bracket arbitrary colors', () => {
    expect(extractBodyColor('[oklch(20.1%_0.1_20/50)]-200/40:dark')).toBe('[oklch(20.1%_0.1_20/50)]-200');
    expect(extractBodyColor('[rgb(12,22,33)]:dark')).toBe('[rgb(12,22,33)]');
    expect(resolveBodyColor('rose-445/40:dark')).toEqual({ originColor: 'rose', originDepth: '445' });
    expect(resolveBodyColor('grape120')).toEqual({ originColor: 'grape', originDepth: '120' });
    expect(resolveBodyColor('[oklch(20.1%_0.1_20/50)]-200/40:dark')).toEqual({ originColor: '[oklch(20.1%_0.1_20/50)]', originDepth: '200' });
  });

  it('normalizes special color keywords and handles empty token bodies', () => {
    expect(resolveSpecialColor('transparent')).toBe('transparent');
    expect(resolveSpecialColor('current')).toBe('currentColor');
    expect(resolveSpecialColor('currentColor')).toBe('currentColor');
    expect(resolveSpecialColor('inherit')).toBe('inherit');
    expect(resolveSpecialColor('rose')).toBeUndefined();
    expect(resolveBodyColor()).toEqual({ originColor: '', originDepth: undefined });
  });
});

describe('color transform utilities', () => {
  it('keeps invalid color predicates quiet and deterministic', () => {
    expect(isInvalidColor('')).toBe(true);
    expect(isInvalidColor(undefined)).toBe(true);
    expect(isInvalidColor('123')).toBe(true);
    expect(isInvalidColor('rose')).toBe(false);
    expect(isInvalidColor('#9c1d1e')).toBe(false);
  });

  it('does not log from isInvalidColor or invalid CSS generation', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    isInvalidColor('123');
    isInvalidColor(undefined);
    await generate('<div class="c-mc-123 c-mc-456 c-mc-789"></div>');

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('normalizes oklch, numeric and lightness depth transforms', () => {
    const result = toOklch({
      type: 'oklch',
      components: ['0.5 0.2 200'],
      alpha: 1,
    });

    expect(toOklch(undefined)).toBeUndefined();
    expect(result?.components).toHaveLength(3);
    expect(toOklch({ type: 'oklch', components: ['0.5'], alpha: 1 })).toBeUndefined();
    expect(toNum(undefined)).toBe(0);
    expect(toNum('123')).toBe(123);
    expect(toNum(456)).toBe(456);
    expect(roundNum(0.1234)).toBe(0.123);
    expect(roundNum(0.1235)).toBe(0.124);
    expect(resolveThemeDepth({ depth: '50', lightnessReverse: true })).toBe(950);
    expect(resolveThemeDepth({ depth: '450', lightnessReverse: true })).toBe(550);
    expect(resolveThemeDepth({ depth: '457', lightnessReverse: true })).toBe(543);
    expect(resolveThemeDepth({ depth: '500', lightnessReverse: true })).toBe(500);
    expect(resolveThemeDepth({ depth: '1200', lightnessReverse: true })).toBe(-200);
    expect(resolveThemeDepth({ depth: 'not-a-depth', lightnessReverse: true })).toBeUndefined();
    expect(resolveThemeDepth({ depth: undefined, defaultValue: 'DEFAULT' })).toBe('DEFAULT');
    expect(resolveThemeDepth({ depth: 'not-a-depth', defaultValue: 'DEFAULT', lightnessReverse: true })).toBe('DEFAULT');
  });

  it('returns empty theme maps for invalid source colors', () => {
    expect(getMcThemeMetaColors('')).toEqual({});
    expect(getMcThemeMetaColors('invalid-color')).toEqual({});
    expect(getMcThemeMetaColors(undefined)).toEqual({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});

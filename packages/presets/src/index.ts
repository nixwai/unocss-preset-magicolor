import type { Theme } from '@unocss/preset-mini';
import type { PresetOptions } from './types';
import { definePreset } from 'unocss';

export const presetCreateNxy = definePreset<PresetOptions, Theme>((_options) => {
  return { name: 'unocss-preset-magicolor' };
});

export * from './types';

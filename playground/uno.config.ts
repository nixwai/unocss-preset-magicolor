import { defineConfig, presetMini } from 'unocss';
import { presetMagicolor } from '../packages/presets/src';

export default defineConfig({ presets: [presetMini(), presetMagicolor()] });

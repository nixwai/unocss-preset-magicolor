import { defineConfig, presetWind4 } from 'unocss';
import { presetMagicolor } from '../packages/presets/src';

export default defineConfig({
  presets: [
    presetWind4({ preflights: { reset: true } }),
    presetMagicolor({ colors: { primary: 'rose' } }),
  ],
});

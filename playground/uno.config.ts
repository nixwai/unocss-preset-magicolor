import { defineConfig, presetWind4 } from 'unocss';
import { presetMagicolor } from '../packages/presets/src';

export default defineConfig({
  presets: [
    presetWind4({ preflights: { reset: true } }),
    presetMagicolor({ colors: { primary: 'rose' } }),
  ],
  theme: {
    colors: {
      grape: '#679512',
      wine: { red: '#9c1d1e' },
    },
  },
});

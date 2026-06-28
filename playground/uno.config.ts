import { defineConfig, presetWind4 } from 'unocss';
import { presetMagicolor } from 'unocss-preset-magicolor';

export default defineConfig({
  presets: [
    presetWind4(),
    presetMagicolor({ colors: { primary: 'rose' } }),
  ],
  theme: {
    colors: {
      grape: '#679512',
      wine: { red: '#9c1d1e' },
    },
  },
});

import { defineConfig, presetWind4 } from 'unocss';
import { presetMagicolor } from 'unocss-preset-magicolor';

export default defineConfig({
  presets: [
    presetWind4({ dark: 'class' }),
    presetMagicolor({
      colors: {
        primary: 'rose',
        brand: '#4f7bff',
        live: '#4f7bff',
        surface: '#f8fafc',
      },
      dark: {
        primary: 'blue',
        brand: '#8ab4ff',
        live: '#ff8a4f',
        surface: '#111827',
      },
    }),
  ],
  theme: {
    colors: {
      grape: '#679512',
      mint: '#12b981',
      wine: { red: '#9c1d1e' },
    },
  },
});

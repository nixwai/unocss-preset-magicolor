import { defineConfig, presetAttributify, presetWind4 } from 'unocss';
import { presetMagicolor } from 'unocss-preset-magicolor';

export default defineConfig({
  presets: [
    presetWind4({ dark: 'class' }),
    presetAttributify(),
    presetMagicolor({
      colors: {
        primary: 'rose',
        brand: '#4f7bff',
        live: '#8ab4ff',
        surface: '#f8fafc',
      },
      dark: {
        primary: 'blue',
        live: { color: '#ff8a4f', lightnessReverse: true },
        surface: '#111827',
      },
    }),
  ],
  transformers: [

  ],
  theme: {
    colors: {
      grape: '#679512',
      mint: '#12b981',
      wine: { red: '#9c1d1e' },
    },
  },
  shortcuts: [
    ['btn', 'p-5 bg-mc-primary-333 text-white cursor-pointer hover:mc-lr-primary_primary'],
  ],
});

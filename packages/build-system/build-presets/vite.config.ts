import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { dtsPlugin } from '../vite-configs';
import { presetOutput, presetRoot } from './paths';

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: {
        index: resolve(presetRoot, 'src/index.ts'),
        helper: resolve(presetRoot, 'src/helper.ts'),
      },
    },
    rollupOptions: {
      external: ['unocss', '@unocss/preset-mini'],
      output: [{
        format: 'es',
        entryFileNames: '[name].js',
        exports: 'named',
        dir: presetOutput,
      }],
    },
  },
  plugins: [
    dtsPlugin(resolve(presetRoot, 'src'), presetOutput),
  ],
});

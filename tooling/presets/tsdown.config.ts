import { resolve } from 'node:path';
import { defineConfig } from 'tsdown';
import { presetOutput, presetRoot, projRoot } from './paths.ts';

const sharedConfig = {
  cwd: presetRoot,
  entry: {
    index: 'src/index.ts',
    helper: 'src/helper.ts',
  },
  clean: false,
  platform: 'neutral' as const,
  deps: { neverBundle: ['unocss', /@unocss\/.*/, 'magic-color'] },
  outputOptions: { exports: 'named' as const },
};

export default defineConfig([
  {
    ...sharedConfig,
    format: 'esm',
    dts: false,
    outDir: presetOutput,
    outExtensions: () => ({ js: '.js' }),
  },
  {
    ...sharedConfig,
    entry: ['src/**/*.ts', '!src/**/*.test.ts'],
    format: 'esm',
    root: resolve(presetRoot, 'src'),
    sourcemap: false,
    outDir: resolve(presetOutput, 'types'),
    dts: {
      emitDtsOnly: true,
      tsconfig: resolve(projRoot, 'tsconfig.json'),
      eager: true,
    },
  },
]);

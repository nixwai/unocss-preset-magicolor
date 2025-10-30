import { resolve } from 'node:path';
import { pkgRoot } from '../build-paths';

/** 预设库代码根目录 */
export const presetRoot = resolve(pkgRoot, 'presets');

/** 预设库打包目录 */
export const presetOutput = resolve(presetRoot, 'dist');

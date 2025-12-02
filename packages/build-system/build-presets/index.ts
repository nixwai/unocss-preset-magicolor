import { series } from 'gulp';
import { version } from '../../presets/package.json';
import { delPath, publishTask, releaseTask, run } from '../tasks';
import { presetOutput, presetRoot } from './paths';

export const release = series(
  () => releaseTask('preset', presetRoot),
);

export const build = series(
  () => delPath(presetOutput),
  () => run('vite build'),
);

export const publish = series(
  () => publishTask(version, presetRoot),
);

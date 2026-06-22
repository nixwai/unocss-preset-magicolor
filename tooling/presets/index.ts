import { series } from 'gulp';
import { version } from '../../packages/presets/package.json';
import { delPath, publishTask, releaseTask, runBuildCommand, runBuildSteps } from '../common/tasks';
import { presetOutput, presetRoot } from './paths';

export const release = series(
  () => releaseTask('preset', presetRoot),
);

export function build() {
  return runBuildSteps('preset build', [
    { name: 'clean dist', run: () => delPath(presetOutput) },
    { name: 'bundle with tsdown', run: () => runBuildCommand('tsdown --config tsdown.config.ts') },
  ]);
}

export const publish = series(
  () => publishTask(version, presetRoot),
);

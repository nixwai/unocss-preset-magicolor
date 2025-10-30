import { series } from 'gulp';
import { version } from '../../presets/package.json';
import { REGISTRY } from '../build-config';
import { run, versionTag } from '../tasks';
import { presetRoot } from './paths';

export default series(
  () => run(`pnpm publish --registry ${REGISTRY} ${versionTag(version)}`, presetRoot),
);

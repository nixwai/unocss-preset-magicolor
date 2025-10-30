import { series } from 'gulp';
import { delPath, run } from '../tasks';
import { presetOutput } from './paths';

export default series(
  () => delPath(presetOutput),
  () => run('vite build'),
);

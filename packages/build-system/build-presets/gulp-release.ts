import { series } from 'gulp';
import { run } from '../tasks';
import { presetRoot } from './paths';

export default series(
  () => run('bumpp --commit "chore(preset): release v%s" --tag "v%s(preset)"', presetRoot),
);

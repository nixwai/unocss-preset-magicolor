import type { CustomRule } from '../typing';
import { color } from './color';

export const rules: CustomRule[] = [
  color,
].flat();

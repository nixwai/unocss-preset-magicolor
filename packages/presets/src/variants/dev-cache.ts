import type { Theme } from '@unocss/preset-wind4';
import type { VariantObject } from 'unocss';
import { MC_DEV_CACHE_TOKEN_NAME, stripDevCacheToken } from '../utils/dev-cache-token';

export const devCacheTokenModifier: VariantObject<Theme> = {
  name: 'mc-dev-cache-token',
  order: 1, // must run before presetAttributify modifiers
  match(input: string) {
    if (!input.includes(MC_DEV_CACHE_TOKEN_NAME)) {
      return;
    }

    return {
      matcher: stripDevCacheToken(input),
      selector: stripDevCacheToken,
    };
  },
};

import type { Theme } from '@unocss/preset-wind4';
import type { VariantObject } from 'unocss';
import { MC_DEV_CACHE_TOKEN_NAME, MC_DEV_CACHE_TOKEN_PATTERN, stripDevCacheToken } from '../utils/dev-cache-token';

const DEV_CACHE_TOKEN_SUFFIX_RE = new RegExp(`\\\\?:${MC_DEV_CACHE_TOKEN_PATTERN}$`);

export const devCacheTokenModifier: VariantObject<Theme> = {
  name: 'mc-dev-cache-token',
  order: 1,
  match(input: string) {
    if (!input.includes(MC_DEV_CACHE_TOKEN_NAME)) {
      return;
    }

    const matcher = input.replace(DEV_CACHE_TOKEN_SUFFIX_RE, '');
    return {
      matcher,
      selector: stripDevCacheToken,
    };
  },
};

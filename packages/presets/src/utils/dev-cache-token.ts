import type { CSSObject, RuleContext } from 'unocss';
import type { PresetMcOptions } from '../types';
import { toEscapedSelector } from '@unocss/core';
import { hasUnderline, normalizeMagicColorToken } from './resolve-token';

export const MC_DEV_CACHE_TOKEN_NAME = 'mc-dev';
export const MC_DEV_CACHE_TOKEN_PREFIX = `:${MC_DEV_CACHE_TOKEN_NAME}-`;
export const MC_DEV_CACHE_TOKEN_PATTERN = `${MC_DEV_CACHE_TOKEN_NAME}-[\\w-]+`;

const DEV_CACHE_TOKEN_RE = new RegExp(`\\\\?:${MC_DEV_CACHE_TOKEN_PATTERN}`, 'g');

/** Adds a versioned dev token to magic-color definitions so UnoCSS reparses them in watch mode. */
export function applyDevCacheTokenToExtracted(extracted: Set<string>, version: string) {
  // Mutate the shared Set in place so later UnoCSS additions, such as safelist
  // tokens, remain visible to the usage cache through the same Set reference.
  for (const oToken of Array.from(extracted)) {
    // only scan magic-color tokens
    if (!oToken.includes('mc') || oToken.endsWith('=')) {
      continue;
    }
    const nToken = stripDevCacheToken(oToken);
    // Attributify selector tokens are parsed into a list of tokens.
    const rawToken = normalizeMagicColorToken(nToken);
    if (rawToken.includes('mc-lr') || hasUnderline(rawToken)) {
      // delete old token
      extracted.delete(oToken);
      // add new token
      extracted.add(`${nToken}${MC_DEV_CACHE_TOKEN_PREFIX}${version}`);
    }
  }
}

/** Removes the internal dev cache token from raw tokens or escaped selectors. */
export function stripDevCacheToken(value: string) {
  // Handles both raw tokens and escaped selectors, e.g. ":mc-dev-1" and "\:mc-dev-1".
  return value.replace(DEV_CACHE_TOKEN_RE, '');
}

/** Redirects generated dev-token selectors back to the user-facing selector. */
export function createDevCacheTokenSelectorRedirect<Theme extends object>(
  ctx: RuleContext<Theme>,
  options?: Pick<PresetMcOptions, 'devCacheToken'>,
): CSSObject {
  // Both checks are intentional: the redirect is only useful for dev reparsing,
  // and the explicit option keeps it disabled by default because UnoCSS Vite
  // can report `envMode: "dev"` on the shared generator during builds.
  if (ctx.generator.config.envMode !== 'dev' || !options?.devCacheToken) {
    return {};
  }
  if (!ctx.rawSelector.includes(MC_DEV_CACHE_TOKEN_PREFIX)) {
    return {};
  }

  // The suffix is only an internal cache key; generated CSS selectors stay user-facing.
  const selector = stripDevCacheToken(ctx.rawSelector);
  return { [ctx.symbols.selector]: () => toEscapedSelector(selector) };
}

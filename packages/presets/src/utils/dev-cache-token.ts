import type { CSSObject, RuleContext } from 'unocss';
import type { PresetMcOptions } from '../types';

export const MC_DEV_CACHE_TOKEN_NAME = 'mc-dev';
export const MC_DEV_CACHE_TOKEN_PREFIX = `:${MC_DEV_CACHE_TOKEN_NAME}-`;
export const MC_DEV_CACHE_TOKEN_PATTERN = `${MC_DEV_CACHE_TOKEN_NAME}-[\\w-]+`;

const DEV_CACHE_TOKEN_RE = new RegExp(`\\\\?:${MC_DEV_CACHE_TOKEN_PATTERN}`, 'g');

function collectMcDefinitionTokens(tokens: Iterable<string>) {
  const definitions = new Set<string>();

  for (const token of tokens) {
    const rawToken = stripDevCacheToken(token);
    const parts = rawToken.split(':');
    if (parts.some(part => part.startsWith('mc-'))) {
      definitions.add(rawToken);
    }
  }

  return definitions;
}

/** Adds a versioned dev token to magic-color definitions so UnoCSS reparses them in watch mode. */
export function applyDevCacheTokenToExtracted(
  extracted: Set<string>,
  version: string,
) {
  // Mutate the shared Set in place so later UnoCSS additions, such as safelist
  // tokens, remain visible to the usage cache through the same Set reference.
  const mcDefinitionTokens = collectMcDefinitionTokens(extracted);
  for (const token of mcDefinitionTokens) {
    const rawToken = stripDevCacheToken(token);
    if (!extracted.delete(rawToken) && !extracted.delete(token)) {
      continue;
    }
    extracted.add(`${rawToken}${MC_DEV_CACHE_TOKEN_PREFIX}${version}`);
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
  return { [ctx.symbols.selector]: stripDevCacheToken };
}

import { hasUnderline, normalizeMagicColorToken } from './magic-color-token';

export const MC_DEV_CACHE_TOKEN_NAME = 'mc-dev';
export const MC_DEV_CACHE_TOKEN_PREFIX = `:${MC_DEV_CACHE_TOKEN_NAME}-`;
export const MC_DEV_CACHE_TOKEN_PATTERN = `${MC_DEV_CACHE_TOKEN_NAME}-[\\w-]+`;

const DEV_CACHE_TOKEN_RE = new RegExp(`\\\\?:${MC_DEV_CACHE_TOKEN_PATTERN}`, 'g');

/** Adds a versioned dev token to magic-color definitions so UnoCSS reparses them in watch mode. */
export function applyDevCacheTokenToExtracted(extracted: Set<string>, version: string) {
  // Mutate the shared Set in place so later UnoCSS additions, such as safelist
  // tokens, remain visible to the usage cache through the same Set reference.
  const definitions = new Set<string>();

  for (const token of extracted) {
    let dToken = token;
    // only scan magic-color tokens
    if (!dToken.includes('mc')) {
      continue;
    }
    dToken = stripDevCacheToken(dToken);
    // Attributify selector tokens are parsed into a list of tokens.
    const rawToken = normalizeMagicColorToken(dToken);
    if (rawToken.includes('mc-lr') || hasUnderline(rawToken)) {
      definitions.add(dToken);
      // delete old token
      extracted.delete(token);
    }
  }

  // Add new tokens
  for (const token of definitions) {
    extracted.add(`${token}${MC_DEV_CACHE_TOKEN_PREFIX}${version}`);
  }
}

/** Removes the internal dev cache token from raw tokens or escaped selectors. */
export function stripDevCacheToken(value: string) {
  // Handles both raw tokens and escaped selectors, e.g. ":mc-dev-1" and "\:mc-dev-1".
  return value.replace(DEV_CACHE_TOKEN_RE, '');
}

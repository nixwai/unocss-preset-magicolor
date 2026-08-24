// The style rule of "mc-*" is dynamic
// It is necessary to invalidate the cache at the appropriate time to avoid the style being unable to be updated
export interface TokenCacheGenerator {
  invalidateToken: (token: string) => void
}

export class TokenCacheStore {
  private readonly generators = new Set<TokenCacheGenerator>();
  private readonly dependentTokens = new Set<string>();

  /** Registers a UnoCSS generator whose usage-dependent entries should be refreshed after scans change. */
  registerGenerator(generator: TokenCacheGenerator) {
    this.generators.add(generator);
  }

  /** Records a raw UnoCSS token whose cached output depends on scanned magic-color usage. */
  recordToken(token: string | undefined) {
    if (token) {
      this.dependentTokens.add(token);
    }
  }

  /** Invalidates cached rules whose output depends on scanned magic-color usage. */
  invalidate() {
    for (const generator of this.generators) {
      for (const token of this.dependentTokens) {
        generator.invalidateToken(token);
      }
    }
  }
}

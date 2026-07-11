export class TokenCacheStore {
  private readonly generatorCaches = new Set<Map<string, unknown>>();
  private readonly dependentTokens = new Set<string>();

  /** Registers a UnoCSS generator cache whose usage-dependent entries should be refreshed after scans change. */
  registerCache(cache: Map<string, unknown>) {
    this.generatorCaches.add(cache);
  }

  /** Records a raw UnoCSS token whose cached output depends on scanned magic-color usage. */
  recordToken(token: string | undefined) {
    if (token) {
      this.dependentTokens.add(token);
    }
  }

  /** Drops cached rules whose output depends on scanned magic-color usage. */
  invalidate() {
    for (const cache of this.generatorCaches) {
      for (const token of this.dependentTokens) {
        cache.delete(token);
      }
    }
  }
}

/** Tracks which scanned input ids contained each raw token. */
export class TokenUsage {
  private readonly tokenToIds = new Map<string, Set<string>>();

  /** Removes one input id from every token it previously contributed. */
  remove(id: string, tokens: Iterable<string>) {
    for (const token of tokens) {
      const ids = this.tokenToIds.get(token);
      if (!ids) {
        continue;
      }

      ids.delete(id);
      if (!ids.size) {
        this.tokenToIds.delete(token);
      }
    }
  }

  /** Adds one input id to the index for each token in the latest scan. */
  add(id: string, tokens: Iterable<string>) {
    for (const token of tokens) {
      const ids = this.tokenToIds.get(token) ?? new Set<string>();
      ids.add(id);
      this.tokenToIds.set(token, ids);
    }
  }

  /** Returns the input ids that currently contain the given token. */
  getIds(token: string) {
    return this.tokenToIds.get(token);
  }
}

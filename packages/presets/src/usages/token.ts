export class TokenUsage {
  private readonly tokenToIds = new Map<string, Set<string>>();

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

  add(id: string, tokens: Iterable<string>) {
    for (const token of tokens) {
      const ids = this.tokenToIds.get(token) ?? new Set<string>();
      ids.add(id);
      this.tokenToIds.set(token, ids);
    }
  }

  getIds(token: string) {
    return this.tokenToIds.get(token);
  }
}

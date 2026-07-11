import type { RuleContext, Shortcut } from 'unocss';
import { scanUsage } from './scanner';

function splitTopLevelTokens(body: string) {
  const tokens: string[] = [];
  let current = '';
  let bracketDepth = 0;
  let parenDepth = 0;
  let escaped = false;

  for (const char of body) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === '\\') {
      current += char;
      escaped = true;
      continue;
    }

    if (char === '[') {
      bracketDepth++;
    }
    else if (char === ']') {
      bracketDepth = Math.max(bracketDepth - 1, 0);
    }
    else if (char === '(' && bracketDepth === 0) {
      parenDepth++;
    }
    else if (char === ')' && bracketDepth === 0) {
      parenDepth = Math.max(parenDepth - 1, 0);
    }

    if (/\s/.test(char) && bracketDepth === 0 && parenDepth === 0) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }
    current += char;
  }

  if (current) {
    tokens.push(current);
  }
  return tokens;
}

function expandVariantGroup(token: string): string[] {
  const openIndex = token.indexOf(':(');
  const closeIndex = token.lastIndexOf(')');
  if (openIndex < 0 || closeIndex < openIndex + 2) {
    return [token];
  }

  const prefix = token.slice(0, openIndex + 1);
  if (!prefix || /[\s()[\]]/.test(prefix)) {
    return [token];
  }
  const inner = token.slice(openIndex + 2, closeIndex);
  const suffix = token.slice(closeIndex + 1);

  return splitShortcutBody(inner).map(item => `${prefix}${item}${suffix}`);
}

function splitShortcutBody(body: string) {
  return splitTopLevelTokens(body).flatMap(expandVariantGroup);
}

function getShortcutTokens(value: unknown) {
  if (typeof value === 'string') {
    return splitShortcutBody(value);
  }
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap(item => typeof item === 'string' ? splitShortcutBody(item) : []);
}

function collectStaticShortcut(matcher: string, value: unknown) {
  return {
    rawSelector: matcher,
    depths: scanUsage(new Set(getShortcutTokens(value))),
  };
}

function collectDynamicShortcut<Theme extends object>(
  matcher: RegExp,
  resolver: unknown,
  tokens: Iterable<string>,
  context?: RuleContext<Theme>,
) {
  if (typeof resolver !== 'function' || !context) {
    return [];
  }

  const usages = [];
  for (const token of tokens) {
    const match = token.match(matcher);
    if (!match) {
      continue;
    }

    let resolved: unknown;
    try {
      resolved = resolver(match, {
        ...context,
        rawSelector: token,
        currentSelector: token,
      });
    }
    catch {
      continue;
    }

    usages.push({
      rawSelector: token,
      depths: scanUsage(new Set(getShortcutTokens(resolved))),
    });
  }
  return usages;
}

/** Extracts magic-color usage from string shortcuts that can be resolved synchronously. */
export function collectShortcuts<Theme extends object = object>(
  shortcuts: Iterable<Shortcut<Theme>> = [],
  tokens: Iterable<string> = [],
  context?: RuleContext<Theme>,
) {
  const usages = [];

  for (const shortcut of shortcuts) {
    if (!Array.isArray(shortcut)) {
      continue;
    }

    const [matcher, body] = shortcut;
    if (typeof matcher === 'string') {
      usages.push(collectStaticShortcut(matcher, body));
      continue;
    }

    if (!(matcher instanceof RegExp)) {
      continue;
    }

    usages.push(...collectDynamicShortcut(matcher, body, tokens, context));
  }

  return usages;
}

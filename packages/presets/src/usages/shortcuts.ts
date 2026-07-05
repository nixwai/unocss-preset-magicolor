import type { RuleContext, Shortcut } from 'unocss';
import { scanUsage } from './scanner';

function splitShortcutBody(body: string) {
  return body.split(/\s+/).filter(Boolean);
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
    depths: scanUsage(new Set(getShortcutTokens(value))).colors,
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
      depths: scanUsage(new Set(getShortcutTokens(resolved))).colors,
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

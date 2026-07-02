import type { Shortcut } from 'unocss';
import { scanUsage } from './scanner';

function splitShortcutBody(body: string) {
  return body.split(/\s+/).filter(Boolean);
}

export function collectShortcuts<Theme extends object = object>(shortcuts: Iterable<Shortcut<Theme>> = []) {
  const usages = [];

  for (const shortcut of shortcuts) {
    if (!Array.isArray(shortcut)) {
      continue;
    }

    const [matcher, body] = shortcut;
    if (typeof matcher !== 'string' || typeof body !== 'string') {
      continue;
    }

    usages.push({
      rawSelector: matcher,
      depths: scanUsage(new Set(splitShortcutBody(body))).colors,
    });
  }

  return usages;
}

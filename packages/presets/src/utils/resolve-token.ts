import { isAttributifySelector } from '@unocss/core';

function normalizeSelector(str?: string) {
  const list = str?.replace('!', '').split(':') || [];
  const index = list.findIndex(i => i.includes('mc'));
  // If there is a magic-color token, only scan from this token; otherwise use the last token.
  return index >= 0 ? list.slice(index).join(':') : list[list.length - 1];
}

// “presetAttributify” compatibility
function normalizeAttributifySelector(match: RegExpMatchArray) {
  const name = normalizeSelector(match[1]);
  const content = normalizeSelector(match[2]);
  if (!content || content === '~' || content === 'true') {
    return name;
  }
  return [name, content].filter(Boolean).join('-');
}

export function normalizeMagicColorToken(token: string) {
  const selectorMatch = isAttributifySelector(token);
  return selectorMatch ? normalizeAttributifySelector(selectorMatch) : token;
}

/**
 * Check if the token contains an underline. Like "primary_red-100"
 * @param body The string to check.
 * @returns `true` if the string contains an underline.
 */
export function hasUnderline(body: string) {
  let bracketDepth = 0;
  let parenDepth = 0;
  let escaped = false;
  for (const char of body) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
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
    if (char === '_' && bracketDepth === 0 && parenDepth === 0) {
      return true;
    }
  }
  return false;
}

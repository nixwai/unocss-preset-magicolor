import type { CSSValue } from 'unocss';

export function updateDomStyle(style: CSSValue, dom?: HTMLElement) {
  if (dom) {
    Object.entries(style).forEach(([key, value]) => {
      dom.style.setProperty(key, value);
    });
  }
}

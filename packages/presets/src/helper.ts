import type { CSSObject } from 'unocss';
import { getMcThemeMetaColors, getThemeDepthColor, isInvalidColor, resolveColorParts } from '@unocss-preset-magicolor/utils';
import { mc } from 'magic-color';

interface ColorVariableUsage {
  hasBase: boolean
  depths: Set<string>
}

interface MagicColorStyleParams extends ColorVariableUsage {
  name: string
  color: string
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function collectStyleVariables(name: string, style: CSSStyleDeclaration, usage: ColorVariableUsage) {
  const colorVariableRE = new RegExp(`^--mc-${escapeRegExp(name)}(?:-(\\d+))?-color$`);

  for (let i = 0; i < style.length; i++) {
    const variable = style.item(i);
    const match = variable.match(colorVariableRE);
    if (!match) {
      continue;
    }

    const [, depth] = match;
    if (depth) {
      usage.depths.add(depth);
    }
    else {
      usage.hasBase = true;
    }
  }
}

function collectDefinedColorVariables(name: string, dom: HTMLElement): ColorVariableUsage {
  const usage: ColorVariableUsage = {
    hasBase: false,
    depths: new Set(),
  };
  const window = dom.ownerDocument.defaultView;

  collectStyleVariables(name, dom.style, usage);

  if (window) {
    collectStyleVariables(name, window.getComputedStyle(dom), usage);
  }

  return usage;
}

function generateColorVariable(name: string, color: string, depth?: string | number) {
  const suffix = depth == null ? '' : `-${depth}`;
  return { [`--mc-${name}${suffix}-color`]: color };
}

/**
 * Generate CSS color variables for a magic color.
 * @param params params Parameter object
 * @param params.name Color name
 * @param params.color Color value, supports a color depth suffix like `#9c1d1e-457`
 * @param params.hasBase Whether to generate the base color variable
 * @param params.depths Color depths that need depth-specific variables
 * @returns CSS variables for the requested magic color usage
 */
export function getMagicColorStyle(params: MagicColorStyleParams): CSSObject {
  const { name, color, hasBase, depths } = params;
  const { originColor, bodyNo } = resolveColorParts(color);
  if (isInvalidColor(originColor)) {
    return {};
  }

  const themeMetaColors = getMcThemeMetaColors(originColor);

  const css: CSSObject = {};

  if (hasBase) {
    if (bodyNo) {
      const baseColor = getThemeDepthColor(themeMetaColors, bodyNo);
      baseColor && Object.assign(css, generateColorVariable(name, baseColor));
    }
    else if (mc.valid(originColor)) {
      const baseColor = mc(originColor).css('oklch');
      Object.assign(css, generateColorVariable(name, baseColor));
    }
  }

  for (const depth of depths) {
    const depthColor = getThemeDepthColor(themeMetaColors, depth);
    if (depthColor) {
      Object.assign(css, generateColorVariable(name, depthColor, depth));
    }
  }

  return css;
}

/**
 * Modify the value of the color variable
 * @param params params Parameter object
 * @param params.name Color name
 * @param params.color Color
 * @param params.dom params.dom Target element, modifying the entire page theme when passing `document.documentElement`
 */
export function updateMagicColor(params: { name: string, color: string, dom?: HTMLElement }) {
  const { name, color, dom } = params;
  if (!dom) {
    return;
  }

  const { hasBase, depths } = collectDefinedColorVariables(name, dom);
  const css = getMagicColorStyle({ name, color, hasBase, depths });

  for (const [variable, value] of Object.entries(css)) {
    if (value) {
      dom.style.setProperty(variable, value.toString());
    }
  }
}

import type { CSSObject } from 'unocss';
import { getMcThemeMetaColors, getThemeDepthColor, resolveBodyColor, resolveSpecialColor } from '@unocss-preset-magicolor/utils';
import { mc } from 'magic-color';
import { BASE_COLOR_DEPTH, createTargetColorVariableDeclaration } from './utils/color-variable';

interface ColorVariableUsage {
  hasBase: boolean
  depths: Set<string>
}

interface MagicColorStyleParams extends ColorVariableUsage {
  name: string
  color: string
  lightnessReverse?: boolean
}

/** Escapes a color name before it is interpolated into a CSS variable regex. */
function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Collects the base and depth variables already present in one style object. */
function collectStyleVariables(name: string, style: CSSStyleDeclaration, usage: ColorVariableUsage) {
  // Matches CSS variables like --mc-colors-{name}-DEFAULT or --mc-colors-{name}-{depth}
  // where {depth} is a numeric value
  const colorVariableRE = new RegExp(`^--mc-colors-${escapeRegExp(name)}-(${BASE_COLOR_DEPTH}|\\d+)$`);

  for (let i = 0; i < style.length; i++) {
    const variable = style.item(i);
    const match = variable.match(colorVariableRE);
    if (!match) {
      continue;
    }

    const [, depth] = match;
    if (depth === BASE_COLOR_DEPTH) {
      usage.hasBase = true;
    }
    else if (depth) {
      usage.depths.add(depth);
    }
  }
}

/** Reads inline and computed styles so runtime updates only touch variables that exist. */
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
  const { name, color, hasBase, depths, lightnessReverse } = params;
  const { originColor, originDepth } = resolveBodyColor(color);
  if (!originColor) {
    return {};
  }

  const css: CSSObject = {};

  // Special colors bypass depth generation because the same keyword is valid at every depth.
  const specialColor = resolveSpecialColor(originColor);
  if (specialColor) {
    if (hasBase) {
      Object.assign(css, createTargetColorVariableDeclaration(name, specialColor));
    }
    for (const depth of depths) {
      Object.assign(css, createTargetColorVariableDeclaration(name, specialColor, depth));
    }
    return css;
  }

  const themeMetaColors = getMcThemeMetaColors(originColor);

  if (hasBase) {
    if (originDepth) {
      // A base variable may point at a specific source depth, such as `#9c1d1e-457`.
      const baseColor = getThemeDepthColor(themeMetaColors, originDepth, { lightnessReverse });
      baseColor && Object.assign(css, createTargetColorVariableDeclaration(name, baseColor));
    }
    else if (mc.valid(originColor)) {
      const baseColor = mc(originColor).css('oklch');
      Object.assign(css, createTargetColorVariableDeclaration(name, baseColor));
    }
  }

  for (const depth of depths) {
    const depthColor = getThemeDepthColor(themeMetaColors, depth, { lightnessReverse });
    if (depthColor) {
      Object.assign(css, createTargetColorVariableDeclaration(name, depthColor, depth));
    }
  }

  return css;
}

/**
 * Updates already-defined CSS variables for a magic color on a DOM element.
 *
 * The helper intentionally does not infer usage from class names at runtime;
 * it only rewrites variables that were emitted by UnoCSS or declared by the app.
 * @param params params Parameter object
 * @param params.name Color name
 * @param params.color Color
 * @param params.lightnessReverse Reverse numeric lightness depths before resolving colors
 * @param params.dom params.dom Target element, modifying the entire page theme when passing `document.documentElement`
 */
export function updateMagicColor(params: { name: string, color: string, lightnessReverse?: boolean, dom?: HTMLElement }) {
  const { name, color, lightnessReverse, dom } = params;
  if (!dom) {
    return;
  }

  const { hasBase, depths } = collectDefinedColorVariables(name, dom);
  const css = getMagicColorStyle({ name, color, hasBase, depths, lightnessReverse });

  for (const [variable, value] of Object.entries(css)) {
    if (value) {
      dom.style.setProperty(variable, value.toString());
    }
  }
}

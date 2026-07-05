import type { ResolvedColorParts } from '@unocss-preset-magicolor/utils';
import type { MagicColorDepthMap } from '../usages/types';
import type { MagicColorDepth } from './color-variable';
import { resolveThemeDepth } from '@unocss-preset-magicolor/utils';
import { BASE_COLOR_DEPTH, createSourceColorVariableName, createTargetColorVariableName, toVar } from './color-variable';

interface ResolveColorVariableReferencesOptions {
  name: string
  colorParts: ResolvedColorParts
  depths?: Set<MagicColorDepth>
  lightnessReverse?: boolean
}

function addSourceDepth(depthMap: MagicColorDepthMap, name: string, depth: MagicColorDepth) {
  const depths = depthMap.get(name) ?? new Set<MagicColorDepth>();
  depths.add(depth);
  depthMap.set(name, depths);
}

/** Resolves target CSS variable references and the source depths they require. */
export function resolveColorReferences(options: ResolveColorVariableReferencesOptions) {
  const { name, colorParts, depths, lightnessReverse } = options;
  const { originColor, originDepth } = colorParts;
  const css: Record<string, string> = {};
  const depthMap: MagicColorDepthMap = new Map();
  if (!depths?.size || !originColor) {
    return { css, depthMap };
  }

  for (const depth of depths) {
    const rawSourceDepth = resolveThemeDepth({
      depth: depth === BASE_COLOR_DEPTH ? originDepth : depth,
      defaultValue: BASE_COLOR_DEPTH,
    });
    const sourceDepth = lightnessReverse
      ? resolveThemeDepth({
          depth: rawSourceDepth,
          defaultValue: rawSourceDepth,
          lightnessReverse: true,
        })
      : rawSourceDepth;

    const targetVariableName = createTargetColorVariableName(name, depth);
    const sourceVariableName = createSourceColorVariableName(originColor, sourceDepth);
    css[targetVariableName] = toVar(sourceVariableName);
    addSourceDepth(depthMap, originColor, sourceDepth);
  }

  return { css, depthMap };
}

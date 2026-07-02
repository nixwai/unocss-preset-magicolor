import type { Theme } from '@unocss/preset-wind4';
import type { Rule, RuleContext } from 'unocss';
import type { MagicColorContext } from '../typing';
import type { MagicColorDepthMap, StaticShortcutColorVariableTargetUsage } from '../usages';
import type { MagicColorDepth } from '../utils/color-variable';
import { hasDarkVariant, resolveBodyColor, resolveThemeDepth } from '@unocss-preset-magicolor/utils';
import { resolveMixtureColorConfig } from '../utils/color-config';
import { BASE_COLOR_DEPTH, createSourceColorVariableName, createTargetColorVariableName, parseColorVariableDefinition, toVar } from '../utils/color-variable';
import { resolveThemeColorCss } from '../utils/theme-colors';

/** Creates `mc-lr` rules that regenerate variables with reversed lightness depth lookup. */
export function createLightnessReverseColor(context?: MagicColorContext): Rule[] {
  return [
    [/^mc-lr$/, (_match, ctx) => resolveGlobalLightnessReverse(ctx, context)],
    [/^mc-lr-(.+)$/, (match, ctx) => resolveLocalLightnessReverse(match, ctx, context)],
  ];
}

function splitShortcutBody(body: string) {
  return body.split(/\s+/).filter(Boolean);
}

function collectStaticShortcutColorVariableTargetUsages(ctx: RuleContext<Theme>): StaticShortcutColorVariableTargetUsage[] {
  const usages: StaticShortcutColorVariableTargetUsage[] = [];
  const shortcuts = ctx.generator.config.shortcuts ?? [];

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
      tokens: splitShortcutBody(body),
    });
  }

  return usages;
}

function addSourceDepth(sourceDepths: MagicColorDepthMap, name: string, depth: MagicColorDepth) {
  const depths = sourceDepths.get(name) ?? new Set<MagicColorDepth>();
  depths.add(depth);
  sourceDepths.set(name, depths);
}

function resolveVariableLightnessReverseReferences(
  css: Record<string, string>,
  name: string,
  source: { name: string, no?: string },
  depths: Set<MagicColorDepth> | undefined,
) {
  const sourceDepths: MagicColorDepthMap = new Map();

  if (!depths) {
    return sourceDepths;
  }

  for (const depth of depths) {
    const rawSourceDepth = resolveThemeDepth({
      depth: depth === BASE_COLOR_DEPTH ? source.no : depth,
      defaultValue: BASE_COLOR_DEPTH,
    });
    const sourceDepth = resolveThemeDepth({
      depth: rawSourceDepth,
      defaultValue: rawSourceDepth,
      lightnessReverse: true,
    });
    css[createTargetColorVariableName(name, depth)] = toVar(createSourceColorVariableName(source.name, sourceDepth));
    addSourceDepth(sourceDepths, source.name, sourceDepth);
  }

  return sourceDepths;
}

/** Resolves local definitions such as `mc-lr-btn_rose-600`. */
function resolveLocalLightnessReverse([, body]: string[], ctx: RuleContext<Theme>, context?: MagicColorContext) {
  context?.usage.recordShortcutColorVariableTargetUsages(collectStaticShortcutColorVariableTargetUsages(ctx));
  const definition = parseColorVariableDefinition(body);
  if (!definition) {
    return;
  }
  const { name, hue } = definition;

  const css: Record<string, string> = {};
  const colorParts = resolveBodyColor(hue);
  const sourceConfig = resolveMixtureColorConfig(
    colorParts.originColor,
    ctx.theme,
    context,
    hasDarkVariant(ctx.rawSelector),
  );
  if (sourceConfig.color) {
    const sourceColorParts = resolveBodyColor(sourceConfig.color);
    const sourceBodyNo = colorParts.originDepth ?? sourceColorParts.originDepth;
    const sourceDepths = resolveVariableLightnessReverseReferences(
      css,
      name,
      {
        name: colorParts.originColor,
        no: sourceBodyNo,
      },
      context?.usage.getColorVariableTargetDepths(name),
    );
    context?.usage.recordColorVariableSourceUsage(ctx.rawSelector, sourceDepths);
  }
  else {
    const depths = context?.usage.getColorVariableTargetDepths(name);
    if (depths) {
      Object.assign(css, resolveThemeColorCss(
        name,
        colorParts,
        ctx.theme,
        depths,
        { lightnessReverse: true },
      ));
    }
    context?.usage.recordColorVariableSourceUsage(ctx.rawSelector, new Map());
  }
  return css;
}

/** Rebuilds all currently used configured variables with reversed lightness depths. */
function resolveGlobalLightnessReverse(ctx: RuleContext<Theme>, context?: MagicColorContext) {
  context?.usage.recordShortcutColorVariableTargetUsages(collectStaticShortcutColorVariableTargetUsages(ctx));
  const css: Record<string, string> = {};
  const sourceDepths: MagicColorDepthMap = new Map();

  for (const name of context?.usage.getColorVariableTargetNames() ?? []) {
    const depths = context?.usage.getColorVariableTargetDepths(name);
    if (!depths) {
      continue;
    }
    const sourceConfig = resolveMixtureColorConfig(
      name,
      ctx.theme,
      context,
      hasDarkVariant(ctx.rawSelector),
    );
    if (!sourceConfig.color) {
      continue;
    }
    const nextSourceDepths = resolveVariableLightnessReverseReferences(
      css,
      name,
      {
        name,
        no: resolveBodyColor(sourceConfig.color).originDepth,
      },
      depths,
    );
    for (const [sourceName, depths] of nextSourceDepths) {
      for (const depth of depths) {
        addSourceDepth(sourceDepths, sourceName, depth);
      }
    }
  }

  context?.usage.recordColorVariableSourceUsage(ctx.rawSelector, sourceDepths);
  return css;
}

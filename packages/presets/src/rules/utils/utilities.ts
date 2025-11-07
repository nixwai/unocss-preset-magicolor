import type { Theme } from '@unocss/preset-wind4';
import type { CSSObject, CSSValueInput, RuleContext } from 'unocss';
import type { ThemeKey } from '../../typing';
import { colorCSSGenerator, parseColor } from '@unocss/preset-wind4/utils';
import { formatHex } from 'culori';
import { mc } from 'magic-color';
import { countDiffColor, isInvalidColor, resolveDepth, themeMetaList, toOklch } from '../../utils';

type ParseColorReturn = ReturnType<typeof parseColor>;

function resolveColorData(body: string, theme: Theme): ParseColorReturn {
  let colorData = parseColor(body, theme);

  // already a configured color in the theme
  if (colorData?.color) {
    return colorData;
  }

  const [bodyColor, bodyOpacity, bodyModifier] = body.split(/[:/]/);
  const bodyNo = bodyColor.match(/.*-(\d+)/)?.[1];
  const originColor = bodyColor?.split(/-\d+-?/)[0];

  colorData = {
    opacity: bodyOpacity,
    modifier: bodyModifier,
    name: originColor,
    no: bodyNo,
    color: '',
    alpha: bodyOpacity && `${bodyOpacity}%`,
    keys: undefined,
    cssColor: undefined,
  };

  // invalid color
  if (isInvalidColor(originColor)) {
    return colorData;
  }

  if (!bodyNo) {
    return colorData;
  }

  const { originDepth, beforeDepth, afterDepth } = resolveDepth(bodyNo);
  let beforeParsedColor = parseColor(`${originColor}-${beforeDepth}`, theme)?.cssColor;
  let afterParsedColor = parseColor(`${originColor}-${afterDepth}`, theme)?.cssColor;

  // parse depth colors fail, obtain it through mc.theme
  if (!beforeParsedColor || !afterParsedColor) {
    try {
      const parsedOriginColor = parseColor(originColor, theme)?.color;
      // mc can not parse oklch, so need to convert to hex
      const customColor = parsedOriginColor ? formatHex(parsedOriginColor) : undefined;
      if (customColor && mc.valid(customColor)) {
        const themeColor = mc.theme(customColor);
        if (!beforeParsedColor) {
          beforeParsedColor = toOklch({ type: 'hex', components: [themeColor[beforeDepth as ThemeKey]], alpha: 1 });
        }
        if (!afterParsedColor) {
          afterParsedColor = toOklch({ type: 'hex', components: [themeColor[afterDepth as ThemeKey]], alpha: 1 });
        }
      }
    }
    catch (e) {
      console.error(`[unocss-preset-margicolor] Error parsing ${body}: get ${originColor} theme fail, please use another color.`);
      console.error(e);
    }
  }

  // uniform use oklch
  beforeParsedColor = toOklch(beforeParsedColor);
  afterParsedColor = toOklch(afterParsedColor);

  if (!beforeParsedColor || !afterParsedColor) { return colorData; } // invalid color

  colorData.color = countDiffColor({
    originDepth,
    beforeDepth,
    beforeComponents: beforeParsedColor.components,
    afterComponents: afterParsedColor.components,
  });

  return colorData;
}

function resolveColorVariable(colorData: ParseColorReturn) {
  const cssVariable: CSSObject = {};
  if (!colorData || colorData.color) {
    return { colorData, cssVariable };
  }

  const { name, no } = colorData;
  if (!no) {
    colorData.color = `var(--mc-${name}-color)`;
    return { colorData, cssVariable };
  }

  const { originDepth, beforeDepth, afterDepth } = resolveDepth(no);

  const colorVarL = `--mc-${name}-${originDepth}-l`;
  const colorVarC = `--mc-${name}-${originDepth}-c`;
  const colorVarH = `--mc-${name}-${originDepth}-h`;

  if (!themeMetaList.includes(originDepth as ThemeKey)) {
    const transitionRatio = (originDepth - beforeDepth) / ((originDepth < 100 || originDepth > 900) ? 50 : 100);
    const [calcL, calcC, calcH] = ['l', 'c', 'h']
      .map(key => `calc(var(--mc-${name}-${beforeDepth}-${key}) + ${transitionRatio} * (var(--mc-${name}-${afterDepth}-${key}) - var(--mc-${name}-${beforeDepth}-${key})))`);
    Object.assign(cssVariable, { [colorVarL]: calcL, [colorVarC]: calcC, [colorVarH]: calcH });
  }

  colorData.color = `oklch(var(${colorVarL}) var(${colorVarC}) var(${colorVarH}))`;

  return { colorData, cssVariable };
}

export function parseMagicColor(body: string, theme: Theme) {
  const colorData = resolveColorData(body, theme);
  return resolveColorVariable(colorData);
};

export function mcColorResolver(property: string, varName: string) {
  return ([, body]: string[], ctx: RuleContext<Theme>): (CSSValueInput | string)[] | undefined => {
    const { colorData, cssVariable } = parseMagicColor(body ?? '', ctx.theme);
    if (colorData?.color) {
      const result = colorCSSGenerator(colorData, property, varName, ctx);
      if (result) {
        result.push({
          [ctx.symbols.selector]: selector => selector,
          ...cssVariable,
        });
      }
      return result;
    }
  };
};

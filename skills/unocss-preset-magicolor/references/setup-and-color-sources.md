# Setup and Color Sources

## Minimal setup

Keep the project's existing UnoCSS presets and add `presetMagicolor()`:

```ts
import { defineConfig, presetWind4 } from 'unocss'
import { presetMagicolor } from 'unocss-preset-magicolor'

export default defineConfig({
  presets: [
    presetWind4(),
    presetMagicolor(),
  ],
})
```

The preset is additive. It reads UnoCSS theme colors and adds `mc-`-aware color rules; it does not replace the host preset.

## Source selection

### UnoCSS palette or theme color

Use built-in palette names or custom `theme.colors` keys directly:

```ts
export default defineConfig({
  presets: [presetWind4(), presetMagicolor()],
  theme: {
    colors: {
      grape: '#679512',
      wine: { red: '#9c1d1e' },
      brand: { DEFAULT: '#409eff', 457: '#123456' },
    },
  },
})
```

```html
<div class="bg-mc-rose-445 c-mc-grape-160 border border-mc-wine-red-575"></div>
```

When the theme provides an exact requested depth, that value wins. Missing depths are generated or interpolated from the concrete source color.

### Global semantic alias

Configure stable names such as `primary`, `surface`, or `brand` in `presetMagicolor({ colors })`. See `global-aliases-and-dark-mode.md`.

### Arbitrary concrete color

Wrap concrete CSS colors in brackets when the color body contains punctuation or spaces. Use underscores for spaces in utility tokens:

```html
<div class="bg-mc-[#789411]-430"></div>
<div class="bg-mc-[rgb(12_22_33)]-220"></div>
<div class="bg-mc-[hsl(210_60%_40%)]-300"></div>
<div class="bg-mc-[lab(60_20_10)]-350"></div>
<div class="bg-mc-[lch(40_20_21.57)]-400"></div>
<div class="bg-mc-[oklch(40.1%_0.123_21.57)]-200"></div>
<div class="bg-mc-[oklab(40.1%_0.1_0.2)]-500"></div>
```

Use a concrete parseable color when requesting generated depths. A runtime CSS variable does not provide a build-time color scale.

### Special CSS color

Use special names directly:

```html
<div class="bg-mc-transparent border border-mc-current c-mc-inherit"></div>
```

Special colors are emitted directly for every requested depth and do not create a generated scale.

## Depth model

- Use a base color without a number: `c-mc-primary`.
- Use a hyphenated depth: `c-mc-primary-457`.
- Use compact depth syntax: `c-mc-primary457`.
- Depth `0` resolves to the light boundary and depth `1000` to the dark boundary.
- Arbitrary numeric depths are interpolated between neighboring scale stops.
- Out-of-range numeric lookups are clamped to the boundary during color resolution.
- Base (`DEFAULT`) and numeric depth variables are independent. Request only what the component uses.

Prefer hyphenated depths for readability, especially when color names contain hyphens.

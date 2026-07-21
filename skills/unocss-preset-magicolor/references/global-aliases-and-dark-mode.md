# Global Aliases and Dark Mode

## Configure semantic aliases

Use strings for simple aliases and objects when one alias needs reversed numeric lookup:

```ts
import { defineConfig, presetWind4 } from 'unocss'
import { presetMagicolor } from 'unocss-preset-magicolor'

export default defineConfig({
  presets: [
    presetWind4({ dark: 'class' }),
    presetMagicolor({
      colors: {
        primary: { color: 'rose', lightnessReverse: true },
        brand: '#4f7bff',
        surface: '#f8fafc',
      },
      dark: {
        primary: 'blue',
        brand: '#8ab4ff',
        surface: '#111827',
      },
    }),
  ],
})
```

```html
<button class="bg-mc-primary-457 c-white hover:bg-mc-primary-620"></button>
<section class="bg-mc-surface-120 dark:bg-mc-surface-880"></section>
```

Only scanned aliases and base/depth values are emitted.

## Source forms

Each `colors` or `dark` value accepts:

```ts
string
// or
{ color: string, lightnessReverse?: boolean }
```

The `color` value may reference a UnoCSS theme color, another concrete color string, a special color, or a source depth such as `brand-457`. A source depth controls the alias base (`DEFAULT`) lookup; explicit target depths remain explicit target lookups.

## Dark-mode behavior

Magicolor follows the dark strategy of the active UnoCSS mini/wind preset:

- `dark: 'class'`: emit dark variables under `.dark`.
- `dark: 'media'`: emit dark variables in `prefers-color-scheme: dark`.
- Custom dark selector object: use its configured dark selector.
- No compatible host preset: fall back to `.dark`.

Use normal `dark:` variants for selector-specific utilities or definitions:

```html
<div class="bg-mc-surface-100 dark:bg-mc-surface-900"></div>
<div class="mc-local_rose dark:mc-local_blue bg-mc-local-457"></div>
```

## Naming

- camelCase option keys also receive generated kebab-case aliases.
- Both `c-mc-brandPrimary-457` and `c-mc-brand-primary-457` can work for `brandPrimary`.
- An explicitly configured kebab-case key takes priority over an automatically generated alias.
- Avoid names ending in digits because compact depth parsing consumes the trailing digits.

## Layer order

The preset uses layer `unocss-preset-magicolor` with default order `-100`. Native UnoCSS utilities therefore emit later and can override the same property.

Override only when Magicolor should win:

```ts
export default defineConfig({
  presets: [presetWind4(), presetMagicolor()],
  layers: {
    'unocss-preset-magicolor': 1,
  },
})
```

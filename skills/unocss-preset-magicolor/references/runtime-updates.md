# Runtime Updates

Import the helper from the public helper entry point:

```ts
import { updateMagicColor } from 'unocss-preset-magicolor/helper'
```

## Global update

```ts
updateMagicColor({
  name: 'primary',
  color: 'rgb(79 123 255)',
  lightnessReverse: true,
  dom: document.documentElement,
})
```

## Scoped update

```ts
const root = document.querySelector<HTMLElement>('[data-color-scope]')

updateMagicColor({
  name: 'card',
  color: '#9c1d1e',
  dom: root ?? undefined,
})
```

The helper reads inline and computed styles on the target element, finds existing variables for the requested name, and rewrites only those variables.

## Required static usage

Runtime updates do not infer depths from descendant class names and do not create arbitrary new variable names. Ensure UnoCSS has emitted the base/depth variables first:

```html
<div class="c-mc-primary bg-mc-primary-457 hover:bg-mc-primary-620"></div>
```

This makes `DEFAULT`, `457`, and `620` available for runtime updates. Passing only `bg-mc-primary-457` does not imply every other depth.

## Behavior

- Omit `dom`: no update occurs.
- Invalid or empty `color`: no variables are written.
- `lightnessReverse: true`: numeric lookups use `1000 - depth`.
- Special colors such as `transparent` or `currentColor` are written directly.
- Updating a component root does not mutate the document root.
- Updating one color name does not alter another name on the same element.
- Existing computed-style declarations are recognized, not only inline declarations.
- A source depth such as `#9c1d1e-457` can provide the base value while requested numeric variables still resolve by their own depths.

## Advanced pure generation

The helper entry point also exposes `getMagicColorStyle` for generating a CSS-object map when the caller already knows the exact base/depth usage:

```ts
import { getMagicColorStyle } from 'unocss-preset-magicolor/helper'

const style = getMagicColorStyle({
  name: 'primary',
  color: '#4f7bff',
  hasBase: true,
  depths: new Set(['457', '620']),
})
```

Prefer `updateMagicColor` for DOM updates. Use `getMagicColorStyle` only when managing declarations explicitly.

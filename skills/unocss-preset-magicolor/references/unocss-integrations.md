# UnoCSS Integrations

## Variants and variant groups

Normal UnoCSS variants and groups are supported:

```html
<div class="hover:bg-mc-primary-620 dark:c-mc-surface-180"></div>
<div class="hover:(bg-mc-primary-620 c-mc-white)"></div>
```

## Shortcuts

Static and synchronous dynamic shortcuts can contain Magicolor utilities and local definitions. Variables are emitted only when the shortcut selector is actually scanned.

```ts
export default defineConfig({
  shortcuts: [
    ['btn', 'bg-mc-primary hover:bg-mc-primary-630 text-white'],
    ['card', 'mc-card_rose bg-mc-card-333 c-mc-card-700'],
    [/^tone-(.+)$/, ([, depth]) => `bg-mc-primary-${depth}`],
  ],
})
```

Grouped variants inside shortcuts are tracked:

```ts
['btn', 'p-5 bg-mc-custom-777 hover:(bg-mc-custom-888 c-mc-custom-333)']
```

## Attributify

Use Magicolor bodies in standard Attributify attributes:

```html
<div bg="mc-primary-333" hover:bg="mc-secondary640" c="mc-label"></div>
<div un-bg="hover:mc-primary-333 focus:mc-secondary-640"></div>
```

Non-valued/self-referencing forms are also scanned when allowed by the active Attributify options:

```html
<div bg-mc-primary-333="~" c-mc-secondary-640="true"></div>
```

Use local definitions and lightness reverse as attributes:

```html
<div mc-brand_rose="" c-mc-brand="true"></div>
<div mc="lr" c-mc-primary-80="true"></div>
```

Respect the project's `presetAttributify` options:

- `prefixedOnly` may require `un-` attributes.
- `nonValuedAttribute` controls bare/true-valued attribute handling.
- Ignored attributes remain ignored.
- Normal `class` and `className` tokens are still valid.

## Directives

With `transformerDirectives()`, both forms are scanned:

```css
.btn {
  --at-apply: bg-mc-primary-630;
}

.card {
  @apply c-mc-primary-457;
}
```

## Compile class

With `transformerCompileClass()`, Magicolor usages, local definitions, lightness reverse, and variant groups inside `:uno:` compiled classes are tracked:

```html
<div class=":uno: mc-card_blue bg-mc-card-330 hover:(bg-mc-primary-444 c-white)"></div>
```

## Safelist

Safelist complete tokens that cannot be statically discovered:

```ts
export default defineConfig({
  safelist: [
    'bg-mc-primary-630',
    'c-mc-surface-120',
  ],
})
```

Do not rely on string concatenation such as `` `bg-mc-${color}-${depth}` `` unless every possible final token is safelisted.

## Tagify

When `presetTagify()` is active, a supported Magicolor token can be expressed as a tag name and combined with normal class utilities:

```html
<mc-lr-surface class="bg-mc-surface-125 c-mc-white"></mc-lr-surface>
```

Use this only when the project already uses Tagify; class syntax is clearer otherwise.

## Development/watch mode

The usage tracker replaces stale per-file usages during rescans. Keep source tokens stable and literal; do not work around watch behavior by generating broad manual variable sets.

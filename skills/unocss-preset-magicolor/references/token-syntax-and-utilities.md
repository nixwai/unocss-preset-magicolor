# Token Syntax and Supported Utilities

## Color body syntax

Use this general form:

```text
<utility>-mc-<color>[-<depth>][/<opacity>][:<modifier>]
```

Examples:

```html
<div class="bg-mc-primary-457 c-mc-brand border-mc-neutral-733/60"></div>
<div class="hover:bg-mc-primary-620 focus:!outline-mc-brand-500"></div>
```

A color name may be a theme key, configured alias, local definition name, special color, or bracketed concrete color. Normal UnoCSS variants, important markers, opacity, and variant groups remain available.

## Supported utility families

### Text and foreground

```html
<div class="c-mc-primary-457 color-mc-primary-457"></div>
<div class="text-mc-primary-457 text-color-mc-primary-457"></div>
<input class="placeholder-mc-neutral-400 caret-mc-primary-500" />
<div class="accent-mc-primary-500 outline outline-mc-primary-500"></div>
<div class="underline decoration-mc-primary-500"></div>
```

Supported prefixes:

- `c-mc-*`, `color-mc-*`
- `text-mc-*`, `text-color-mc-*`
- `placeholder-mc-*`
- `caret-mc-*`, `accent-mc-*`, `outline-mc-*`, `outline-color-mc-*`
- `underline-mc-*`, `decoration-mc-*`
- `text-stroke-mc-*`
- `text-shadow-mc-*`, `text-shadow-color-mc-*`

### Background and gradients

```html
<div class="bg-mc-surface-120"></div>
<div class="bg-gradient-to-r from-mc-primary-300 via-mc-brand-500 to-mc-primary-700"></div>
<div class="stops-mc-primary-500"></div>
```

Supported gradient color prefixes are `from-mc-*`, `via-mc-*`, `to-mc-*`, and `stops-mc-*`. Supply the normal UnoCSS gradient direction/type utility separately.

### Borders and division

```html
<div class="border border-mc-primary-500"></div>
<div class="b b-x-mc-primary-500 b-l-color-mc-primary-500"></div>
<div class="border-block-mc-primary-500 border-is-mc-primary-500"></div>
<div class="divide-y divide-mc-primary-300"></div>
```

Supported border forms:

- Base aliases: `border-mc-*`, `border-color-mc-*`, `b-mc-*`, `b-color-mc-*`
- Axes: `border-x-mc-*`, `border-y-mc-*` and `b-*` equivalents
- Physical sides: `r`, `l`, `t`, `b`
- Logical sides: `s`, `e`, `block`, `inline`, `bs`, `be`, `is`, `ie`
- Optional `color-` segment in every border group
- `divide-mc-*`

Add width/style utilities such as `border`, `border-2`, or `divide-y` when needed.

### Rings and shadows

```html
<div class="ring ring-mc-primary-500 ring-offset-2 ring-offset-mc-surface-100"></div>
<div class="inset-ring inset-ring-mc-primary-500"></div>
<div class="shadow shadow-mc-primary-500"></div>
<div class="inset-shadow inset-shadow-mc-primary-500"></div>
<div class="drop-shadow drop-shadow-mc-primary-500"></div>
```

Supported prefixes:

- `ring-mc-*`, `inset-ring-mc-*`, `ring-offset-mc-*`
- `shadow-mc-*`, `inset-shadow-mc-*`
- `drop-shadow-mc-*`, `filter-drop-shadow-mc-*`
- `drop-shadow-color-mc-*`, `filter-drop-shadow-color-mc-*`

Use the normal size/effect utility as required by the host UnoCSS preset.

### SVG and masks

```html
<svg class="fill-mc-primary-500 stroke-mc-brand-700"></svg>
<div class="mask-linear-from-mc-primary-200 mask-linear-to-mc-primary-800"></div>
<div class="mask-x-from-mc-primary-200 mask-x-to-mc-primary-800"></div>
```

Supported mask shapes are `linear`, `radial`, and `conic`; supported directions are `t`, `r`, `b`, `l`, `x`, and `y`; each accepts `from` and `to`.

## Variants and groups

```html
<button class="bg-mc-primary-457 hover:bg-mc-primary-620 dark:c-mc-surface-180"></button>
<div class="hover:(bg-mc-primary-620 c-mc-white) focus:(ring ring-mc-brand-500)"></div>
```

Keep complete literal tokens in source whenever possible so the usage scanner can discover exact names and depths.

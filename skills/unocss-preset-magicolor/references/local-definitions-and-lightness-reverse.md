# Local Definitions and Lightness Reverse

## Local color definition

Define a scoped color source with `mc-<name>_<source>` and consume the name with normal Magicolor utilities:

```html
<div class="mc-card_[#9c1d1e]">
  <article class="bg-mc-card-90 c-mc-card-760 shadow shadow-mc-card-620"></article>
</div>
```

The definition emits CSS variables on the matched element. It does not set a visible CSS property by itself. Variables are generated only for statically scanned usages of `card`.

Supported sources:

```html
<div class="mc-card_primary"></div>
<div class="mc-card_rose"></div>
<div class="mc-card_rose-620"></div>
<div class="mc-card_[#9c1d1e]"></div>
<div class="mc-card_[oklch(62%_0.2_20)]"></div>
<div class="mc-card_transparent"></div>
```

A source depth such as `rose-620` binds the local base (`DEFAULT`) variable to source depth `620`. Explicit usages such as `bg-mc-card-300` still request their own numeric depth.

Definitions can be variant-scoped:

```html
<div class="mc-card_rose dark:mc-card_blue bg-mc-card-457"></div>
```

## Local lightness reverse

Reverse numeric lookup while defining a local source:

```html
<div class="mc-lr-card_rose">
  <button class="bg-mc-card-50 hover:bg-mc-card-450"></button>
</div>
```

Reverse an existing configured/theme name with same-name shorthand:

```html
<section class="mc-lr-primary">
  <button class="bg-mc-primary-80 c-mc-primary-920"></button>
</section>
```

`mc-lr-primary` is equivalent to a reversed local binding whose target and source are both `primary`.

Dark variants select dark option sources when available:

```html
<section class="dark:mc-lr-primary bg-mc-primary-80"></section>
```

## Selector-local global reversal

Use bare `mc-lr` to reverse numeric depths for configured or theme color names used by the selector's generated rule context:

```html
<section class="mc-lr bg-mc-primary-80 ring ring-mc-rose-230"></section>
```

Depth mapping is `1000 - depth`:

- `50 -> 950`
- `450 -> 550`
- `500 -> 500`
- `80 -> 920`

Base (`DEFAULT`) variables are not treated as depth `500` and are not numerically reversed.

Bare `mc-lr` does not replace a separate same-element local definition. Use `mc-lr-<name>_<source>` when the local definition itself must be reversed.

## Common mistakes

- Invalid: `mc-card` as a definition. A source definition requires `_source`.
- Invalid: `mc-card_` with no source.
- Ineffective by itself: `mc-card_rose` without any `*-mc-card` usage.
- Risky: defining an unknown source name that is neither a configured alias, theme color, special color, nor concrete bracket color.
- Prefer bracket syntax for function colors so underscores stay inside the color body.

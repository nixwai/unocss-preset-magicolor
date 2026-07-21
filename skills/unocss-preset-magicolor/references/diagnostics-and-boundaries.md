# Diagnostics and Boundaries

## No generated variables

Check in this order:

1. Confirm `presetMagicolor()` is in the active UnoCSS config.
2. Confirm the final literal token is present in scanned source or `safelist`.
3. Confirm the color name resolves to a configured alias, UnoCSS theme color, local definition, special color, or bracketed concrete color.
4. Confirm a local definition uses `_`: `mc-card_rose`.
5. Confirm the definition name matches the consumer: `mc-card_rose` with `bg-mc-card-457`.
6. Confirm dynamic tokens are safelisted.
7. Confirm the relevant transformer or preset is configured for directives, Attributify, Compile Class, or Tagify syntax.

The preset intentionally emits only scanned base/depth variables. A definition without a consuming utility does not emit the color variables.

## Utility exists but color is unresolved

An unknown nonnumeric name may still produce a utility that references `--mc-colors-<name>-DEFAULT`, while no source variable is emitted. Define the name in `presetMagicolor({ colors })`, `theme.colors`, or a local `mc-<name>_<source>` token.

## Invalid token patterns

```text
c-mc-123              # numeric-only body; no color name
mc-card                # not a local definition; missing _source
mc-card_               # empty source
mc-lr-card_            # empty reversed source
```

Avoid alias names ending in digits because `brand2` can be parsed as color `brand` at compact depth `2`.

## Base versus depth

`c-mc-primary` requests `DEFAULT`. It does not request `500`.

`c-mc-primary-500` requests numeric depth `500`. It does not guarantee a base variable.

This distinction also applies to local definitions, global aliases, and runtime updates.

## Source depth versus target depth

```html
<div class="mc-badge_rose-620 bg-mc-badge c-mc-badge-300"></div>
```

- `bg-mc-badge` binds the local base to source depth `620`.
- `c-mc-badge-300` requests source depth `300`.

Do not interpret the source depth as an offset or as a replacement scale origin.

## Specificity and layer order

Magicolor's default layer order is `-100`, so later native UnoCSS utilities can override the same property. If a class appears to generate correctly but loses in the cascade:

1. Inspect the final CSS order.
2. Remove conflicting color utilities when possible.
3. Change the `unocss-preset-magicolor` layer order only when the project intentionally wants Magicolor to win.

## Structural utility missing

Color-only utilities do not always create the full effect:

```html
<div class="border border-mc-primary-500"></div>
<div class="shadow shadow-mc-primary-500"></div>
<div class="ring ring-mc-primary-500"></div>
<div class="bg-gradient-to-r from-mc-primary-300 to-mc-brand-700"></div>
```

Keep the host UnoCSS structural/size utility alongside the Magicolor color utility.

## Dark colors not applied

- Confirm the host mini/wind preset's dark strategy.
- For class mode, confirm the configured dark selector exists on an ancestor.
- For media mode, test the operating-system color preference.
- For a local dark source, use a variant definition such as `dark:mc-card_blue`.
- For reversed dark colors, apply `dark:mc-lr`, `dark:mc-lr-primary`, or `dark:mc-lr-primary_blue` as appropriate.

## Runtime update does nothing

- Pass an actual `HTMLElement` in `dom`.
- Ensure the requested name and exact base/depth variables already exist on that element through inline or computed styles.
- Ensure the color is concrete and parseable.
- Do not expect child class names to be scanned at runtime.

## Validation targets

After changing user code, run the narrowest existing command that causes UnoCSS to scan and generate CSS. For this repository, representative commands are:

```bash
pnpm test
pnpm preset:build
pnpm play:build
```

Do not add new validation infrastructure solely for a styling edit.

---
name: unocss-preset-magicolor
description: Write, refactor, and debug color-related UnoCSS code in projects that already use UnoCSS and have `unocss-preset-magicolor` installed. Use for `mc-*` color utilities, arbitrary numeric depths, theme colors, global semantic aliases, dark-mode color mappings, component-local color definitions, lightness reversal, opacity modifiers, gradients, borders, shadows, Attributify, shortcuts, directives, safelists, compile-class usage, Tagify, or runtime color switching with `updateMagicColor`.
---

# UnoCSS Preset Magicolor

Use the preset as an additive color layer. Preserve the host project's existing UnoCSS presets, variants, transformers, shortcuts, theme structure, and file organization.

## Workflow

1. Inspect `package.json` and the active UnoCSS config. Confirm both UnoCSS and `unocss-preset-magicolor` are present. Do not install, replace, or reorder unrelated presets unless the user asks.
2. Identify the requested CSS property, color source, scope, depth, opacity, state variants, and dark-mode behavior.
3. Choose the narrowest supported form:
   - Existing theme/global color: use a direct utility such as `bg-mc-primary-457`.
   - One-off concrete color: use bracket syntax such as `bg-mc-[#4f7bff]-457`.
   - Reusable component-local color: define `mc-<name>_<source>` on the scope element, then consume `*-mc-<name>[-<depth>]`.
   - Reversed scale: use an option-level `lightnessReverse`, `mc-lr-<name>[_<source>]`, or selector-local `mc-lr` according to scope.
   - Runtime change: use `updateMagicColor` only after static classes have caused the required variables to be generated.
4. Read only the references needed for the task:
   - `references/setup-and-color-sources.md`
   - `references/token-syntax-and-utilities.md`
   - `references/global-aliases-and-dark-mode.md`
   - `references/local-definitions-and-lightness-reverse.md`
   - `references/unocss-integrations.md`
   - `references/runtime-updates.md`
   - `references/diagnostics-and-boundaries.md`
5. Write literal, statically discoverable utility tokens whenever possible. Safelist runtime-constructed tokens.
6. Keep normal UnoCSS structural utilities next to Magicolor color utilities when required, such as `border`, `shadow`, `ring`, or a gradient direction utility.
7. Validate with the project's existing lint, typecheck, test, or build command. Prefer the smallest command that exercises UnoCSS generation.

## Decision Rules

- Prefer an existing semantic alias over repeating a literal brand color.
- Prefer a local definition when the same component color must be rebound without changing descendant utility names.
- Prefer a global alias when the color is shared across pages or participates in light/dark theme configuration.
- Do not treat a local definition token as a visible color utility; `mc-card_rose` defines variables but does not set a CSS property.
- Do not invent a utility prefix. Verify it in `references/token-syntax-and-utilities.md`.
- Do not assume `DEFAULT` means depth `500`. Base variables and numeric depth variables are distinct.
- Do not generate every depth. The preset emits only statically scanned base/depth usages.
- Do not use a numeric-only color body such as `c-mc-123`; it is invalid because no color name exists.
- Do not use alias names ending in digits; trailing digits are parsed as compact depth syntax.
- Preserve UnoCSS variants and important markers, for example `hover:bg-mc-primary-620`, `dark:c-mc-surface-180`, and `!bg-mc-brand-457/80`.

<h1 align="center">unocss-preset-magicolor</h1>

<p align="center">🎨 Easier to use more colors in css.</p>

## Usage

```bash
pnpm add unocss-preset-magicolor -D
```

Before using, please follow the official [UnoCss](https://unocss.dev/integrations/vite) documentation to add the required UnoCss dependencies and configurations to your project. Then proceed with the following steps.

Similar to other UnoCss preset libraries, you need to add this preset library in the UnoCss configuration file before using.

```ts
import { defineConfig } from 'unocss';
import { presetMagicolor } from 'unocss-preset-magicolor';

export default defineConfig({ presets: [presetMagicolor()] });
```

### basic

You can use any color of any depth between 50 and 950. If you want to add a new theme color, you only need to configure the default color in the 'theme'。Generate the color depth through [magic-color](https://github.com/zyyv/magic-color), and all color formats are converted to `oklch` type by default.

```ts
import { defineConfig, presetWind4 } from 'unocss';
import { presetMagicolor } from '../packages/presets/src';

export default defineConfig({
  presets: [
    presetWind4(),
    presetMagicolor(),
  ],
  theme: { colors: { wine: { red: '#9c1d1e' } } },
});
```

```vue
<template>
  <button class="px-8 py-4 bg-mc-rose-445 hover:bg-mc-wine-red-575">
    <span class="c-mc-[#789411]-430">
      Hello World!
    </span>
  </button>
</template>
```

### Use class to define colors

Now, in addition to defining colors in 'theme', you can also directly define colors in 'class'.It is very useful for components that need to dynamically modify colors.

```vue
<template>
  <button class="px-8 py-4 mc-btn_[#9c1d1e] hover:mc-btn_blue bg-mc-btn-450">
    <span class="c-mc-btn-610">
      Hello World!
    </span>
  </button>
</template>
```

## Credits

- [magic-color](https://github.com/zyyv/magic-color)

## license

[MIT](./LICENSE)

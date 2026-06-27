<h1 align="center">unocss-preset-magicolor</h1>

<p align="center">🎨 为 UnoCSS 颜色扩展任意色阶、语义别名与运行时换色能力。</p>

<p align="center">
  <a href="./README.md">English</a> |
  <a href="./README.zh-cn.md">简体中文</a>
</p>

## 使用

```bash
pnpm add unocss-preset-magicolor -D
```

请先按照 [UnoCSS](https://unocss.dev/integrations/vite) 官方文档接入 UnoCSS 及你需要的基础预设，例如 `presetWind4`。然后在 UnoCSS 配置中加入 `presetMagicolor()`。

```ts
import { defineConfig, presetWind4 } from 'unocss';
import { presetMagicolor } from 'unocss-preset-magicolor';

export default defineConfig({
  presets: [
    presetWind4(),
    presetMagicolor(),
  ],
});
```

### Layer 顺序

默认情况下，本预设会把自身工具类输出到名为 `unocss-preset-magicolor` 的 UnoCSS 内部 layer，并将排序设置为 `-100`。UnoCSS 会把排序值更高的 layer 更靠后输出，因此 `mc-*` 工具类默认会早于普通 `default` 层输出。当同一个元素上同时使用 `mc-*` 工具类和 UnoCSS 原生工具类，并且它们设置了同一个 CSS 属性时，原生工具类默认可以覆盖 `mc-*` 工具类。

如果希望 Magicolor 工具类默认拥有更高优先级，可以在 UnoCSS 配置顶层覆盖同名 layer 的排序：

```ts
import { defineConfig, presetWind4 } from 'unocss';
import { presetMagicolor } from 'unocss-preset-magicolor';

export default defineConfig({
  presets: [
    presetWind4(),
    presetMagicolor(),
  ],
  layers: {
    'unocss-preset-magicolor': 1,
  },
});
```

layer 名称由预设固定，通常只需要按项目需要调整这个数字排序值。

`unocss-preset-magicolor` 不替换 UnoCSS 原本的颜色系统，而是在原有 `theme.colors`、默认色板和颜色工具类之上增加一层 `mc-` 能力：

- 原本只能使用 `rose-500`、`blue-600` 这类固定色阶，现在可以写 `rose-445`、`primary-457`、`brand-630` 这类任意数字色阶。
- 色阶会根据 UnoCSS theme 色板或 `magic-color` 生成的 50、100、200...950 色阶插值，并统一输出为 `oklch(...)`。
- 生成的 CSS 变量会按实际扫描到的 class 裁剪，未使用的颜色名和色阶不会进入最终 CSS。
- 大多数 UnoCSS 颜色相关工具类都可以使用 `mc-` 版本，例如 `c-mc-*`、`text-mc-*`、`bg-mc-*`、`border-mc-*`、`ring-mc-*`、`shadow-mc-*`、`fill-mc-*`、`stroke-mc-*`、`from-mc-*`、`via-mc-*`、`to-mc-*` 和 `mask-*-mc-*`。

### 基础用法

你可以直接把 UnoCSS 已有颜色、`theme.colors` 中的自定义颜色，以及任意合法 CSS 颜色用于 `mc-` 颜色工具类。和 UnoCSS 原生写法相比，差异主要是颜色名前多了 `mc-`，并且色阶不再局限于默认的 50/100/200...950。

```ts
import { defineConfig, presetWind4 } from 'unocss';
import { presetMagicolor } from 'unocss-preset-magicolor';

export default defineConfig({
  presets: [
    presetWind4(),
    presetMagicolor(),
  ],
  theme: {
    colors: {
      grape: '#679512',
      wine: { red: '#9c1d1e' },
    },
  },
});
```

```vue
<template>
  <button class="border border-mc-wine-red-575 bg-mc-rose-445 px-8 py-4 hover:bg-mc-wine-red-575">
    <span class="c-mc-grape-160">
      Hello World!
    </span>
  </button>
</template>
```

也可以用 UnoCSS 任意值语法直接写一次性颜色：

```vue
<template>
  <div class="bg-mc-[rgb(12_22_33)]-220 c-mc-[#789411]-430">
    Arbitrary magic color
  </div>
</template>
```

### 使用 class 定义颜色

除了在 `theme.colors` 中配置颜色，也可以直接在 class 中定义局部颜色变量。语法是 `mc-<name>_<color>`，之后在同一作用域内通过 `*-mc-<name>` 或 `*-mc-<name>-<depth>` 使用。

这适合封装组件时把“颜色名”和“使用位置”分开：组件根节点定义颜色，内部按钮、文字、边框、阴影等继续使用 UnoCSS 风格的工具类。

```vue
<template>
  <div class="mc-btn_[#9c1d1e]">
    <button class="bg-mc-btn-450 px-8 py-4 shadow shadow-mc-btn-620 hover:bg-mc-btn-575">
      <span class="c-mc-btn-610">
        Hello World!
      </span>
    </button>
  </div>
</template>
```

`mc-btn_[#9c1d1e]` 只是定义颜色来源，真正需要输出哪些 CSS 变量由 `bg-mc-btn-450`、`shadow-mc-btn-620`、`c-mc-btn-610` 这些使用类决定。你也可以把定义类写成 `mc-btn_blue`、`mc-btn_primary`，其中 `blue` 可以来自 UnoCSS 默认色板，`primary` 可以来自下面的全局颜色配置。

### 全局颜色

如果项目里有稳定的语义色，可以通过 `presetMagicolor({ colors })` 定义全局别名。别名会在 `:root` 中输出为 `--mc-<name>-color` 或 `--mc-<name>-<depth>-color`，但同样只会为实际用到的色阶生成变量。

```ts
import { defineConfig, presetWind4 } from 'unocss';
import { presetMagicolor } from 'unocss-preset-magicolor';

export default defineConfig({
  presets: [
    presetWind4({ dark: 'class' }),
    presetMagicolor({
      colors: {
        primary: 'rose',
        brand: '#4f7bff',
      },
      dark: {
        primary: 'blue',
        brand: '#8ab4ff',
      },
    }),
  ],
});
```

```vue
<template>
  <button class="bg-mc-primary-457 px-8 py-4 c-white ring ring-mc-brand-630 hover:bg-mc-primary-620">
    Hello World!
  </button>
</template>
```

这相当于在 UnoCSS 原有 `theme.colors` 之外增加一层语义映射：`primary`、`brand` 这样的业务色名可以继续享受任意色阶、透明度修饰和变体能力，例如 `bg-mc-primary-457/80`、`hover:bg-mc-primary-620`。

`dark` 选项可以为同一组语义色定义全局暗色模式颜色。存在 `presetWind4` 时，暗色颜色表会跟随它的 `dark` 配置（`'class'`、`'media'` 或自定义选择器）。如果 Magicolor 无法读取到 `presetWind4` 的 dark 配置，则默认使用 `.dark`。生成的暗色块会覆盖同名 `--mc-*` 变量，不依赖 `dark:mc-*` 工具类是否成功生成。

同一个语义色仍然可以通过变体在局部组件中重新定义。例如使用 `mc-primary_<color>` 定义亮色主题，再用 `dark:mc-primary_<color>` 在暗黑模式下覆盖颜色；所有读取 `primary` 的工具类都会跟随当前主题变化。

```vue
<template>
  <main class="mc-primary_[#409eff] dark:mc-primary_[#8ab4ff]">
    <button class="bg-mc-primary-500 px-8 py-4 c-white dark:bg-mc-primary-400">
      Theme primary
    </button>
  </main>
</template>
```

### JS 运行时换色

可以使用 `updateMagicColor` 在运行时更新已经生成的 magic color CSS 变量。传入 `document.documentElement` 时通常用于切换整站主题色；传入组件根节点时可以只更新局部作用域。

```vue
<script setup lang="ts">
import { updateMagicColor } from 'unocss-preset-magicolor/helper';

function toggleColor() {
  updateMagicColor({
    name: 'primary',
    color: 'rgb(79 123 255)',
    dom: document.documentElement,
  });
}
</script>

<template>
  <button class="bg-mc-primary-457 px-8 py-4 c-white hover:bg-mc-primary-620" @click="toggleColor">
    change primary color
  </button>
</template>
```

`updateMagicColor` 会读取目标元素上已经存在的 `--mc-primary-color`、`--mc-primary-457-color` 等变量，并只更新这些已定义变量。它不会单纯根据 DOM 里的 class 反推新变量，因此需要先通过 `c-mc-primary`、`bg-mc-primary-457` 等 class 让 UnoCSS 生成对应变量。

## 鸣谢

- [UnoCSS](https://github.com/unocss/unocss)
- [magic-color](https://github.com/zyyv/magic-color)

## 许可证

[MIT](./LICENSE)

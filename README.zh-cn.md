<h1 align="center">unocss-preset-magicolor</h1>

<p align="center">🎨 为 UnoCSS 颜色系统扩展任意色阶、语义别名与运行时换色能力。</p>

<p align="center">
  <a href="./README.md">English</a> |
  <a href="./README.zh-cn.md">简体中文</a>
</p>

## 使用

```bash
pnpm add unocss-preset-magicolor -D
```

在使用本预设前，请先按照官方 [UnoCSS 集成指南](https://unocss.dev/integrations/vite) 安装并配置 UnoCSS。保留项目中已有的 UnoCSS 预设，然后添加 `presetMagicolor()`。

```ts
import { defineConfig } from 'unocss';
import { presetMagicolor } from 'unocss-preset-magicolor';

export default defineConfig({
  presets: [
    // ...your existing UnoCSS presets
    presetMagicolor(),
  ],
});
```

`unocss-preset-magicolor` 不会替换 UnoCSS 原有的颜色系统。它会在现有 `theme.colors`、默认色板和颜色工具规则之上，扩展一层 `mc-` 魔法颜色能力：

- 不再局限于 `rose-500`、`blue-600` 这类固定色阶，可以写 `rose-445`、`primary-457`、`brand-630` 等任意数字色阶。
- 色阶颜色会从 UnoCSS 主题色板，或由 `magic-color` 生成的 50、100、200...950 色板中插值得到，并输出为 `oklch(...)`。
- CSS 变量会根据扫描到的实际用法生成，未使用的颜色名和未使用的色阶不会被输出。
- 大多数 UnoCSS 颜色相关工具类都有对应的 `mc-` 版本，包括 `c-mc-*`、`text-mc-*`、`bg-mc-*`、`border-mc-*`、`ring-mc-*`、`shadow-mc-*`、`fill-mc-*`、`stroke-mc-*`、`from-mc-*`、`via-mc-*`、`to-mc-*` 和 `mask-*-mc-*`。

### 基础用法

可以在 `mc-` 工具类中使用 UnoCSS 内置颜色、`theme.colors` 中的自定义颜色，以及合法的 CSS 颜色值。与 UnoCSS 原生颜色工具类相比，主要区别是增加了 `mc-` 前缀，并支持默认 50/100/200...950 之外的任意数字色阶。

```ts
import { defineConfig } from 'unocss';
import { presetMagicolor } from 'unocss-preset-magicolor';

export default defineConfig({
  presets: [
    // ...your existing UnoCSS presets
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

也可以使用 UnoCSS 任意值语法来书写一次性颜色：

```vue
<template>
  <div class="bg-mc-[rgb(12_22_33)]-220 c-mc-[#789411]-430">
    Arbitrary magic color
  </div>
</template>
```

### 使用 class 定义颜色

除了在 `theme.colors` 中定义颜色，也可以直接在 class 中定义局部颜色变量。使用 `mc-<name>_<color>` 定义一个颜色来源，然后在同一作用域中通过 `*-mc-<name>` 或 `*-mc-<name>-<depth>` 使用它。

这对组件样式很有用，因为颜色名和使用位置可以保持分离：在组件根节点定义颜色，然后继续使用 UnoCSS 风格的工具类来设置背景、文字、边框、阴影等。

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

`mc-btn_[#9c1d1e]` 只负责定义颜色来源。实际输出哪些 CSS 变量由 `bg-mc-btn-450`、`shadow-mc-btn-620`、`c-mc-btn-610` 等使用类决定。也可以写成 `mc-btn_blue` 或 `mc-btn_primary`；其中 `blue` 可以来自 UnoCSS 默认色板，`primary` 可以来自下文的全局颜色选项。

当局部定义需要反转数字亮度色阶时，使用 `mc-lr-<name>_<color>`。目标变量名保持不变，但源色阶会被反向读取，因此 `50` 会读取 `950`，`450` 会读取 `550`，`500` 保持 `500`。

```vue
<template>
  <div class="mc-lr-btn_rose">
    <button class="bg-mc-btn-50 hover:bg-mc-btn-450">
      Reversed lightness
    </button>
  </div>
</template>
```

也可以在不重新定义颜色来源的情况下反转已有颜色名。`mc-lr-primary` 只会反转 `primary`，而裸写 `mc-lr` 会反转当前选择器中正在使用的已配置颜色名或主题颜色名。

```vue
<template>
  <section class="mc-lr">
    <button class="bg-mc-primary-80 c-white ring ring-mc-rose-230">
      Inverted depth scale
    </button>
  </section>
</template>
```

### 全局颜色

对于稳定的语义色，可以使用 `presetMagicolor({ colors })` 定义全局别名。别名会在 `:root` 下输出为无色阶用法的 `--mc-colors-<name>-DEFAULT`，或数字色阶用法的 `--mc-colors-<name>-<depth>`，但只会为实际使用到的色阶生成变量。

```ts
import { defineConfig } from 'unocss';
import { presetMagicolor } from 'unocss-preset-magicolor';

export default defineConfig({
  presets: [
    // ...your existing UnoCSS presets
    presetMagicolor({
      colors: {
        primary: { color: 'rose', lightnessReverse: true },
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

这会在原有 UnoCSS `theme.colors` 之上增加一层语义能力：`primary`、`brand` 等业务颜色名可以使用任意色阶、透明度修饰和变体，例如 `bg-mc-primary-457/80` 和 `hover:bg-mc-primary-620`。

全局 `colors` 和 `dark` 条目既可以是字符串，也可以是对象。使用 `{ color, lightnessReverse: true }` 可以只为该别名反转数字亮度色阶。`--mc-colors-primary-DEFAULT` 这样的基础变量不会被当作 `500` 处理；只有显式数字色阶会被反转。

完整的预设选项如下：

```ts
interface PresetMcOptions {
  colors?: Record<string, string | { color: string, lightnessReverse?: boolean }>
  dark?: Record<string, string | { color: string, lightnessReverse?: boolean }>
}
```

`dark` 选项用于为同一组语义名定义全局暗色模式别名。当存在 `presetWind4` 时，暗色颜色映射会跟随它的 `dark` 模式（`'class'`、`'media'` 或自定义选择器）。如果 Magicolor 无法读取 `presetWind4` 的暗色模式，则回退到 `.dark`。生成的暗色块会覆盖相同的 `--mc-colors-*` 变量，不依赖是否生成了 `dark:mc-*` 工具类。

同一个语义色仍然可以通过变体在局部组件中重新定义。例如，使用 `mc-primary_<color>` 定义亮色主题，再使用 `dark:mc-primary_<color>` 在暗色模式下覆盖；所有读取 `primary` 的工具类都会跟随当前主题。

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

使用 `updateMagicColor` 可以在运行时更新已生成的 magic color CSS 变量。传入 `document.documentElement` 通常用于更新整页主题；传入组件根元素时，只会更新该局部作用域。

```vue
<script setup lang="ts">
import { updateMagicColor } from 'unocss-preset-magicolor/helper';

function toggleColor() {
  updateMagicColor({
    name: 'primary',
    color: 'rgb(79 123 255)',
    lightnessReverse: true,
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

`updateMagicColor` 会读取目标元素上已有的变量，例如 `--mc-colors-primary-DEFAULT` 和 `--mc-colors-primary-457`，并且只更新这些已定义的变量。它不会仅凭 DOM class 推断新变量，因此必须先通过 `c-mc-primary` 或 `bg-mc-primary-457` 等 class 让 UnoCSS 生成对应变量。

传入 `lightnessReverse: true` 时，会使用与 `mc-lr-*` 和全局颜色对象相同的反向亮度映射来更新已有数字色阶变量。

### Layer 顺序

默认情况下，本预设会将工具类输出到名为 `unocss-preset-magicolor` 的 UnoCSS 内部 layer 中，排序值为 `-100`。UnoCSS 会将排序值更高的 layer 输出在更靠后的位置，因此这会让 `mc-*` 工具类位于普通 `default` layer 之前。当同一元素上的 `mc-*` 工具类和 UnoCSS 原生工具类设置同一个 CSS 属性时，原生工具类默认可以覆盖 `mc-*` 工具类。

如果希望 Magicolor 工具类拥有更高优先级，可以在 UnoCSS 配置中只覆盖该 layer 的排序值：

```ts
import { defineConfig } from 'unocss';
import { presetMagicolor } from 'unocss-preset-magicolor';

export default defineConfig({
  presets: [
    // ...your existing UnoCSS presets
    presetMagicolor(),
  ],
  layers: {
    'unocss-preset-magicolor': 1,
  },
});
```

layer 名称由预设固定；用户通常只需要自定义数字排序值。

## 鸣谢

- [UnoCSS](https://github.com/unocss/unocss)
- [magic-color](https://github.com/zyyv/magic-color)

## 许可证

[MIT](./LICENSE)

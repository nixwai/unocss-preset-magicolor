<h1 align="center">unocss-preset-magicolor</h1>

<p align="center">🎨 为 UnoCSS 颜色系统扩展任意色阶、语义别名、局部颜色变量和运行时换色能力。</p>

<p align="center">
  <a href="./README.md">English</a> |
  <a href="./README.zh-cn.md">简体中文</a>
</p>

## 安装

```bash
# npm
npm install -D unocss-preset-magicolor

# pnpm
pnpm add -D unocss-preset-magicolor

# bun
bun add -d unocss-preset-magicolor
```

使用本预设前，请先按照官方 [UnoCSS 集成指南](https://unocss.dev/integrations/) 安装并配置 UnoCSS。保留项目中已有的 UnoCSS 预设，然后添加 `presetMagicolor()`。

## 配置

把预设加入 UnoCSS 配置：

```ts
// uno.config.ts
import { defineConfig, presetWind4 } from 'unocss';
import { presetMagicolor } from 'unocss-preset-magicolor';

export default defineConfig({
  presets: [
    presetWind4(),
    presetMagicolor(),
  ],
});
```

`unocss-preset-magicolor` 不会替换 UnoCSS 原有颜色系统。它会在 `theme.colors`、UnoCSS 默认色板和颜色相关工具规则之上，增加一层 `mc-` 魔法颜色能力。

## 用法

直接在模板中使用 `mc-` 颜色工具类：

```html
<button class="rounded px-4 py-2 bg-mc-rose-445 c-white hover:bg-mc-rose-620">
  Magic color
</button>
```

不同于 `rose-500`、`blue-600` 这类固定色阶，Magicolor 支持任意数字色阶：

```html
<div class="bg-mc-rose-445 c-mc-blue-187 border border-mc-neutral-733">
  Arbitrary depth colors
</div>
```

色阶颜色会从当前 UnoCSS 主题色板，或由 [`magic-color`](https://github.com/zyyv/magic-color) 生成的 50、100、200...950 色板中解析，然后输出为 `oklch(...)` 自定义属性。预设只会为扫描到的颜色名和色阶生成变量，未使用的变量不会输出。

## 颜色来源

Magicolor 工具类可以读取多种颜色来源。

### UnoCSS 主题颜色

UnoCSS 内置颜色和 `theme.colors` 中的自定义颜色都可以直接使用：

```ts
import { defineConfig, presetWind4 } from 'unocss';
import { presetMagicolor } from 'unocss-preset-magicolor';

export default defineConfig({
  presets: [presetWind4(), presetMagicolor()],
  theme: {
    colors: {
      grape: '#679512',
      wine: { red: '#9c1d1e' },
    },
  },
});
```

```html
<button class="border border-mc-wine-red-575 bg-mc-rose-445 px-8 py-4">
  <span class="c-mc-grape-160">Hello World!</span>
</button>
```

### 任意 CSS 颜色

使用 UnoCSS 任意值语法可以书写一次性颜色：

```html
<div class="bg-mc-[rgb(12_22_33)]-220 c-mc-[#789411]-430">
  Arbitrary magic color
</div>
```

### 全局语义色

对于稳定的语义色，例如 `primary`、`brand` 或 `surface`，可以使用 `presetMagicolor({ colors })` 定义全局别名：

```ts
import { defineConfig, presetWind4 } from 'unocss';
import { presetMagicolor } from 'unocss-preset-magicolor';

export default defineConfig({
  presets: [
    presetWind4({ dark: 'class' }),
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

```html
<button class="bg-mc-primary-457 c-white ring ring-mc-brand-630 hover:bg-mc-primary-620">
  Semantic color
</button>
```

`colors` 定义亮色模式别名，`dark` 定义同名暗色模式别名。当存在 `presetWind4` 时，Magicolor 会跟随它的暗色模式设置，包括 `class`、`media` 和自定义选择器。如果无法读取 Wind4 暗色模式，则回退到 `.dark`。

camelCase 别名也可以通过 kebab-case class 使用。例如 `brandPrimary` 既可以写成 `c-mc-brandPrimary-457`，也可以写成 `c-mc-brand-primary-457`。不建议让别名以数字结尾，因为末尾数字会被解析成紧凑色阶语法。

## 局部颜色定义

使用 `mc-<name>_<source>` 可以直接在 class 中定义组件局部颜色变量：

```html
<div class="mc-card_[#9c1d1e]">
  <button class="bg-mc-card-450 px-8 py-4 shadow shadow-mc-card-620 hover:bg-mc-card-575">
    <span class="c-mc-card-610">Hello World!</span>
  </button>
</div>
```

定义类只声明颜色来源。实际输出哪些 CSS 变量，由 `bg-mc-card-450`、`shadow-mc-card-620`、`c-mc-card-610` 等使用类决定。

颜色来源可以是主题颜色、全局别名、CSS 颜色，也可以带源色阶：

```html
<div class="mc-card_primary mc-badge_rose-620 mc-chip_[oklch(62%_0.2_20)]">
  <span class="bg-mc-card-457">Card</span>
  <span class="bg-mc-badge">Badge</span>
  <span class="c-mc-chip-300">Chip</span>
</div>
```

## 反向亮度

当颜色需要反向读取数字色阶时，使用 `mc-lr-*`。例如 `50` 读取 `950`，`450` 读取 `550`，`500` 保持 `500`。

```html
<div class="mc-lr-card_rose">
  <button class="bg-mc-card-50 hover:bg-mc-card-450">
    Reversed local color
  </button>
</div>
```

也可以在不重新定义颜色来源的情况下反转已有颜色名：

```html
<section class="mc-lr-primary">
  <button class="bg-mc-primary-80 c-white ring ring-mc-primary-230">
    Reversed primary
  </button>
</section>
```

裸写 `mc-lr` 会反转当前选择器中正在使用的已配置颜色名或主题颜色名：

```html
<section class="mc-lr">
  <button class="bg-mc-primary-80 c-white ring ring-mc-rose-230">
    Inverted depth scale
  </button>
</section>
```

## 运行时换色

使用 `updateMagicColor` 可以在运行时更新已经生成的 magic color CSS 变量。传入 `document.documentElement` 会更新整页主题；传入组件根元素时，只更新该局部作用域。

```vue
<script setup lang="ts">
import { updateMagicColor } from 'unocss-preset-magicolor/helper';

function changePrimary() {
  updateMagicColor({
    name: 'primary',
    color: 'rgb(79 123 255)',
    lightnessReverse: true,
    dom: document.documentElement,
  });
}
</script>

<template>
  <button class="bg-mc-primary-457 px-8 py-4 c-white hover:bg-mc-primary-620" @click="changePrimary">
    Change primary
  </button>
</template>
```

`updateMagicColor` 会读取目标元素上已有的变量，例如 `--mc-colors-primary-DEFAULT` 和 `--mc-colors-primary-457`，然后只更新这些已存在变量。它不会仅凭 DOM class 推断新变量，因此需要先通过 `c-mc-primary` 或 `bg-mc-primary-457` 等 class 让 UnoCSS 生成对应变量。

## 预设选项

```ts
interface PresetMcOptions {
  colors?: Record<string, string | { color: string; lightnessReverse?: boolean }>
  dark?: Record<string, string | { color: string; lightnessReverse?: boolean }>
}
```

| 选项 | 说明 |
| --- | --- |
| `colors` | 全局亮色模式语义色别名。当扫描到匹配用法时，会在 `:root` 下输出变量。 |
| `dark` | 同一组语义名的全局暗色模式别名。会在配置的暗色选择器或媒体查询下覆盖源变量。 |
| `lightnessReverse` | 为某个别名反转数字色阶读取。`DEFAULT` 等基础变量不会被当成 `500` 处理。 |

## Layer 顺序

Magicolor 工具类会输出到名为 `unocss-preset-magicolor` 的 UnoCSS layer 中，默认排序值为 `-100`。排序值更高的 layer 会更晚输出，因此当原生 UnoCSS 工具类和 `mc-*` 工具类设置同一 CSS 属性时，原生工具类默认可以覆盖 `mc-*` 工具类。

如果希望 Magicolor 工具类优先级更高，只需要覆盖该 layer 的排序值：

```ts
import { defineConfig, presetWind4 } from 'unocss';
import { presetMagicolor } from 'unocss-preset-magicolor';

export default defineConfig({
  presets: [presetWind4(), presetMagicolor()],
  layers: {
    'unocss-preset-magicolor': 1,
  },
});
```

## 兼容说明

- `hover:`、`focus:`、`dark:`、variant group 等常规 UnoCSS 变体可以和 `mc-*` 工具类一起使用。
- shortcuts、safelist、attributify 模式、`transformerDirectives` 和 `transformerCompileClass` 均由预设的 usage scanner 覆盖。
- `transparent`、`currentColor`、`inherit` 等特殊颜色关键字会直接输出，不会生成 magic color 变量。

## 开发

```bash
# 安装依赖
pnpm install

# 运行测试
pnpm test

# 构建 preset 包
pnpm preset:build

# 启动 playground
pnpm play:dev

# 构建 playground
pnpm play:build
```

## 鸣谢

- [UnoCSS](https://github.com/unocss/unocss)
- [magic-color](https://github.com/zyyv/magic-color)

## 许可证

[MIT](./LICENSE)

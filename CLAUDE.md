# unocss-preset-magicolor 项目开发指南

> 本文件为 AI 编程助手提供项目上下文、代码边界和开发规范。

## 项目信息

- UnoCSS 预设库，发布包名为 `unocss-preset-magicolor`。
- 使用 TypeScript、pnpm workspace、Vitest、tsdown、Gulp 和 Vue 3 playground。
- 核心能力是在 UnoCSS 颜色体系上增加 `mc-*` 魔法颜色层，支持任意数字深度、语义色别名、局部颜色定义、反向亮度和运行时变量更新。
- 输出包位于 `packages/presets`，底层颜色工具位于私有包 `packages/utils`，演示与手动验证位于 `playground`。

### 项目结构

```text
unocss-preset-magicolor/
├── packages/
│   ├── presets/                 # npm 发布包 unocss-preset-magicolor
│   │   ├── src/
│   │   │   ├── index.ts         # presetMagicolor 入口，组装 usage/rules/variants/preflights
│   │   │   ├── helper.ts        # 运行时 helper，导出 updateMagicColor
│   │   │   ├── types.ts         # 公开 options 类型
│   │   │   ├── typing.ts        # preset 内部上下文类型
│   │   │   ├── rules/           # UnoCSS rule 定义与 resolver
│   │   │   ├── preflights/      # 根据 usage 生成 CSS 变量块
│   │   │   ├── usages/          # token 扫描、shortcut 扩展、缓存与 usage 聚合
│   │   │   ├── utils/           # preset 内部变量、配置、theme 适配工具
│   │   │   ├── variants/        # placeholder 等 variant 适配
│   │   │   └── test/            # Vitest 用例和生成器 helpers
│   │   └── package.json
│   └── utils/                   # 私有公共工具包 @unocss-preset-magicolor/utils
│       └── src/                 # 颜色解析、magic-color 转换、theme 深度工具
├── playground/                  # Vite + Vue 手动验证 playground
├── tooling/                     # build/release/publish 脚本
├── vitest.config.ts             # happy-dom 测试环境
├── eslint.config.mjs            # Antfu ESLint 配置
└── pnpm-workspace.yaml          # workspace 与 pnpm trust/override 配置
```

---

## 代码边界规范

### `packages/utils`

- 只放跨 preset 可复用、与 UnoCSS 规则上下文无关的底层工具。
- 适合放入这里的逻辑包括：颜色 token 解析、特殊颜色识别、depth 计算、`magic-color` 色阶生成、数值转换和空值收窄。
- 不要在这里依赖 `unocss` 的 `RuleContext`、generator cache、preflight、具体 `mc-*` 规则或 preset options。
- 新增能力如果会被 `helper.ts` 和 preset 规则同时使用，优先抽到这里。

### `packages/presets/src/utils`

- 只放 preset 内部实现工具，负责把底层颜色工具接入 UnoCSS theme、CSS 变量命名和 options 配置。
- `color-variable.ts` 维护 `--mc-colors-*` 与 `--mc-source-colors-*` 变量命名、`name_source` 解析和 literal color 判断。
- `color-config.ts` 维护 options 标准化、kebab-case 颜色名和 light/dark 配置合并。
- `theme-colors.ts` 负责读取 UnoCSS theme，补齐缺失 depth，并统一输出 `oklch(...)`。
- 不要把 UnoCSS rule 正则、usage cache 或 DOM runtime 更新逻辑塞进这里。

### `packages/presets/src/rules`

- 只放 UnoCSS rule 层逻辑：匹配 token、调用 resolver、记录 usage、返回 CSS。
- `color-style-rule.ts` 负责用户可见的 `c-mc-*`、`bg-mc-*`、`border-mc-*`、`shadow-mc-*` 等颜色 utility。
- `mc-variable-rule.ts` 负责 `mc-name_source` 局部颜色定义。
- `mc-lr-rule.ts` 负责 `mc-lr` 与 `mc-lr-name_source` 反向亮度逻辑。
- `rules/unocss-utils/*` 放与 UnoCSS Wind4 原有 utility 对齐的细分 resolver；新增 utility 时优先按功能拆成小文件，再从 `unocss-utils/index.ts` re-export。
- 规则层可以读取 `RuleContext`，但不要直接生成全局 preflight 字符串。

### `packages/presets/src/usages`

- 只放使用量扫描、缓存和 shortcut 展开逻辑。
- `MagicColorUsage` 是 extractor、rules 和 preflights 之间共享状态的唯一入口。
- 修改 usage 逻辑时必须考虑 UnoCSS dev global mode 的累计 token 行为，以及 generator cache 失效。
- 不要在 rule 文件中手写跨输入聚合逻辑；通过 `context.usage` 记录和读取。

### `packages/presets/src/preflights`

- 只根据 usage 和 options 输出 CSS custom properties。
- 继续保持“只生成被扫描到的颜色名和 depth”的原则，避免全量生成色阶。
- dark mode 必须跟随宿主 UnoCSS preset 的 dark 配置；无法读取时才回退到 `.dark`。
- 不要在 preflight 中解析用户 selector 或重复实现 rule 匹配。

### `packages/presets/src/helper.ts`

- 只放浏览器运行时 helper，当前公开能力是 `updateMagicColor`。
- helper 不扫描 class，也不推断新变量；只更新目标 DOM 上已经存在的 `--mc-colors-*` 变量。
- 涉及 DOM API 时保持 `dom?: HTMLElement` 的容错行为，不要让 SSR 或非浏览器环境直接抛错。

### `playground`

- playground 用于人工验证和示例调试，不是 preset 业务逻辑归属地。
- 新增用户可见能力时，可以同步补充 `playground/uno.config.ts` 或组件示例，但核心行为必须先在 `packages/presets/src/test` 覆盖。

### `tooling`

- build/release/publish 任务保留在 `tooling/common/tasks` 与 `tooling/presets`。
- 构建任务使用 `runBuildSteps` 串起 clean、bundle 等步骤；不要在 package scripts 中堆复杂 shell 串联。

---

## 代码风格规范

- 使用 TypeScript ESM，优先 `import type` 导入类型。
- 遵循 `@antfu/eslint-config` 与本仓库 ESLint 规则：单引号、分号、所有分支使用花括号、单行最多两个语句。
- 公共类型写在 `types.ts`，内部上下文或实现专用类型写在靠近使用处或 `typing.ts`。
- 函数职责保持小而明确。只有当逻辑被多个文件使用，或当前文件开始混合不同层职责时，才抽离新工具。
- 注释用于解释 UnoCSS cache、扫描时序、CSS 变量链路等不直观逻辑；不要给显而易见的赋值或返回值加注释。
- 保持现有命名：public target 变量使用 `--mc-colors-{name}-{depth}`，internal source 变量使用 `--mc-source-colors-{name}-{depth}`，base depth 使用 `DEFAULT`。
- 正则解析必须配套边界测试，尤其是 bracket color、opacity `/`、modifier `:`、hyphenated color name、compact depth 和 variant group。
- 不要把用户输入 token 当成可信 CSS；新增解析逻辑时优先复用 `resolveBodyColor`、`parseColorVariableDefinition`、`parseColor` 等现有解析入口。

---

## 测试规范

- 测试放在 `packages/presets/src/test`，按行为命名，例如 `basic-usage.test.ts`、`usage-scanner-and-cache.test.ts`。
- 使用 `test/helpers.ts` 中的 `generate`、`generateWithAttributify`、`generateWithDirectives`、`generateWithWind4`、`generateWithoutWind4` 创建 UnoCSS generator。
- 断言优先检查生成 CSS 是否包含或不包含关键变量、selector、dark block 和 `oklch(...)` 输出。
- 修复 bug 时先补一条能复现的测试，再改实现。
- 修改 usage/cache/shortcut 相关逻辑时，至少运行 scanner/cache 相关测试和一个端到端 CSS 生成测试。

---

## 常用命令

```bash
pnpm test
pnpm coverage
pnpm lint
pnpm lint:fix
pnpm build
pnpm preset:build
pnpm play:dev
pnpm play:build
```

### 推荐验证范围

- 修改 `packages/presets/src/rules`、`utils`、`usages`、`preflights`：运行 `pnpm test`，必要时再运行 `pnpm preset:build`。
- 修改 `packages/utils`：运行 `pnpm test` 与 `pnpm preset:build`。
- 修改 `helper.ts`：运行 `pnpm test`，并确认浏览器/DOM 容错路径。
- 修改 `playground`：运行 `pnpm play:build`，前端布局变更还要检查不同 viewport 下是否有文本重叠。
- 修改 tooling 或 package exports：运行 `pnpm build`，并检查 `packages/presets/package.json` 的 `exports`、`types` 和 `files` 是否仍匹配产物。
- 纯文档改动：可只检查相关 Markdown 内容；本仓库 ESLint 忽略 `*.md`。

---

## 依赖与发布注意事项

- 使用 pnpm workspace，不要改用 npm/yarn lockfile。
- `packages/presets` 的 peer dependency 是 `unocss`，不要把宿主项目应安装的 UnoCSS 主包改成普通 dependency。
- `@unocss-preset-magicolor/utils` 是 workspace 私有包，面向 preset 内部消费，不应作为公开文档入口推广。
- 发布包只包含 `dist`，新增公开入口时必须同步更新 `packages/presets/package.json` 的 `exports`、`main`、`module`、`types`。
- build 输出到 `packages/presets/dist`，playground 输出到根目录 `dist/play`；不要手改生成产物，除非任务明确要求处理产物。

---

## PR 与变更规范

- PR 标题建议使用英文 conventional 风格，例如 `fix: track shortcut magic colors in dev mode`。
- 用户可见行为变更需要同步更新根目录 `README.md` 和 `README.zh-cn.md`。
- 新增或修改 `mc-*` token 语法时，README、测试和 playground 示例应保持一致。
- 内部重构不需要改 README，除非改变了公开 API、生成 CSS、运行时 helper 行为或配置方式。
- 版本发布、tag、publish 相关操作只在用户明确要求时执行。

---

## 编码行为准则

### 先读链路再改代码

- 修改前先确认当前逻辑属于 `rules`、`usages`、`preflights`、`utils`、`helper` 还是 `tooling`。
- 不确定边界时先沿调用链查找：`presetMagicolor` -> `createRules` / `variants` / `preflights` -> `MagicColorUsage` -> 具体 resolver。
- 不要为了一个局部 bug 横向重构整个颜色系统。

### 保持最小改动

- 每一行改动都应能对应用户请求、复现测试或必要的类型/构建修复。
- 不清理无关旧代码，不顺手重排文件，不修改生成产物。
- 新抽离的函数必须降低当前文件复杂度，或被至少两个合理调用点复用。

### 让行为可验证

- bug 修复要有失败用例或至少有明确的 CSS 输出断言。
- 新功能要覆盖 light、dark、theme color、literal color、special color 或 runtime helper 中实际受影响的组合。
- 如果无法运行验证命令，最终回复必须说明原因和未覆盖风险。

---

## 参考入口

- 用户文档：`README.md`、`README.zh-cn.md`
- preset 入口：`packages/presets/src/index.ts`
- runtime helper：`packages/presets/src/helper.ts`
- 测试 helper：`packages/presets/src/test/helpers.ts`
- playground 配置：`playground/uno.config.ts`

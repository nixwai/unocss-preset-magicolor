import type { UserConfig } from '@unocss/core';
import { createGenerator } from '@unocss/core';
import { presetWind4 } from '@unocss/preset-wind4';
import { useStorage } from '@vueuse/core';
import { presetMagicolor } from 'unocss-preset-magicolor';
import { computed, ref, watch } from 'vue';
import defaultConfigSource from '../../uno.config.ts?raw';

type PlaygroundModule = Record<string, unknown>;
type PlaygroundImport = (name: string) => Promise<PlaygroundModule>;

const defaultHtml = `<div class="min-h-screen flex items-center justify-center bg-mc-primary-80">
  <div class="mc-card_rose bg-mc-card-120 c-mc-card-760 rounded-3 px-8 py-5 text-6 font-600 shadow-mc-card-160">
    hello world
  </div>
</div>`;

const defaultCustomCss = `/* Write custom CSS here. */
.custom {
  font-weight: 600;
}`;

const storageKeys = {
  configSource: 'unocss-preset-magicolor:playground:config-source',
  customCss: 'unocss-preset-magicolor:playground:custom-css',
  html: 'unocss-preset-magicolor:playground:html',
};

const AsyncFunction = Object.getPrototypeOf(async () => undefined).constructor as new (
  ...args: string[]
) => (importer: PlaygroundImport) => Promise<UserConfig | undefined>;

const playgroundModules: Record<string, PlaygroundModule> = {
  '@unocss/preset-wind4': {
    default: presetWind4,
    presetWind4,
  },
  'unocss': {
    defineConfig,
    presetWind4,
  },
  'unocss-preset-magicolor': {
    default: presetMagicolor,
    presetMagicolor,
  },
};

function toErrorMessage(exception: unknown) {
  return exception instanceof Error ? exception.message : String(exception);
}

function defineConfig(config: UserConfig) {
  return config;
}

function toRunnableConfigSource(source: string) {
  return source
    .replace(/import\s+type[\s\S]*?from\s*(['"])[\w@/-]+\1;?/g, '')
    .replace(/import\s(.*?)\sfrom\s*(['"])unocss\2;?/g, 'const $1 = await __import("unocss");')
    .replace(/import\s*(\{[\s\S]*?\})\s*from\s*(['"])([\w@/-]+)\2;?/g, 'const $1 = await __import("$3");')
    .replace(/import\s(.*?)\sfrom\s*(['"])([\w@/-]+)\2;?/g, 'const $1 = (await __import("$3")).default;')
    .replace(/export\s+default\s+/, 'return ');
}

async function evaluateConfigSource(source: string) {
  const __import: PlaygroundImport = async (name) => {
    const module = playgroundModules[name];
    if (!module) {
      throw new Error(`Unsupported import "${name}" in playground config.`);
    }
    return module;
  };

  const fn = new AsyncFunction('__import', toRunnableConfigSource(source));
  return await fn(__import) ?? {};
}

export function usePlayground() {
  const html = useStorage(storageKeys.html, defaultHtml);
  const configSource = useStorage(storageKeys.configSource, defaultConfigSource);
  const customCss = useStorage(storageKeys.customCss, defaultCustomCss);
  const generatedCss = ref('');
  const error = ref('');
  let version = 0;

  const outputCss = computed(() => {
    if (!customCss.value.trim()) {
      return generatedCss.value;
    }
    return `${generatedCss.value}\n\n/* layer: custom */\n${customCss.value}`;
  });

  const documentSource = computed(() => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>${outputCss.value}</style>
  </head>
  <body>${html.value}</body>
</html>`);

  async function render() {
    const currentVersion = ++version;

    try {
      const config = await evaluateConfigSource(configSource.value);
      const uno = await createGenerator(config);
      const result = await uno.generate(html.value, { id: 'playground.html' });

      if (currentVersion !== version) {
        return;
      }

      generatedCss.value = result.css;
      error.value = '';
    }
    catch (exception) {
      if (currentVersion === version) {
        error.value = toErrorMessage(exception);
      }
    }
  }

  function reset() {
    html.value = defaultHtml;
    configSource.value = defaultConfigSource;
    customCss.value = defaultCustomCss;
  }

  watch([html, configSource], render, { immediate: true });

  return {
    configSource,
    customCss,
    documentSource,
    error,
    html,
    outputCss,
    reset,
  };
}

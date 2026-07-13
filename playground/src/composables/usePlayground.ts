import type { UserConfig } from '@unocss/core';
import { createGenerator } from '@unocss/core';
import { presetAttributify } from '@unocss/preset-attributify';
import { presetTagify } from '@unocss/preset-tagify';
import { presetWind4 } from '@unocss/preset-wind4';
import { useStorage } from '@vueuse/core';
import { presetMagicolor } from 'unocss-preset-magicolor';
import { updateMagicColor } from 'unocss-preset-magicolor/helper';
import { computed, nextTick, ref, watch } from 'vue';
import defaultConfigSource from '../../uno.config.ts?raw';
import defaultHtml from '../template/default.html?raw';

type PlaygroundModule = Record<string, unknown>;
type PlaygroundImport = (name: string) => Promise<PlaygroundModule>;

declare global {
  interface Window {
    __unocssPresetMagicolorUpdateMagicColor?: typeof updateMagicColor
  }
}

const storageKeys = {
  configSource: 'unocss-preset-magicolor:playground:config-source',
  isDark: 'unocss-preset-magicolor:playground:is-dark',
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
  '@unocss/preset-attributify': {
    default: presetAttributify,
    presetAttributify,
  },
  '@unocss/preset-tagify': {
    default: presetTagify,
    presetTagify,
  },
  'unocss': {
    defineConfig,
    presetWind4,
    presetAttributify,
    presetTagify,
  },
  'unocss-preset-magicolor': {
    default: presetMagicolor,
    presetMagicolor,
  },
  'unocss-preset-magicolor/helper': { updateMagicColor },
};

function toErrorMessage(exception: unknown) {
  return exception instanceof Error ? exception.message : String(exception);
}

function defineConfig(config: UserConfig) {
  return config;
}

function getRuntimeHelperScript() {
  return `<script>
window.updateMagicColor = function(params) {
  if (params && typeof params.dom === 'string') {
    params.dom = document.querySelector(params.dom);
  }
  window.parent.__unocssPresetMagicolorUpdateMagicColor?.(params);
};
</script>`;
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
  window.__unocssPresetMagicolorUpdateMagicColor = updateMagicColor;

  const html = useStorage(storageKeys.html, defaultHtml);
  const configSource = useStorage(storageKeys.configSource, defaultConfigSource);
  const isDark = useStorage(storageKeys.isDark, false);
  const generatedCss = ref('');
  const error = ref('');
  let version = 0;

  const outputCss = computed(() => generatedCss.value);

  const documentSource = computed(() => `<!doctype html>
<html lang="en"${isDark.value ? ' class="dark"' : ''}>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>${generatedCss.value}</style>
    ${getRuntimeHelperScript()}
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

  async function reset() {
    html.value = '';
    configSource.value = defaultConfigSource;
    await nextTick();
    html.value = defaultHtml;
  }

  watch([html, configSource], render, { immediate: true });

  return {
    configSource,
    documentSource,
    error,
    html,
    isDark,
    outputCss,
    reset,
  };
}

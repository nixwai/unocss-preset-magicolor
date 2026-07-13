<script setup lang="ts">
import { watch } from 'vue';
import { usePlayground } from '../composables/usePlayground';
import CodeEditor from './playground/CodeEditor.vue';
import PanelShell from './playground/PanelShell.vue';
import PlaygroundHeader from './playground/PlaygroundHeader.vue';
import PreviewPane from './playground/PreviewPane.vue';

const {
  configSource,
  documentSource,
  error,
  html,
  isDark,
  outputCss,
  reset,
} = usePlayground();

watch(isDark, (value) => {
  document.documentElement.classList.toggle('dark', value);
}, { immediate: true });
</script>

<template>
  <main class="min-h-screen c-mc-neutral-900 bg-mc-neutral-50 dark:mc-lr-neutral">
    <PlaygroundHeader v-model:dark="isDark" @reset="reset" />

    <section class="playground-layout grid">
      <PreviewPane :source="documentSource" />

      <aside class="editor-pane border-l flex flex-col min-h-0 min-w-0 overflow-hidden c-mc-neutral-900 bg-mc-neutral-50 border-mc-neutral-200">
        <PanelShell title="HTML">
          <CodeEditor v-model="html" label="HTML editor" />
        </PanelShell>

        <PanelShell title="Config">
          <CodeEditor v-model="configSource" label="Config editor" />
        </PanelShell>

        <PanelShell title="Output CSS" default-collapsed>
          <CodeEditor :model-value="outputCss" label="Output CSS" read-only />
        </PanelShell>

        <p v-if="error" class="text-3 c-red-700 m-0 px-4 py-3 border-t border-red-200 bg-red-50 dark:c-red-200 dark:border-red-900 dark:bg-red-950">
          {{ error }}
        </p>
      </aside>
    </section>
  </main>
</template>

<style scoped>
.playground-layout {
  grid-template-columns: minmax(0, 1fr) minmax(380px, 46vw);
  height: calc(100vh - 3.25rem);
}

.editor-pane :deep(.panel-shell + .panel-shell) {
  border-top-width: 1px;
}

@media (width <=760px) {
  .playground-layout {
    grid-template-columns: minmax(0, 1fr);
    height: auto;
    min-height: calc(100vh - 3.25rem);
  }

  .playground-layout :deep(.preview-pane) {
    height: 18rem;
  }

  .editor-pane {
    min-height: 72rem;
    border-top: 1px solid rgb(229 229 229);
    border-left: 0;
  }

  .dark .editor-pane {
    border-top-color: rgb(38 38 38);
  }
}
</style>

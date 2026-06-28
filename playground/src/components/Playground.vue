<script setup lang="ts">
import { usePlayground } from '../composables/usePlayground';
import CodeEditor from './playground/CodeEditor.vue';
import PanelShell from './playground/PanelShell.vue';
import PlaygroundHeader from './playground/PlaygroundHeader.vue';
import PreviewPane from './playground/PreviewPane.vue';

const {
  configSource,
  customCss,
  documentSource,
  error,
  html,
  outputCss,
  reset,
} = usePlayground();
</script>

<template>
  <main class="c-neutral-900 bg-neutral-50 min-h-screen">
    <PlaygroundHeader @reset="reset" />

    <section class="playground-layout grid">
      <PreviewPane :source="documentSource" />

      <aside class="editor-pane c-neutral-900 border-l border-neutral-200 bg-white flex flex-col min-h-0 min-w-0 overflow-hidden">
        <PanelShell title="HTML">
          <CodeEditor v-model="html" label="HTML editor" />
        </PanelShell>

        <PanelShell title="Config">
          <CodeEditor v-model="configSource" label="Config editor" />
        </PanelShell>

        <PanelShell title="Custom CSS" default-collapsed>
          <CodeEditor v-model="customCss" label="Custom CSS editor" />
        </PanelShell>

        <PanelShell title="Output CSS" default-collapsed>
          <CodeEditor :model-value="outputCss" label="Output CSS" read-only />
        </PanelShell>

        <p v-if="error" class="text-3 c-red-700 m-0 px-4 py-3 border-t border-red-200 bg-red-50">
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
}
</style>

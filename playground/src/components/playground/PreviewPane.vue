<script setup lang="ts">
defineProps<{
  source: string
}>();
</script>

<template>
  <div class="preview-pane bg-white min-h-0 dark:bg-neutral-950">
    <iframe :key="source" :srcdoc="source" class="border-0 h-full w-full" title="Preview" />
  </div>
</template>

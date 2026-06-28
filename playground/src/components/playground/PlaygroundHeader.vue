<script setup lang="ts">
const emit = defineEmits<{
  (event: 'reset'): void
}>();
</script>

<template>
  <header class="playground-header px-4 border-b border-neutral-200 bg-white flex h-13 items-center justify-between">
    <div class="flex gap-3 items-center">
      <span class="bg-mc-primary-457 rounded-1 h-4 w-4" />
      <h1 class="text-4 font-600">
        unocss-preset-magicolor Playground
      </h1>
    </div>
    <button
      class="text-3.5 px-3 border border-neutral-300 rounded-1.5 bg-white h-8 hover:bg-neutral-100"
      type="button"
      @click="emit('reset')"
    >
      Reset
    </button>
  </header>
</template>

<style scoped>
@media (width <=760px) {
  .playground-header {
    gap: 0.75rem;
    height: auto;
    min-height: 3.25rem;
    padding-block: 0.625rem;
  }
}
</style>

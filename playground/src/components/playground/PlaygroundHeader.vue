<script setup lang="ts">
defineProps<{
  dark: boolean
}>();

const emit = defineEmits<{
  (event: 'update:dark', value: boolean): void
  (event: 'reset'): void
}>();
</script>

<template>
  <header class="playground-header px-4 border-b flex h-13 items-center justify-between c-mc-neutral-900 bg-mc-neutral-50 border-mc-neutral-200">
    <div class="flex gap-3 min-w-0 items-center">
      <span class="rounded-1 h-4 w-4 bg-mc-primary-457" />
      <h1 class="text-4 font-600 truncate c-mc-neutral-900">
        unocss-preset-magicolor Playground
      </h1>
    </div>
    <div class="flex shrink-0 gap-2 items-center">
      <button
        class="header-button text-3.5 px-3 border rounded-1.5 h-8 c-mc-neutral-900 bg-mc-neutral-50 border-mc-neutral-300 hover:bg-mc-neutral-100"
        type="button"
        :aria-pressed="dark"
        @click="emit('update:dark', !dark)"
      >
        {{ dark ? 'Light' : 'Dark' }}
      </button>
      <button
        class="header-button text-3.5 px-3 border rounded-1.5 h-8 c-mc-neutral-900 bg-mc-neutral-50 border-mc-neutral-300 hover:bg-mc-neutral-100"
        type="button"
        @click="emit('reset')"
      >
        Reset
      </button>
      <a
        class="header-button text-3.5 px-3 border rounded-1.5 no-underline flex h-8 items-center c-mc-neutral-900 bg-mc-neutral-50 border-mc-neutral-300 hover:bg-mc-neutral-100"
        href="https://github.com/nixwai/unocss-preset-magicolor"
        rel="noreferrer"
        target="_blank"
      >
        GitHub
      </a>
    </div>
  </header>
</template>

<style scoped>
.header-button {
  min-width: 4rem;
}

@media (width <=760px) {
  .playground-header {
    gap: 0.75rem;
    height: auto;
    min-height: 3.25rem;
    padding-block: 0.625rem;
  }
}
</style>

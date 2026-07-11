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
  <header class="playground-header px-4 border-b border-neutral-200 bg-white flex h-13 items-center justify-between dark:border-neutral-800 dark:bg-neutral-950">
    <div class="flex gap-3 min-w-0 items-center">
      <span class="rounded-1 h-4 w-4 bg-mc-primary-457" />
      <h1 class="text-4 font-600 truncate dark:c-neutral-100">
        unocss-preset-magicolor Playground
      </h1>
    </div>
    <div class="flex shrink-0 gap-2 items-center">
      <button
        class="header-button text-3.5 px-3 border border-neutral-300 rounded-1.5 bg-white h-8 dark:c-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        type="button"
        :aria-pressed="dark"
        @click="emit('update:dark', !dark)"
      >
        {{ dark ? 'Light' : 'Dark' }}
      </button>
      <button
        class="header-button text-3.5 px-3 border border-neutral-300 rounded-1.5 bg-white h-8 dark:c-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        type="button"
        @click="emit('reset')"
      >
        Reset
      </button>
      <a
        class="header-button text-3.5 c-neutral-900 px-3 border border-neutral-300 rounded-1.5 bg-white no-underline flex h-8 items-center dark:c-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800"
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

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  meta?: string
  title: string
  defaultCollapsed?: boolean
}>();

const collapsed = ref(props.defaultCollapsed || false);
</script>

<template>
  <section class="panel-shell border-neutral-200 flex flex-1 flex-col min-h-0" :class="{ 'is-collapsed': collapsed }">
    <button
      class="panel-title px-4 text-left border-b border-neutral-200 bg-neutral-50 flex h-10 w-full items-center justify-between"
      type="button"
      :aria-expanded="!collapsed"
      @click="collapsed = !collapsed"
    >
      <span class="flex gap-2 min-w-0 items-center">
        <span class="collapse-icon text-3 c-neutral-500">&gt;</span>
        <span class="text-3.5 c-neutral-700 font-600 truncate">
          {{ title }}
        </span>
      </span>
      <span v-if="meta" class="text-3 c-neutral-500 shrink-0">{{ meta }}</span>
    </button>
    <div v-show="!collapsed" class="flex flex-1 flex-col min-h-0">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.panel-title:hover {
  background: rgb(245 245 245);
}

.panel-shell {
  flex-basis: 0;
}

.is-collapsed {
  flex: 0 0 2.5rem;
}

.collapse-icon {
  transform: rotate(90deg);
  transition: transform 160ms ease;
}

.is-collapsed .collapse-icon {
  transform: rotate(0deg);
}
</style>

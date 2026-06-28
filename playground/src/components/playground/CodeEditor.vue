<script setup lang="ts">
const props = defineProps<{
  label: string
  modelValue: string
  readOnly?: boolean
}>();

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
}>();

function updateValue(event: Event) {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value);
}
</script>

<template>
  <pre
    v-if="props.readOnly"
    class="code-block text-3.5 c-neutral-700 line-height-6 font-mono m-0 p-4 bg-white flex-1 min-h-0 whitespace-pre overflow-auto"
  >{{ modelValue }}</pre>
  <textarea
    v-else
    :aria-label="label"
    class="code-block text-3.5 c-neutral-800 line-height-6 font-mono p-4 outline-none border-0 bg-white flex-1 min-h-0 resize-none whitespace-pre overflow-auto focus:bg-neutral-50"
    :value="modelValue"
    wrap="off"
    spellcheck="false"
    @input="updateValue"
  />
</template>

<style scoped>
.code-block {
  overflow-wrap: normal;
  tab-size: 2;
}
</style>

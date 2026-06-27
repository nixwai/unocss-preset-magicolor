<script setup lang="ts">
import { updateMagicColor } from '../../packages/presets/src/helper';

function toggleColor() {
  updateMagicColor({ name: 'primary', color: 'rgb(79 123 255)', dom: document.documentElement });
}
</script>

<template>
  <div class="flex flex-col h-100vh w-100vw items-center justify-center">
    <div class="mc-btn_oklch(0.1_0.2_122)-100">
      <button class="bg-mc-btn-640 hover:bg-mc-btn-550 px-8 py-4">
        <span class="c-mc-btn-200">
          Hello World!
        </span>
      </button>
    </div>
    <div>
      <button class="bg-mc-primary-457 px-8 py-4 c-mc-grape-160" @click="toggleColor">
        切换颜色
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { updateMagicColor } from '../../packages/presets/src/helper';

function toggleColor() {
  updateMagicColor({ name: 'primary', color: 'rgb(79 123 333)', dom: document.documentElement });
}
</script>

<template>
  <div class="flex flex-col h-100vh w-100vw items-center justify-center">
    <div class="mc-btn_oklch(0.1_0.2_122)-100">
      <button class="px-8 py-4 bg-mc-btn-640 hover:bg-mc-btn-550">
        <span class="c-mc-btn-200">
          Hello World!
        </span>
      </button>
    </div>
    <div>
      <button class="px-8 py-4 c-mc-primary-457" @click="toggleColor">
        切换颜色
      </button>
    </div>
  </div>
</template>

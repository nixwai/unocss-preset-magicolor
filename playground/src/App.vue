<script setup lang="ts">
import { updateMagicColor } from '../../packages/presets/src/helper';

function toggleColor() {
  updateMagicColor({ name: 'primary', color: 'rgb(79 123 333)', dom: document.documentElement });
}
</script>

<template>
  <div class="w-100vw h-100vh flex items-center justify-center flex-col">
    <div class="mc-btn_oklch(0.1_0.2_122)-100">
      <button class="px-8 py-4 hover:bg-mc-btn-550 bg-mc-btn-640">
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

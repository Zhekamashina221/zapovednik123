<template>
  <Teleport to="body">
    <Transition name="app-toast">
      <p v-if="toastMessage" aria-live="polite" class="app-toast" role="status">
        {{ toastMessage }}
      </p>
    </Transition>
  </Teleport>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const { toastMessage } = storeToRefs(ui)
</script>

<style lang="scss" scoped>
.app-toast {
  position: fixed;
  top: calc(#{$header-height} + 0.65rem + env(safe-area-inset-top, 0px));
  left: 50%;
  z-index: 4000;
  max-width: min(92vw, 28rem);
  margin: 0;
  padding: 0.65rem 1rem;
  border-radius: $radius;
  background: rgba($color-darker, 0.94);
  color: $color-surface;
  font-size: 0.92rem;
  font-weight: 500;
  line-height: 1.35;
  text-align: center;
  box-shadow: $shadow;
  transform: translateX(-50%);
  pointer-events: none;
}

.app-toast-enter-active,
.app-toast-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.app-toast-enter-from,
.app-toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -0.75rem);
}

.app-toast-enter-to,
.app-toast-leave-from {
  opacity: 1;
  transform: translate(-50%, 0);
}
</style>

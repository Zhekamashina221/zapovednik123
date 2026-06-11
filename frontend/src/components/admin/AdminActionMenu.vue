<template>
  <div ref="rootRef" class="action-menu">
    <button
      ref="triggerRef"
      :aria-expanded="open"
      :aria-label="ariaLabel"
      aria-haspopup="menu"
      class="app-btn app-btn--ghost action-menu__trigger"
      type="button"
      @click.stop="emit('toggle')"
    >
      <span aria-hidden="true" class="action-menu__trigger-icon">⋯</span>
    </button>
    <Teleport to="body">
      <div
        v-if="open"
        ref="panelRef"
        class="action-menu__panel action-menu__panel--floating card-surface"
        data-admin-action-menu-panel
        role="menu"
        :style="panelStyle"
        @click.stop
      >
        <slot />
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { nextTick, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  ariaLabel: { type: String, default: 'Действия' },
})

const emit = defineEmits(['toggle', 'close'])

const rootRef = ref(null)
const triggerRef = ref(null)
const panelRef = ref(null)
const panelStyle = ref({
  position: 'fixed',
  top: '0px',
  left: '0px',
  zIndex: 5000,
  visibility: 'hidden',
})

const GAP = 6
const VIEWPORT_MARGIN = 8

function updatePosition() {
  const trigger = triggerRef.value
  const panel = panelRef.value
  if (!trigger || !panel) return

  const rect = trigger.getBoundingClientRect()
  const panelWidth = panel.offsetWidth
  const panelHeight = panel.offsetHeight

  let top = rect.bottom + GAP
  let left = rect.right - panelWidth

  if (top + panelHeight > window.innerHeight - VIEWPORT_MARGIN) {
    top = rect.top - panelHeight - GAP
  }
  if (top < VIEWPORT_MARGIN) {
    top = VIEWPORT_MARGIN
  }

  left = Math.max(
    VIEWPORT_MARGIN,
    Math.min(left, window.innerWidth - panelWidth - VIEWPORT_MARGIN),
  )

  panelStyle.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    zIndex: 5000,
    visibility: 'visible',
  }
}

function onPointerDown(event) {
  if (!props.open) return
  const target = event.target
  if (rootRef.value?.contains(target) || panelRef.value?.contains(target)) return
  emit('close')
}

function onKeyDown(event) {
  if (props.open && event.key === 'Escape') {
    emit('close')
  }
}

function onLayoutChange() {
  if (props.open) updatePosition()
}

function bindGlobalListeners() {
  document.addEventListener('pointerdown', onPointerDown, true)
  document.addEventListener('keydown', onKeyDown)
  window.addEventListener('resize', onLayoutChange)
  window.addEventListener('scroll', onLayoutChange, true)
}

function unbindGlobalListeners() {
  document.removeEventListener('pointerdown', onPointerDown, true)
  document.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('resize', onLayoutChange)
  window.removeEventListener('scroll', onLayoutChange, true)
}

watch(
  () => props.open,
  async (isOpen) => {
    unbindGlobalListeners()

    if (!isOpen) {
      panelStyle.value = {
        position: 'fixed',
        top: '0px',
        left: '0px',
        zIndex: 5000,
        visibility: 'hidden',
      }
      return
    }

    panelStyle.value = {
      position: 'fixed',
      top: '0px',
      left: '0px',
      zIndex: 5000,
      visibility: 'hidden',
    }

    await nextTick()
    updatePosition()
    await nextTick()
    updatePosition()

    requestAnimationFrame(() => {
      if (props.open) bindGlobalListeners()
    })
  },
)

onUnmounted(() => {
  unbindGlobalListeners()
})
</script>

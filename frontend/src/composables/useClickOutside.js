import { onMounted, onUnmounted, watch } from 'vue'

/**
 * @param {import('vue').Ref<HTMLElement|null>} targetRef
 * @param {() => void} onOutside
 * @param {{ active?: import('vue').Ref<boolean>|(() => boolean) }} [options]
 */
export function useClickOutside(targetRef, onOutside, options = {}) {
  function isActive() {
    const active = options.active
    if (active == null) return true
    return typeof active === 'function' ? active() : active.value
  }

  function onPointerDown(event) {
    if (!isActive()) return
    if (targetRef.value?.contains(event.target)) return
    onOutside()
  }

  function bind() {
    document.addEventListener('pointerdown', onPointerDown, true)
  }

  function unbind() {
    document.removeEventListener('pointerdown', onPointerDown, true)
  }

  if (options.active != null && typeof options.active !== 'function') {
    watch(options.active, (open) => {
      unbind()
      if (open) bind()
    })
  } else {
    onMounted(bind)
  }

  onUnmounted(unbind)
}

import { onMounted, onBeforeUnmount } from 'vue'

/** Синхронизирует --viewport-height с реальной высотой экрана (адресная строка iOS/Android). */
export function useVisualViewportHeight() {
  let raf = 0

  const update = () => {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => {
      const h = window.visualViewport?.height ?? window.innerHeight
      document.documentElement.style.setProperty('--viewport-height', `${Math.round(h)}px`)
    })
  }

  onMounted(() => {
    update()
    window.visualViewport?.addEventListener('resize', update)
    window.visualViewport?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
  })

  onBeforeUnmount(() => {
    cancelAnimationFrame(raf)
    window.visualViewport?.removeEventListener('resize', update)
    window.visualViewport?.removeEventListener('scroll', update)
    window.removeEventListener('resize', update)
    window.removeEventListener('orientationchange', update)
  })
}

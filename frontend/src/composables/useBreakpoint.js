import { onBeforeUnmount, onMounted, ref } from 'vue'

export function useBreakpoint(query) {
  const matches = ref(false)
  let mediaQuery = null

  const sync = () => {
    matches.value = Boolean(mediaQuery?.matches)
  }

  onMounted(() => {
    mediaQuery = window.matchMedia(query)
    sync()
    mediaQuery.addEventListener('change', sync)
  })

  onBeforeUnmount(() => {
    mediaQuery?.removeEventListener('change', sync)
  })

  return matches
}

export function useMobileMapLayout() {
  return useBreakpoint('(max-width: 768px)')
}

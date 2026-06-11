import { useUiStore } from '@/stores/ui'
import { buildReservePublicUrl } from '@/lib/publicUrls.js'

export function useShareLink() {
  const ui = useUiStore()

  async function copyLink(url) {
    const text = String(url || '').trim()
    if (!text) {
      ui.showToast('Ссылка недоступна')
      return false
    }
    try {
      await navigator.clipboard.writeText(text)
      ui.showToast('Ссылка скопирована')
      return true
    } catch {
      ui.showToast('Не удалось скопировать ссылку')
      return false
    }
  }

  async function shareReserve(reserve) {
    const id = reserve?.id
    if (id == null) {
      ui.showToast('Объект не загружен')
      return false
    }

    const url = buildReservePublicUrl(id)
    const title = reserve?.name ? String(reserve.name).trim() : 'Объект природного наследия'
    const text = 'Посмотрите объект на карте природного наследия Беларуси'

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url })
        return true
      } catch (err) {
        if (err?.name === 'AbortError') return false
      }
    }

    return copyLink(url)
  }

  return { copyLink, shareReserve }
}

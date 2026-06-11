<template>
  <Teleport to="body">
    <div
      v-if="open"
      aria-labelledby="reserve-qr-title"
      aria-modal="true"
      class="reserve-qr-modal"
      role="dialog"
      @click.self="emit('close')"
    >
      <div class="reserve-qr-modal__panel card-surface" @click.stop>
        <h2 id="reserve-qr-title" class="reserve-qr-modal__title">QR для стенда</h2>
        <p v-if="reserveName" class="reserve-qr-modal__name">{{ reserveName }}</p>

        <p v-if="!isPublicSiteUrlConfigured()" class="reserve-qr-modal__warn">
          Укажите боевой домен в <code>VITE_PUBLIC_SITE_URL</code> (файл <code>.env</code>), иначе
          QR будет вести на {{ getPublicSiteBase() || 'текущий хост' }}.
        </p>

        <p v-if="!isPublished" class="reserve-qr-modal__warn">
          Объект не опубликован — гости по ссылке увидят «не найден».
        </p>

        <p class="reserve-qr-modal__url">{{ publicUrl }}</p>

        <p v-if="qrError" class="reserve-qr-modal__error">{{ qrError }}</p>
        <div v-else class="reserve-qr-modal__qr-wrap">
          <img
            v-if="qrDataUrl"
            :src="qrDataUrl"
            alt=""
            class="reserve-qr-modal__qr"
            height="280"
            width="280"
          />
          <p v-else class="reserve-qr-modal__loading">Генерация QR…</p>
        </div>

        <div class="reserve-qr-modal__actions">
          <button class="app-btn app-btn--secondary" type="button" @click="onCopyLink">
            Скопировать ссылку
          </button>
          <button
            :disabled="!qrDataUrl"
            class="app-btn app-btn--primary"
            type="button"
            @click="onDownload"
          >
            Скачать PNG
          </button>
          <button class="app-btn app-btn--ghost" type="button" @click="emit('close')">
            Закрыть
          </button>
        </div>

        <p class="reserve-qr-modal__hint">
          Распечатайте PNG и разместите на информационном стенде объекта.
        </p>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import QRCode from 'qrcode'
import {
  buildReservePublicUrl,
  getPublicSiteBase,
  isPublicSiteUrlConfigured,
} from '@/lib/publicUrls.js'
import { useShareLink } from '@/composables/useShareLink.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  reserveId: { type: [Number, String], default: null },
  reserveName: { type: String, default: '' },
  isPublished: { type: Boolean, default: true },
})

const emit = defineEmits(['close'])

const { copyLink } = useShareLink()

const publicUrl = ref('')
const qrDataUrl = ref('')
const qrError = ref('')

const QR_PREVIEW_SIZE = 280
const QR_DOWNLOAD_SIZE = 512

async function generateQr() {
  qrDataUrl.value = ''
  qrError.value = ''
  const id = props.reserveId
  if (id == null) {
    qrError.value = 'Не указан объект'
    return
  }

  publicUrl.value = buildReservePublicUrl(id, { fromQr: true })

  try {
    qrDataUrl.value = await QRCode.toDataURL(publicUrl.value, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: QR_PREVIEW_SIZE,
    })
  } catch {
    qrError.value = 'Не удалось сгенерировать QR-код'
  }
}

async function onDownload() {
  if (!publicUrl.value) return
  try {
    const dataUrl = await QRCode.toDataURL(publicUrl.value, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: QR_DOWNLOAD_SIZE,
    })
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `zapovednik-reserve-${props.reserveId}.png`
    link.click()
  } catch {
    qrError.value = 'Не удалось подготовить файл для скачивания'
  }
}

function onCopyLink() {
  copyLink(publicUrl.value || buildReservePublicUrl(props.reserveId))
}

function handleEscape(e) {
  if (e.key === 'Escape') emit('close')
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      generateQr()
      document.addEventListener('keydown', handleEscape)
    } else {
      document.removeEventListener('keydown', handleEscape)
      qrDataUrl.value = ''
      qrError.value = ''
    }
  },
)

watch(
  () => props.reserveId,
  () => {
    if (props.open) generateQr()
  },
)
</script>

<style lang="scss" scoped>
.reserve-qr-modal {
  position: fixed;
  inset: 0;
  z-index: 10050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
}

.reserve-qr-modal__panel {
  width: min(100%, 400px);
  padding: 22px 20px 18px;
  border-radius: 16px;
}

.reserve-qr-modal__title {
  margin: 0 0 6px;
  font-size: 1.15rem;
  font-weight: 700;
  color: $color-darker;
}

.reserve-qr-modal__name {
  margin: 0 0 12px;
  font-size: 0.92rem;
  font-weight: 600;
  color: $color-text;
  line-height: 1.35;
}

.reserve-qr-modal__warn {
  margin: 0 0 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #fff4d9;
  color: #b8860b;
  font-size: 0.82rem;
  line-height: 1.4;

  code {
    font-size: 0.78rem;
  }
}

.reserve-qr-modal__url {
  margin: 0 0 14px;
  font-size: 0.78rem;
  color: $color-text-light;
  word-break: break-all;
  line-height: 1.4;
}

.reserve-qr-modal__qr-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 280px;
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 12px;
  background: $background;
  border: 1px solid #e6e7e9;
}

.reserve-qr-modal__qr {
  display: block;
  border-radius: 8px;
}

.reserve-qr-modal__loading {
  margin: 0;
  font-size: 0.88rem;
  color: $color-text-light;
}

.reserve-qr-modal__error {
  margin: 0 0 12px;
  font-size: 0.88rem;
  color: $color-danger-dark;
}

.reserve-qr-modal__actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reserve-qr-modal__hint {
  margin: 12px 0 0;
  font-size: 0.78rem;
  color: $color-text-light;
  line-height: 1.4;
  text-align: center;
}
</style>

<template>
  <section class="reserve-photos">
    <h3 class="form-section__title">Фотографии</h3>
    <p class="reserve-photos__hint">
      JPEG, PNG, WebP или GIF, до 10 МБ каждый. На сервере сохраняются как WebP (до 1920 px).
      Можно выбрать несколько файлов.
    </p>

    <div v-if="photoError" class="admin-error reserve-photos__error" role="alert">
      {{ photoError }}
    </div>

    <div v-if="displayItems.length" class="reserve-photos__grid">
      <figure v-for="item in displayItems" :key="item.key" class="reserve-photos__item">
        <img :alt="item.alt" :src="item.src" class="reserve-photos__img" loading="lazy" />
        <button
          :aria-label="`Удалить фото ${item.label}`"
          :disabled="item.removing || uploading"
          class="reserve-photos__remove"
          type="button"
          @click="removeItem(item)"
        >
          ×
        </button>
      </figure>
    </div>

    <p v-else class="reserve-photos__empty">Фото пока нет</p>

    <label class="reserve-photos__upload app-btn app-btn--ghost">
      <input
        ref="fileInputRef"
        accept="image/jpeg,image/png,image/webp,image/gif"
        class="reserve-photos__file-input"
        multiple
        type="file"
        @change="onFilesSelected"
      />
      {{ uploading ? 'Загрузка…' : 'Добавить фото' }}
    </label>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import api from '@/services/api'

const props = defineProps({
  reserveId: { type: [Number, null], default: null },
  photos: { type: Array, default: () => [] },
  pendingFiles: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:photos', 'update:pendingFiles'])

const fileInputRef = ref(null)
const photoError = ref('')
const uploading = ref(false)
const removingIds = ref(new Set())
const pendingPreviewUrls = ref(new Map())

const displayItems = computed(() => {
  const items = []

  for (const photo of props.photos) {
    items.push({
      key: `saved-${photo.id}`,
      kind: 'saved',
      id: photo.id,
      src: photo.url,
      alt: `Фото объекта ${photo.id}`,
      label: String(photo.id),
      removing: removingIds.value.has(photo.id),
    })
  }

  for (const file of props.pendingFiles) {
    const key = `pending-${file.name}-${file.size}-${file.lastModified}`
    let src = pendingPreviewUrls.value.get(file)
    if (!src) {
      src = URL.createObjectURL(file)
      pendingPreviewUrls.value.set(file, src)
    }
    items.push({
      key,
      kind: 'pending',
      file,
      src,
      alt: file.name,
      label: file.name,
      removing: false,
    })
  }

  return items
})

function revokePendingPreviews() {
  for (const url of pendingPreviewUrls.value.values()) {
    URL.revokeObjectURL(url)
  }
  pendingPreviewUrls.value.clear()
}

watch(
  () => props.pendingFiles,
  (next, prev) => {
    const removed = (prev || []).filter((f) => !(next || []).includes(f))
    for (const file of removed) {
      const url = pendingPreviewUrls.value.get(file)
      if (url) {
        URL.revokeObjectURL(url)
        pendingPreviewUrls.value.delete(file)
      }
    }
  },
)

watch(
  () => props.reserveId,
  () => {
    photoError.value = ''
  },
)

function setPhotos(list) {
  emit('update:photos', list)
}

function setPendingFiles(list) {
  emit('update:pendingFiles', list)
}

async function onFilesSelected(event) {
  const input = event.target
  const files = Array.from(input.files || [])
  input.value = ''
  if (!files.length) return

  photoError.value = ''

  if (props.reserveId) {
    await uploadToServer(props.reserveId, files)
    return
  }

  setPendingFiles([...props.pendingFiles, ...files])
}

async function uploadToServer(reserveId, files) {
  uploading.value = true
  photoError.value = ''
  try {
    const formData = new FormData()
    for (const file of files) {
      formData.append('photos', file)
    }
    const res = await api.postAdminReservePhotos(reserveId, formData)
    const uploaded = res.data?.data?.photos || []
    const partialErrors = res.data?.data?.errors
    if (uploaded.length) {
      setPhotos([...props.photos, ...uploaded])
    }
    if (partialErrors?.length) {
      photoError.value = partialErrors.map((e) => `${e.name}: ${e.error}`).join('; ')
    }
  } catch (err) {
    photoError.value = err.response?.data?.error || 'Не удалось загрузить фото'
  } finally {
    uploading.value = false
  }
}

async function removeItem(item) {
  photoError.value = ''

  if (item.kind === 'pending') {
    const removed = item.file
    const next = props.pendingFiles.filter((f) => f !== removed)
    const url = pendingPreviewUrls.value.get(removed)
    if (url) {
      URL.revokeObjectURL(url)
      pendingPreviewUrls.value.delete(removed)
    }
    setPendingFiles(next)
    return
  }

  if (!props.reserveId) return

  removingIds.value.add(item.id)
  try {
    await api.deleteAdminReservePhoto(props.reserveId, item.id)
    setPhotos(props.photos.filter((p) => p.id !== item.id))
  } catch (err) {
    photoError.value = err.response?.data?.error || 'Не удалось удалить фото'
  } finally {
    removingIds.value.delete(item.id)
  }
}

async function uploadPending(reserveId) {
  if (!props.pendingFiles.length) return true
  await uploadToServer(reserveId, [...props.pendingFiles])
  const ok = !photoError.value
  if (ok) {
    setPendingFiles([])
    revokePendingPreviews()
  }
  return ok
}

defineExpose({ uploadPending, revokePendingPreviews })

onBeforeUnmount(() => {
  revokePendingPreviews()
})
</script>

<style scoped lang="scss">
.reserve-photos {
  display: grid;
  gap: 10px;
}

.reserve-photos__hint {
  margin: 0;
  font-size: 0.85rem;
  color: #667085;
}

.reserve-photos__error {
  margin: 0;
}

.reserve-photos__empty {
  margin: 0;
  font-size: 0.9rem;
  color: #98a2b3;
}

.reserve-photos__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 10px;
}

.reserve-photos__item {
  position: relative;
  margin: 0;
  border-radius: 10px;
  overflow: hidden;
  aspect-ratio: 4 / 3;
  background: #f2f4f7;
}

.reserve-photos__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.reserve-photos__remove {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: rgba(16, 24, 40, 0.72);
  color: #fff;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.reserve-photos__upload {
  justify-self: start;
  cursor: pointer;
}

.reserve-photos__file-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}
</style>

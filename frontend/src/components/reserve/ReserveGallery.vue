<template>
  <section
    v-if="photos.length"
    :class="[
      'reserve__gallery',
      {
        'reserve__gallery--hero': layout === 'hero',
        'reserve__gallery--card': layout === 'card',
      },
    ]"
  >
    <div
      ref="sliderRef"
      class="reserve__slider-wrapper"
      @touchcancel="onTouchEnd"
      @touchend="onTouchEnd"
      @touchmove="onTouchMove"
      @touchstart.passive="onTouchStart"
    >
      <div class="reserve__slider">
        <img
          v-for="(photo, i) in photos"
          v-show="isVisibleSlide(i)"
          :key="i"
          :alt="`${name} — фото ${i + 1}`"
          :class="{ active: i === currentSlide }"
          :src="photo"
          class="reserve__photo"
          loading="lazy"
        />
      </div>
      <button
        v-if="showDefaultNav"
        :disabled="currentSlide === 0"
        aria-label="Предыдущее фото"
        class="slider-btn prev"
        type="button"
        @click="prevSlide"
      >
        <i aria-hidden="true" class="bi bi-chevron-left"></i>
      </button>
      <button
        v-if="showDefaultNav"
        :disabled="currentSlide === photos.length - 1"
        aria-label="Следующее фото"
        class="slider-btn next"
        type="button"
        @click="nextSlide"
      >
        <i aria-hidden="true" class="bi bi-chevron-right"></i>
      </button>
      <button
        v-if="showOverlayNav"
        :disabled="currentSlide === 0"
        aria-label="Предыдущее фото"
        class="slider-btn prev slider-btn--overlay"
        type="button"
        @click="prevSlide"
      >
        <i aria-hidden="true" class="bi bi-chevron-left"></i>
      </button>
      <button
        v-if="showOverlayNav"
        :disabled="currentSlide === photos.length - 1"
        aria-label="Следующее фото"
        class="slider-btn next slider-btn--overlay"
        type="button"
        @click="nextSlide"
      >
        <i aria-hidden="true" class="bi bi-chevron-right"></i>
      </button>
      <div
        v-if="layout === 'hero' && photos.length > 1"
        class="reserve__hero-dots"
        role="tablist"
        :aria-label="`Фото, ${photos.length}`"
      >
        <button
          v-for="(photo, i) in photos"
          :key="i"
          :aria-current="i === currentSlide ? 'true' : 'false'"
          :aria-label="`Фото ${i + 1}`"
          :class="{ active: i === currentSlide }"
          class="reserve__hero-dot"
          type="button"
          @click="currentSlide = i"
        />
      </div>
      <div v-else-if="showDefaultNav" class="reserve__dots">
        <button
          v-for="(photo, i) in photos"
          :key="i"
          :aria-current="i === currentSlide ? 'true' : 'false'"
          :aria-label="`Показать фото ${i + 1}`"
          :class="{ active: i === currentSlide }"
          class="dot"
          type="button"
          @click="currentSlide = i"
        />
      </div>
    </div>
    <div
      v-if="layout !== 'hero' && photos.length > 1"
      ref="thumbsRef"
      :class="['reserve__thumbnails', { 'reserve__thumbnails--scroll': layout === 'card' }]"
    >
      <button
        v-for="(photo, i) in photos"
        :key="i"
        :ref="(el) => setThumbRef(el, i)"
        :aria-label="`Миниатюра ${i + 1}`"
        :class="{ active: i === currentSlide }"
        class="thumb-btn"
        type="button"
        @click="currentSlide = i"
      >
        <img :alt="`Миниатюра ${i + 1}`" :src="photo" class="thumb" loading="lazy" />
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'

const props = defineProps({
  photos: { type: Array, default: () => [] },
  name: { type: String, required: true },
  layout: { type: String, default: 'default' },
})

const currentSlide = ref(0)
const sliderRef = ref(null)
const thumbsRef = ref(null)
const thumbRefs = ref([])

const touchStartX = ref(0)
const touchDeltaX = ref(0)

const showDefaultNav = computed(() => props.layout === 'default')
const showOverlayNav = computed(
  () => (props.layout === 'hero' || props.layout === 'card') && props.photos.length > 1,
)

watch(
  () => props.photos,
  () => {
    currentSlide.value = 0
    thumbRefs.value = []
  },
)

watch(currentSlide, async () => {
  await nextTick()
  thumbRefs.value[currentSlide.value]?.scrollIntoView?.({
    behavior: 'smooth',
    inline: 'center',
    block: 'nearest',
  })
})

const isVisibleSlide = (index) => Math.abs(index - currentSlide.value) <= 1

const prevSlide = () => {
  currentSlide.value = Math.max(0, currentSlide.value - 1)
}

const nextSlide = () => {
  currentSlide.value = Math.min(props.photos.length - 1, currentSlide.value + 1)
}

function setThumbRef(el, index) {
  if (el) thumbRefs.value[index] = el
}

function onTouchStart(event) {
  if (props.photos.length <= 1) return
  touchStartX.value = event.touches[0]?.clientX ?? 0
  touchDeltaX.value = 0
}

function onTouchMove(event) {
  if (props.photos.length <= 1) return
  const x = event.touches[0]?.clientX ?? 0
  touchDeltaX.value = x - touchStartX.value
}

function onTouchEnd() {
  if (props.photos.length <= 1) return
  const threshold = 48
  if (touchDeltaX.value <= -threshold) nextSlide()
  else if (touchDeltaX.value >= threshold) prevSlide()
  touchDeltaX.value = 0
}
</script>

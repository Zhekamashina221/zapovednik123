<template>
  <RouterLink :to="`/marshruty/${route.slug}`" class="curated-route-card card-surface">
    <div class="curated-route-card__media">
      <div v-if="!route.coverPhotoUrl" class="curated-route-card__fallback">Нет фото</div>
      <img
        v-else
        :src="route.coverPhotoUrl"
        alt=""
        class="curated-route-card__img"
        loading="lazy"
        @error="onImageError"
      />
    </div>

    <div class="curated-route-card__body">
      <h2 class="curated-route-card__title">{{ route.title }}</h2>
      <p class="curated-route-card__teaser">{{ route.teaser || '—' }}</p>

      <ul class="curated-route-card__meta">
        <li v-if="route.regionLabel">
          <i aria-hidden="true" class="bi bi-geo-alt-fill curated-route-card__meta-ic"></i>
          {{ route.regionLabel }}
        </li>
        <li>
          <i
            :class="['bi', profileIconClass, 'curated-route-card__meta-ic']"
            aria-hidden="true"
          ></i>
          {{ profileLabel(route.profile) }}
        </li>
        <li>
          <i aria-hidden="true" class="bi bi-list-ul curated-route-card__meta-ic"></i>
          {{ reserveCount }} {{ objectsLabel }}
        </li>
        <li v-if="route.listDistance || route.listDuration" class="curated-route-card__meta--split">
          <template v-if="route.listDistance">
            <i aria-hidden="true" class="bi bi-arrows curated-route-card__meta-ic"></i>
            <span>{{ route.listDistance }}</span>
          </template>
          <template v-if="route.listDistance && route.listDuration">
            <span aria-hidden="true" class="curated-route-card__meta-sep">·</span>
          </template>
          <template v-if="route.listDuration">
            <i aria-hidden="true" class="bi bi-clock curated-route-card__meta-ic"></i>
            <span>{{ route.listDuration }}</span>
          </template>
        </li>
      </ul>

      <span class="curated-route-card__cta">Подробнее о маршруте →</span>
    </div>
  </RouterLink>
</template>

<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { profileLabel, difficultyLabel } from '@/data/curatedRoutes.js'

const props = defineProps({
  route: {
    type: Object,
    required: true,
  },
})

const imageFailed = ref(false)

const reserveCount = computed(() => (props.route.reserveIds || []).length)

const profileIconClass = computed(() =>
  props.route.profile === 'foot-walking' ? 'bi-person-walking' : 'bi-car-front-fill',
)

const objectsLabel = computed(() => {
  const n = reserveCount.value
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'объект'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'объекта'
  return 'объектов'
})

function onImageError(e) {
  imageFailed.value = true
  e.target.style.display = 'none'
}
</script>

<style lang="scss" scoped>
.curated-route-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  text-decoration: none;
  color: inherit;
  border-radius: 16px;
  overflow: hidden;
  transition:
    box-shadow 0.2s ease,
    border-color 0.2s ease;

  &:hover {
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.12);
    border-color: #2e8b57;

    .curated-route-card__cta {
      color: #1f6b42;
    }
  }
}

.curated-route-card__media {
  position: relative;
  aspect-ratio: 16 / 10;
  background: #e8f0ec;
  overflow: hidden;
}

.curated-route-card__fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 0.88rem;
  font-weight: 600;
  color: #667085;
}

.curated-route-card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.curated-route-card__badge {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  font-size: 0.75rem;
  font-weight: 700;
  color: #1f6b42;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.curated-route-card__body {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 8px;
  padding: 16px 18px 18px;
}

.curated-route-card__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.3;
  color: #1f2937;
}

.curated-route-card__teaser {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.45;
  color: #475467;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.curated-route-card__meta {
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.82rem;
  color: #667085;
  line-height: 1.5;

  li {
    display: flex;
    align-items: flex-start;
    gap: 6px;
  }

  li + li {
    margin-top: 4px;
  }
}

.curated-route-card__meta--split {
  flex-wrap: wrap;
  align-items: center;
}

.curated-route-card__meta-sep {
  margin: 0 2px;
  color: #98a2b3;
}

.curated-route-card__meta-ic {
  flex-shrink: 0;
  font-size: 0.9rem;
  line-height: 1;
  margin-top: 1px;
  color: #94a3b8;
}

.curated-route-card__cta {
  margin-top: 4px;
  font-size: 0.88rem;
  font-weight: 600;
  color: #2e8b57;
  transition: color 0.15s ease;
}
</style>

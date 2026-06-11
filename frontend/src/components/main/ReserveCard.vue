<template>
  <router-link :style="{ '--type': typeColor }" :to="`/reserve/${reserve.id}`" class="reserve-card">
    <div class="card-media">
      <div class="card-media__fallback">Нет фото</div>
      <img
        v-if="reserve.photos?.[0]"
        :src="reserve.photos[0]"
        alt=""
        class="card-media__img"
        @error="onImageError"
      />

      <div v-if="hasMetrics" class="card-media__metrics">
        <span v-if="hasViews" class="metric-badge">
          <i aria-hidden="true" class="bi bi-eye"></i>
          {{ reserve.views_count }}
        </span>
        <span v-if="hasRating" class="metric-badge rating">
          <i aria-hidden="true" class="bi bi-star-fill"></i>
          {{ avgRatingText }}
        </span>
      </div>

      <div aria-hidden="true" class="card-media__shade" />
    </div>

    <div class="card-body">
      <div class="card-body__type">
        <span aria-hidden="true" class="card-body__type-dot" />
        <span class="card-body__type-text">{{ typeLabel }}</span>
      </div>

      <div class="card-body__head">
        <h3 class="card-title">{{ reserve.name }}</h3>
        <span aria-hidden="true" class="card-chevron">
          <i aria-hidden="true" class="bi bi-chevron-right"></i>
        </span>
      </div>
      <p v-if="locationLine" class="card-meta">{{ locationLine }}</p>
    </div>
  </router-link>
</template>

<script setup>
import { computed } from 'vue'
import { getTypeConfig } from '@/config/reserveTypes'
const props = defineProps(['reserve'])

const typeConfig = computed(() => getTypeConfig(props.reserve?.type || ''))
const typeColor = computed(() => typeConfig.value.color || '#757575')
const typeLabel = computed(() => typeConfig.value.label || props.reserve?.type || 'Объект')

const hasViews = computed(() => Number(props.reserve?.views_count || 0) > 0)

const avgRatingNumber = computed(() => {
  const parsed = Number(props.reserve?.avg_rating)
  return Number.isFinite(parsed) ? parsed : null
})

const hasRating = computed(
  () =>
    Number(props.reserve?.reviews_count || 0) > 0 &&
    avgRatingNumber.value !== null &&
    avgRatingNumber.value > 0,
)

const avgRatingText = computed(() =>
  avgRatingNumber.value === null ? '—' : avgRatingNumber.value.toFixed(1),
)

const hasMetrics = computed(() => hasViews.value || hasRating.value)

const locationLine = computed(() => {
  const r = String(props.reserve?.region || '').trim()
  const d = String(props.reserve?.district || '').trim()
  if (r && d) return `${r} · ${d}`
  return r || d || ''
})

const onImageError = (e) => {
  e.target.style.display = 'none'
}
</script>

<style lang="scss" scoped>
.bi-star-fill {
  color: #f5b942;
}

.reserve-card {
  --type: #757575;
  display: flex;
  flex-direction: column;
  height: 100%;
  border-radius: 20px;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  background: $color-surface;
  border: 1px solid #e8eaef;
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    0 12px 28px rgba(15, 23, 42, 0.07);
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    border-color 0.22s ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow:
      0 2px 4px rgba(15, 23, 42, 0.05),
      0 20px 40px rgba(15, 23, 42, 0.1);
    border-color: #d0d5dd;

    .card-media__img {
      transform: scale(1.05);
    }

    .card-chevron {
      color: var(--type);
      transform: translateX(3px);
    }
  }

  &:focus-visible {
    outline: 2px solid var(--type);
    outline-offset: 2px;
  }

  @supports (color: color-mix(in srgb, red, blue)) {
    border-color: color-mix(in srgb, var(--type) 18%, #e8eaef);

    &:hover {
      border-color: color-mix(in srgb, var(--type) 35%, #d8dce6);
    }
  }
}

.card-media {
  position: relative;
  aspect-ratio: 5 / 3;
  background: linear-gradient(145deg, #eef1f6 0%, #e2e6ee 100%);
  overflow: hidden;
}

.card-media__fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  font-weight: 500;
  color: #98a2b3;
  z-index: 0;
}

.card-media__img {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.card-media__metrics {
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  z-index: 4;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  pointer-events: none;
}

.metric-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(15, 23, 42, 0.14);
  font-size: 0.78rem;
  font-weight: 700;
  color: #1f2937;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.12);
}

.metric-badge .bi {
  font-size: 0.85rem;
  line-height: 1;
}

.card-media__shade {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0) 40%, rgba(15, 23, 42, 0.55) 100%);
}

.card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0.85rem 1rem 1rem;
  border-top: 3px solid var(--type);
  background: linear-gradient(180deg, #fff 0%, #fafbfd 100%);
}

.card-body__type {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  max-width: 100%;
  margin-bottom: 0.55rem;
  padding: 5px 11px 5px 9px;
  border-radius: 10px;
  background: #f2f4f7;
  border: 1px solid #e8ecf1;
  box-shadow: none;
}

.card-body__type-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--type);
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.05);
}

.card-body__type-text {
  font-size: 0.56rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #344054;
  line-height: 1.25;
  min-width: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@supports (color: color-mix(in srgb, red, blue)) {
  .card-body__type {
    background: color-mix(in srgb, var(--type) 11%, #fff);
    border-color: color-mix(in srgb, var(--type) 22%, #e4e7ec);
  }

  .card-body__type-dot {
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--type) 28%, transparent);
  }
}

.card-body__head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.card-title {
  margin: 0;
  flex: 1;
  min-width: 0;
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: -0.02em;
  color: #101828;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-chevron {
  flex-shrink: 0;
  margin-top: 2px;
  color: #98a2b3;
  display: flex;
  transition:
    color 0.2s ease,
    transform 0.2s ease;
}

.card-chevron .bi {
  font-size: 1.1rem;
  line-height: 1;
}

.card-meta {
  margin: 0.35rem 0 0;
  font-size: 0.8rem;
  color: #667085;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>

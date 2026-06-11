<template>
  <article v-if="!loading && reserve" class="reserve">
    <div class="reserve__layout">
      <div class="reserve__mobile">
        <div :class="['reserve__top', { 'reserve__top--no-photo': !hasPhotos }]">
          <ReserveGallery
            v-if="hasPhotos"
            :name="reserve.name"
            :photos="reserve.photos || []"
            layout="hero"
          />

          <nav aria-label="Действия" class="reserve__hero-nav">
            <button
              class="reserve-back reserve-back--listing reserve__hero-nav-btn"
              type="button"
              @click="goBack"
            >
              <i aria-hidden="true" class="bi bi-arrow-left reserve-back__icon"></i>
              Назад
            </button>
          </nav>
          <div v-if="hasPhotos && (viewsCount > 0 || displayRating)" class="reserve__hero-stats">
            <span v-if="viewsCount > 0" class="reserve__hero-stat">
              <i aria-hidden="true" class="bi bi-eye reserve__hero-stat-icon"></i>
              {{ viewsCount }}
            </span>
            <span v-if="displayRating" class="reserve__hero-stat reserve__hero-stat--rating">
              <i aria-hidden="true" class="bi bi-star-fill reserve__hero-stat-icon"></i>
              {{ displayRating }}
            </span>
          </div>
        </div>

        <div class="reserve__sheet">
          <div class="container reserve__sheet-inner">
            <header class="reserve-mobile-intro">
              <span
                :style="{
                  '--type-color': typeColor,
                  backgroundColor: `${typeColor}18`,
                  color: typeColor,
                }"
                class="reserve-mobile-intro__type"
              >
                <span aria-hidden="true" class="reserve-mobile-intro__type-dot" />
                {{ typeLabelUpper }}
              </span>
              <h1 class="reserve-mobile-intro__title">{{ reserve.name }}</h1>
              <p v-if="locationLine" class="reserve-mobile-intro__location">
                <i class="bi bi-geo-alt"></i>
                {{ locationLine }}
              </p>

              <div aria-label="Быстрые действия" class="reserve-mobile-actions" role="group">
                <button
                  v-if="reserve.latitude && reserve.longitude"
                  class="reserve-mobile-actions__item"
                  type="button"
                  @click="onMobileRoute"
                >
                  <span aria-hidden="true" class="reserve-mobile-actions__icon">
                    <i class="bi bi-car-front-fill"></i>
                  </span>
                  <span class="reserve-mobile-actions__label">Маршрут</span>
                </button>
                <button
                  :class="{ 'reserve-mobile-actions__item--active': isFavorite }"
                  :disabled="favoriteLoading"
                  class="reserve-mobile-actions__item"
                  type="button"
                  @click="onToggleFavorite"
                >
                  <span aria-hidden="true" class="reserve-mobile-actions__icon">
                    <i
                      :class="['bi', isFavorite ? 'bi-heart-fill' : 'bi-heart']"
                      aria-hidden="true"
                    ></i>
                  </span>
                  <span class="reserve-mobile-actions__label">{{
                    isFavorite ? 'В избранном' : 'В избранное'
                  }}</span>
                </button>
                <button class="reserve-mobile-actions__item" type="button" @click="onShareReserve">
                  <span aria-hidden="true" class="reserve-mobile-actions__icon">
                    <i class="bi bi-share-fill"></i>
                  </span>
                  <span class="reserve-mobile-actions__label">Поделиться</span>
                </button>
              </div>
            </header>
          </div>
        </div>
      </div>

      <div class="container reserve__desktop">
        <button class="reserve-back reserve-back--listing" type="button" @click="goBack">
          <i aria-hidden="true" class="bi bi-arrow-left reserve-back__icon"></i>
          Назад
        </button>

        <div class="reserve__desktop-hero">
          <div class="reserve__desktop-col">
            <div class="reserve__desktop-media">
              <ReserveGallery
                v-if="hasPhotos"
                :name="reserve.name"
                :photos="reserve.photos || []"
                class="reserve__desktop-gallery"
                layout="card"
              />
              <div v-else aria-hidden="true" class="reserve__desktop-media-placeholder">
                <i class="bi bi-image"></i>
              </div>
            </div>
          </div>

          <aside class="reserve__desktop-aside">
            <div class="reserve__desktop-aside-inner card-surface reserve__summary-card">
              <div class="reserve__desktop-panel">
                <div class="reserve__desktop-badges">
                  <span
                    :style="{
                      backgroundColor: `${typeColor}18`,
                      color: typeColor,
                      borderColor: `${typeColor}55`,
                    }"
                    class="reserve__desktop-badge reserve__desktop-badge--type"
                  >
                    {{ typeLabel }}
                  </span>
                  <span
                    v-if="reserve.status_text"
                    class="reserve__desktop-badge reserve__desktop-badge--status"
                  >
                    {{ reserve.status_text }}
                  </span>
                </div>

                <h1 class="reserve__desktop-title">{{ reserve.name }}</h1>

                <p v-if="locationLine" class="reserve__desktop-location">
                  <i aria-hidden="true" class="bi bi-geo-alt"></i>
                  {{ locationLine }}
                </p>

                <div
                  v-if="viewsCount > 0 || displayRating"
                  aria-label="Статистика"
                  class="reserve__desktop-stat-chips"
                >
                  <span v-if="viewsCount > 0" class="reserve__desktop-stat-chip">
                    <i aria-hidden="true" class="bi bi-eye"></i>
                    {{ viewsCount.toLocaleString('ru-RU') }}
                  </span>
                  <span
                    v-if="displayRating"
                    class="reserve__desktop-stat-chip reserve__desktop-stat-chip--rating"
                  >
                    <i aria-hidden="true" class="bi bi-star-fill"></i>
                    {{ displayRating }}
                  </span>
                </div>

                <div aria-label="Действия" class="reserve__desktop-actions-row" role="group">
                  <button class="reserve__desktop-action" type="button" @click="onShareReserve">
                    <i aria-hidden="true" class="bi bi-share"></i>
                    <span>Поделиться</span>
                  </button>
                  <button
                    :class="{ 'reserve__desktop-action--active': isFavorite }"
                    :disabled="favoriteLoading"
                    class="reserve__desktop-action"
                    type="button"
                    @click="onToggleFavorite"
                  >
                    <i
                      :class="['bi', isFavorite ? 'bi-heart-fill' : 'bi-heart']"
                      aria-hidden="true"
                    ></i>
                    <span>{{ isFavorite ? 'В избранном' : 'В избранное' }}</span>
                  </button>
                  <button
                    v-if="reserve.latitude && reserve.longitude"
                    class="reserve__desktop-route"
                    type="button"
                    @click="onBuildRouteFromHero"
                  >
                    <i aria-hidden="true" class="bi bi-car-front-fill"></i>
                    <span>Построить маршрут</span>
                  </button>
                </div>

                <ReserveOverviewCards
                  :format-area="formatArea"
                  :format-date="formatDate"
                  :reserve="reserve"
                  root-class="reserve__overview--sidebar"
                  variant="sidebar"
                  @copy-coords="copyCoords"
                />
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div class="container reserve__sections">
        <ReserveOverviewCards
          :format-area="formatArea"
          :format-date="formatDate"
          :reserve="reserve"
          root-class="reserve__overview--mobile-only"
          @copy-coords="copyCoords"
        />

        <div
          v-if="descriptionText"
          id="reserve-section-description"
          class="reserve__section-card card-surface reserve__section-card--description"
        >
          <ReserveDescriptionBlock
            ref="descriptionSectionRef"
            :description="reserve.description || ''"
            collapsible
          />
        </div>

        <div
          v-if="reserve.latitude && reserve.longitude"
          id="reserve-section-map"
          class="reserve__section-card card-surface reserve__section-card--map"
        >
          <ReserveMapSection
            ref="mapSectionRef"
            :can-add-via="canAddVia"
            :export-name="reserve.name"
            :has-coordinates="Boolean(reserve.latitude && reserve.longitude)"
            :is-logged-in="auth.isLoggedIn"
            :latitude="reserve.latitude"
            :location-label="locationLine"
            :longitude="reserve.longitude"
            :pickup-hint="pickupHint"
            :route-active="routeActive"
            :route-geojson="lastRouteGeojson"
            :route-loading="routeLoading"
            :route-menu-open="routeMenuOpen"
            :route-saving="routeSaving"
            :route-build-start-source="buildStartSource"
            :route-start-point="startPoint"
            :route-steps="routeSteps"
            :route-summary="routeSummary"
            @add-via="startPickingVia"
            @build-route-requested="onBuildRouteRequested"
            @copy-coords="copyCoords"
            @focus-route-step="focusRouteStep"
            @clear-route="clearRoute"
            @close-route-menu="routeMenuOpen = false"
            @invalidate-map="invalidateMapSize"
            @locate-requested="onLocateOnMap"
            @map-mounted="setMapElement"
            @open-external-route="onOpenExternalRoute"
            @open-route-menu="routeMenuOpen = true"
            @save-route="onSaveRoute"
          />
        </div>

        <div
          id="reserve-section-reviews"
          class="reserve__section-card card-surface reserve__section-card--reviews"
        >
          <ReserveReviewsSection
            ref="reviewsSectionRef"
            :avg-rating="reserve.avg_rating"
            :can-submit-review="canSubmitReview"
            :format-review-date="formatReviewDate"
            :is-logged-in="auth.isLoggedIn"
            :review-form="reviewForm"
            :review-submit-error="reviewSubmitError"
            :review-submitting="reviewSubmitting"
            :reviews="reviews"
            :reviews-count="Number(reserve.reviews_count) || 0"
            :reviews-error="reviewsError"
            :reviews-loading="reviewsLoading"
            :user-review="userReview"
            @go-login="goLogin"
            @submit-review="onSubmitReview"
          />
        </div>
      </div>
    </div>
  </article>

  <div v-else-if="loading" class="loading-state">
    <button class="reserve-back reserve-back--standalone" type="button" @click="goBack">
      <i aria-hidden="true" class="bi bi-arrow-left reserve-back__icon"></i>
      Назад
    </button>
    <i aria-hidden="true" class="bi bi-arrow-repeat reserve-loading__spin"></i>
    <p>Загружаем заповедник...</p>
  </div>
  <div v-else class="error-state">
    <button class="reserve-back reserve-back--standalone" type="button" @click="goBack">
      <i aria-hidden="true" class="bi bi-arrow-left reserve-back__icon"></i>
      Назад
    </button>
    <h2>Заповедник не найден</h2>
    <p>Возможно, объект был удалён или произошла ошибка.</p>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useReservesStore } from '@/stores/reserves'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { getTypeConfig } from '@/config/reserveTypes'
import ReserveGallery from '@/components/reserve/ReserveGallery.vue'
import ReserveOverviewCards from '@/components/reserve/ReserveOverviewCards.vue'
import ReserveDescriptionBlock from '@/components/reserve/ReserveDescriptionBlock.vue'
import ReserveReviewsSection from '@/components/reserve/ReserveReviewsSection.vue'
import ReserveMapSection from '@/components/reserve/ReserveMapSection.vue'
import { formatArea, formatDate, formatReviewDate } from '@/utils/reserveFormatters'
import { useReserveDetails } from '@/composables/useReserveDetails'
import { useReserveReviews } from '@/composables/useReserveReviews'
import { useReserveMap } from '@/composables/useReserveMap'
import { useShareLink } from '@/composables/useShareLink'
import api from '@/services/api'

const route = useRoute()
const router = useRouter()
const reservesStore = useReservesStore()
const auth = useAuthStore()
const ui = useUiStore()
const { shareReserve } = useShareLink()
const id = computed(() => {
  const raw = route.params.id
  const v = Array.isArray(raw) ? raw[0] : raw
  return v != null && v !== '' ? String(v) : ''
})

const { reserve, loading, isFavorite, favoriteLoading, loadReserve, toggleFavorite } =
  useReserveDetails(id, reservesStore)
const {
  reviews,
  userReview,
  reviewsLoading,
  reviewsError,
  reviewSubmitting,
  reviewSubmitError,
  reviewForm,
  canSubmitReview,
  loadReviews,
  submitReview,
} = useReserveReviews(id)

const loadReserveReviews = () => loadReviews(auth.isLoggedIn)
const {
  routeMenuOpen,
  routeActive,
  routeLoading,
  routeSummary,
  routeSteps,
  pickupHint,
  startPoint,
  buildStartSource,
  canAddVia,
  routeProfile,
  lastRouteGeojson,
  lastRouteDistanceM,
  lastRouteDurationS,
  initMap,
  destroyMap,
  requestRouteFromModal,
  startPickingVia,
  clearRoute,
  openExternalRoute,
  focusRouteStep,
  setMapElement,
  invalidateMapSize,
  goToMyLocation,
} = useReserveMap()

const routeSaving = ref(false)
const mapSectionRef = ref(null)
const descriptionSectionRef = ref(null)
const reviewsSectionRef = ref(null)

const DESCRIPTION_PREVIEW_LEN = 280

const hasPhotos = computed(() => (reserve.value?.photos?.length ?? 0) > 0)

const viewsCount = computed(() => Number(reserve.value?.views_count) || 0)

const displayRating = computed(() => {
  const reviews = Number(reserve.value?.reviews_count) || 0
  const avg = Number(reserve.value?.avg_rating)
  if (reviews <= 0 || !Number.isFinite(avg) || avg <= 0) return null
  return avg.toFixed(1)
})

const locationLine = computed(() => {
  const region = String(reserve.value?.region || '').trim()
  const district = String(reserve.value?.district || '').trim()
  if (region && district) return `${region}, ${district}`
  return region || district || ''
})

const typeLabelUpper = computed(() => String(typeLabel.value || 'Объект').toUpperCase())

const typeConfig = computed(() =>
  reserve.value
    ? getTypeConfig(reserve.value.type || '')
    : {
        color: '#757575',
        label: 'Объект',
      },
)
const typeColor = computed(() => typeConfig.value.color || '#757575')
const typeLabel = computed(() => typeConfig.value.label || reserve.value?.type || 'Объект')

const descriptionText = computed(() => String(reserve.value?.description || '').trim())

const hasContacts = computed(
  () =>
    reserve.value?.phone ||
    reserve.value?.email ||
    reserve.value?.website ||
    reserve.value?.postal_address,
)

const quickChips = computed(() => {
  const chips = []
  const r = reserve.value
  if (!r) return chips
  if (r.area != null && r.area !== '') {
    chips.push(formatArea(r.area))
  }
  if (r.created) {
    chips.push(`создан ${formatDate(r.created)}`)
  }
  if (r.status_date) {
    chips.push(`статус с ${formatDate(r.status_date)}`)
  }
  return chips.slice(0, 3)
})

const reviewsAnchorLabel = computed(() => {
  const n = Number(reserve.value?.reviews_count) || reviews.value?.length || 0
  return n > 0 ? `Отзывы (${n})` : 'Отзывы'
})

const hasPageSections = computed(
  () =>
    Boolean(descriptionText.value) ||
    Boolean(reserve.value?.latitude && reserve.value?.longitude) ||
    true /* отзывы всегда на странице */,
)

const hasLongDescription = computed(() => descriptionText.value.length > DESCRIPTION_PREVIEW_LEN)

const descriptionPreview = computed(() => {
  if (!descriptionText.value) return ''
  if (!hasLongDescription.value) return descriptionText.value
  return `${descriptionText.value.slice(0, DESCRIPTION_PREVIEW_LEN).trimEnd()}…`
})

const routeSummaryLine = computed(() => {
  if (!routeSummary.value?.distance || !routeSummary.value?.duration) return ''
  return `${routeSummary.value.distance} • ${routeSummary.value.duration}`
})

const setFeedback = (message) => {
  ui.showToast(message)
}

const goLogin = () => router.push('/login')

const copyCoords = async () => {
  const text = `${reserve.value.latitude.toFixed(6)}, ${reserve.value.longitude.toFixed(6)}`
  try {
    await navigator.clipboard.writeText(text)
    setFeedback('Координаты скопированы')
  } catch {
    setFeedback('Не удалось скопировать координаты')
  }
}

const onToggleFavorite = async () => {
  const result = await toggleFavorite(auth.token, goLogin)
  if (result?.message) setFeedback(result.message)
}

function goBack() {
  if (window.history.state?.back) {
    router.back()
    return
  }
  router.push('/list')
}

const onShareReserve = () => {
  if (!reserve.value) return
  shareReserve(reserve.value)
}

const onSubmitReview = async () => {
  const result = await submitReview(auth.isLoggedIn, goLogin)
  if (result?.ok) setFeedback(result.message)
}

const onOpenExternalRoute = (provider) => {
  openExternalRoute(reserve.value, provider)
}

const onBuildRouteRequested = (payload) => {
  if (reserve.value) {
    requestRouteFromModal(reserve.value, payload, setFeedback)
  }
}

const onLocateOnMap = () => {
  goToMyLocation(setFeedback)
}

function scrollToSection(id) {
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function scrollToMapSection() {
  scrollToSection('reserve-section-map')
  mapSectionRef.value?.$el?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
}

function scrollToDescription() {
  scrollToSection('reserve-section-description')
  const el = descriptionSectionRef.value?.$el ?? descriptionSectionRef.value
  el?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
}

function scrollToReviews() {
  scrollToSection('reserve-section-reviews')
  const el = reviewsSectionRef.value?.$el ?? reviewsSectionRef.value
  el?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
}

function onMapHintClick() {
  scrollToMapSection()
  if (reserve.value?.latitude && reserve.value?.longitude) {
    void nextTick(() => {
      routeMenuOpen.value = true
    })
  }
}

function onMobileRoute() {
  scrollToMapSection()
  if (reserve.value?.latitude && reserve.value?.longitude) {
    void nextTick(() => {
      routeMenuOpen.value = true
    })
  }
}

function onBuildRouteFromHero() {
  onMobileRoute()
}

const onSaveRoute = async () => {
  if (!auth.isLoggedIn) {
    goLogin()
    return
  }
  if (!reserve.value?.id || !lastRouteGeojson.value) {
    setFeedback('Сначала постройте маршрут на карте.')
    return
  }
  routeSaving.value = true
  try {
    await api.saveProfileRoute({
      reserve_id: reserve.value.id,
      profile: routeProfile.value,
      geojson: lastRouteGeojson.value,
      distance_m: lastRouteDistanceM.value,
      duration_s: lastRouteDurationS.value,
    })
    setFeedback('Маршрут сохранён в профиле')
  } catch (err) {
    setFeedback(err?.response?.data?.error || 'Не удалось сохранить маршрут')
  } finally {
    routeSaving.value = false
  }
}

onMounted(() => {
  if (id.value) {
    loadReserve(loadReserveReviews)
  }
})

watch(id, (nextId, prevId) => {
  if (!nextId || nextId === prevId) return
  clearRoute()
  routeMenuOpen.value = false
  loadReserve(loadReserveReviews)
})

watch(
  [() => reserve.value, () => loading.value],
  ([val, isLoading]) => {
    if (!val || isLoading) {
      destroyMap()
      return
    }
    initMap(val, typeColor.value, typeLabel.value)
  },
  { immediate: true, flush: 'post' },
)

onBeforeUnmount(() => {
  destroyMap()
})
</script>

<style lang="scss">
$primary: #2e8b57;
$accent: #3cb371;
$gray: #6c757d;
$text: #333;
$light: #f8f9fa;

.reserve {
  background: $color-page-bg;

  h1,
  h2,
  h3 {
    font-weight: 700;
    color: $color-primary;
  }
}

.reserve-back {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  margin: 0.75rem 0 1.25rem;
  padding: 0.38rem 0.75rem 0.38rem 0.55rem;
  border: 1px solid #dfe7e2;
  border-radius: 999px;
  background: #fff;
  color: $primary;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(46, 139, 87, 0.08);
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;

  &:hover {
    background: #f4fbf8;
    border-color: rgba($primary, 0.45);
    color: #256f46;
  }

  &:focus-visible {
    outline: 2px solid $accent;
    outline-offset: 2px;
  }

  &--standalone {
    margin: 0 auto 1.25rem;
    display: flex;
  }
}

.reserve-back__icon {
  /* Bootstrap Icons = шрифт: масштабируется через font-size, не через width/height */
  font-size: 1.125rem;
  line-height: 1;
  flex-shrink: 0;
}

.reserve__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-bottom: 2.5rem;
  padding-top: 0;
}

.reserve__title {
  font-size: 2.4rem;
  margin: 0 0 0.75rem;
  line-height: 1.2;
}

.reserve__badges {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.section-controls {
  display: flex;
  justify-content: space-between;
}

.badge {
  padding: 0.35rem 0.9rem;
  border-radius: 2rem;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: capitalize;

  &--type {
    background: #e6f3ec;
    color: $primary;
    border: 2px solid rgba($primary, 0.35);
  }

  &--status {
    background: #fff4d9;
    color: #b8860b;
  }

  &--meta {
    background: #edf5ef;
    color: #2f5d44;
    border: 1px solid #cfe2d5;
  }
}

.reserve__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: stretch;
}

.reserve__share,
.reserve__favorite {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: white;
  border: 2px solid rgba($primary, 0.2);
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  white-space: nowrap;
  color: $primary;
  box-shadow: 0 3px 12px rgba($primary, 0.08);

  .icon {
    width: 20px;
    height: 20px;
    fill: currentColor;
  }
}

.reserve__share:hover {
  border-color: rgba($primary, 0.45);
  background: #f8fcf9;
}

.reserve__favorite {
  &:hover:not(:disabled) {
    border-color: $primary;
  }

  &--active {
    background: $accent;
    border-color: $accent;
    color: white;

    .icon {
      fill: white;
    }
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.reserve__gallery {
  margin-bottom: 3rem;
}

.reserve__slider-wrapper {
  position: relative;
  margin: 0 auto;
  max-width: 1000px;
  width: 100%;
  border-radius: 20px;
  overflow: hidden;
  aspect-ratio: 16/9;
  background: #000;
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.13);
}

.reserve__slider {
  position: relative;
  width: 100%;
  height: 100%;
}

.reserve__photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.6s ease;

  &.active {
    opacity: 1;
  }
}

.slider-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.45);
  color: white;
  border: none;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  cursor: pointer;
  z-index: 10;
  transition: background 0.2s;

  &:hover {
    background: rgba(0, 0, 0, 0.65);
  }

  &:disabled {
    opacity: 0.25;
    cursor: not-allowed;
  }

  &.prev {
    left: 1rem;
  }

  &.next {
    right: 1rem;
  }
}

.reserve__dots {
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 0.5rem;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.45);
  border: none;
  cursor: pointer;
  transition: all 0.25s;

  &.active {
    background: white;
    transform: scale(1.25);
  }
}

.reserve__thumbnails {
  display: none;
  gap: 1rem;
  margin-top: 1.5rem;
  justify-content: center;
  flex-wrap: wrap;

  .thumb-btn {
    padding: 0;
    border: 3px solid transparent;
    border-radius: 10px;
    overflow: hidden;
    cursor: pointer;
    background: none;
    transition: border-color 0.25s ease;

    &.active {
      border-color: $accent;
    }

    .thumb {
      display: block;
      width: 100px;
      height: 70px;
      object-fit: cover;
      opacity: 0.6;
      transition: opacity 0.25s;
    }

    &.active .thumb,
    &:hover .thumb {
      opacity: 1;
    }
  }
}

.grid {
  display: grid;
  gap: 2rem;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.info-card {
  background: white;
  padding: 1.75rem;
  border-radius: 16px;
  border: 1px solid #e9ecef;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);

  h3 {
    margin: 0 0 1.25rem;
    font-size: 1.35rem;
    padding-bottom: 0.5rem;
    position: relative;

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 50px;
      height: 3px;
      background: $accent;
      border-radius: 2px;
    }
  }

  dl {
    display: grid;
    gap: 1rem;
  }

  dt {
    font-weight: 600;
    color: $gray;
    font-size: 0.95rem;
  }

  dd {
    margin: 0;
    color: $text;
    font-size: 1.05rem;
  }

  .link {
    color: $accent;
    text-decoration: none;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
    }
  }

  .coordinates {
    font-family: 'Courier New', monospace;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .copy-btn {
    background: none;
    border: none;
    cursor: pointer;
    opacity: 0.6;
    transition: opacity 0.2s;

    &:hover {
      opacity: 1;
    }
  }
}

.section-title {
  font-size: 1.8rem;
  position: relative;
  padding-bottom: 0.75rem;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 70px;
    height: 4px;
    background: $accent;
    border-radius: 2px;
  }
}

.text-content {
  font-size: 1.1rem;
  line-height: 1.8;
  color: #444;
  white-space: pre-line;
  background: white;
  padding: 2rem;
  border-radius: 16px;
  border: 1px solid #e9ecef;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
  margin-top: 1rem;
}

.map-controls {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
}

.reserve__overview {
  margin-bottom: 3rem;
}

.reserve__description {
  margin-bottom: 3rem;
}

.route-control-btn,
.clear-route-btn {
  background: $accent;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.2s;
  box-shadow: 0 4px 14px rgba($accent, 0.35);

  &:hover {
    background: $primary;
    transform: translateY(-2px);
  }
}

.clear-route-btn {
  background: #d9534f;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  padding: 1rem;
}

.modal {
  background: white;
  width: 100%;
  max-width: 420px;
  padding: 2rem;
  border-radius: 18px;
  text-align: center;
  box-shadow: 0 10px 34px rgba(0, 0, 0, 0.22);
  animation: fadeIn 0.25s ease;
}

.route-option {
  width: 100%;
  margin-top: 1rem;
  padding: 12px 20px;
  font-size: 1rem;
  border-radius: 12px;
  border: none;
  background: $accent;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: 0.2s;

  &:hover {
    background: $primary;
  }
}

.modal-close {
  width: 100%;
  margin-top: 1rem;
  padding: 10px;
  background: #e2e2e2;
  border: none;
  border-radius: 12px;
  cursor: pointer;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.reserve__desktop {
  display: none;
}

.reserve__hero-nav,
.reserve__hero-stats,
.reserve-mobile-intro,
.reserve__specs-mobile {
  display: none;
}

.reserve-back--listing {
  margin: 0.5rem 0 0.5rem;
  padding: 0.45rem 1rem 0.45rem 0.7rem;
  font-size: 0.88rem;
  color: #475467;
  border-color: #e4e7ec;
  box-shadow: none;

  .reserve-back__icon {
    font-size: 1rem;
  }

  &:hover {
    color: $primary;
    border-color: #c5d9ce;
    background: #f8fcf9;
  }
}

.reserve__desktop-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  gap: 2rem;
  align-items: start;
  margin-bottom: 2rem;
}

.reserve__desktop-col {
  min-width: 0;
}

.reserve__desktop-media {
  position: relative;
  min-width: 0;
}

.reserve__overview--sidebar {
  margin: 0;
}

.reserve__overview--mobile-only {
  .reserve__overview-desktop {
    display: none;
  }
}

.reserve__desktop-gallery-badge {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 6;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  font-size: 0.82rem;
  font-weight: 700;
  pointer-events: none;

  .bi {
    font-size: 0.95rem;
    line-height: 1;
  }
}

.reserve__desktop-media-placeholder {
  display: grid;
  place-items: center;
  aspect-ratio: 4 / 3;
  border-radius: 20px;
  background: linear-gradient(145deg, #eef2f6, #e2e8f0);
  color: #94a3b8;
  font-size: 2.5rem;
}

.reserve__desktop-gallery.reserve__gallery {
  margin-bottom: 0;
}

.reserve__gallery--card {
  .reserve__slider-wrapper {
    max-width: none;
    aspect-ratio: 4 / 3;
    border-radius: 20px;
    box-shadow: 0 12px 36px rgba(15, 23, 42, 0.1);
  }

  .slider-btn--overlay {
    width: 40px;
    height: 40px;
    background: rgba(255, 255, 255, 0.92);
    color: #334155;
    box-shadow: 0 2px 12px rgba(15, 23, 42, 0.14);

    .bi {
      font-size: 1.1rem;
      line-height: 1;
    }

    &:hover:not(:disabled) {
      background: #fff;
    }

    &.prev {
      left: 10px;
    }

    &.next {
      right: 10px;
    }

    &:disabled {
      opacity: 0.35;
    }
  }

  .reserve__thumbnails--scroll {
    display: flex;
    flex-wrap: nowrap;
    gap: 8px;
    margin-top: 10px;
    overflow-x: auto;
    overflow-y: hidden;
    justify-content: flex-start;
    padding-bottom: 6px;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;

    &::-webkit-scrollbar {
      height: 5px;
    }

    &::-webkit-scrollbar-thumb {
      background: #c5d9ce;
      border-radius: 999px;
    }

    .thumb-btn {
      flex: 0 0 90px;
      width: 68px;
      padding: 0;
      border: 2px solid transparent;
      border-radius: 10px;
      overflow: hidden;
      cursor: pointer;
      background: none;
      aspect-ratio: 4 / 3;

      &.active {
        border-color: $accent;
      }

      .thumb {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
        opacity: 1;
        border: none;
        border-radius: 0;
      }
    }
  }
}

.reserve__desktop-aside {
  min-width: 0;
}

.reserve__desktop-aside-inner {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.reserve__desktop-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  padding-top: 0.25rem;
}

.reserve__desktop-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 0;
}

.reserve__desktop-badge {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.25;
  border: 1px solid transparent;

  &--type,
  &--status {
    background: #fff8e6;
    color: #9a6700;
    border-color: #f5e6b8;
    text-transform: none;
  }

  &--status {
    text-transform: capitalize;
  }
}

.reserve__desktop-title {
  margin: 0;
  font-size: clamp(1.65rem, 1.5vw, 2.15rem);
  font-weight: 800;
  line-height: 1.15;
  color: #0f172a;
  letter-spacing: -0.02em;
}

.reserve__desktop-location {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0;
  font-size: 0.92rem;
  color: #667085;
  line-height: 1.4;

  .bi {
    flex-shrink: 0;
    font-size: 1.05rem;
    line-height: 1.2;
    color: #98a2b3;
  }
}

.reserve__desktop-quick-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.reserve__desktop-quick-chip {
  padding: 5px 10px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid #e4e7ec;
  font-size: 0.75rem;
  font-weight: 600;
  color: #475467;
  line-height: 1.2;
}

.reserve__desktop-stat-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.reserve__desktop-stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid #e4e7ec;
  font-size: 0.82rem;
  font-weight: 700;
  color: #334155;

  .bi {
    font-size: 0.95rem;
    line-height: 1;
    color: $primary;
  }

  &--rating {
    color: #b45309;

    .bi {
      color: #e8a317;
    }
  }
}

.reserve__desktop-actions-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.reserve__desktop-action {
  display: inline-flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid #d5e5dc;
  border-radius: 12px;
  background: #fff;
  color: $primary;
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.15;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease;

  .bi {
    font-size: 1.1rem;
    line-height: 1;
  }

  &:hover:not(:disabled) {
    border-color: rgba($primary, 0.55);
    background: #f8fcf9;
  }

  &--active {
    background: rgba($primary, 0.1);
    border-color: $primary;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.reserve__desktop-route {
  display: inline-flex;
  grid-column: 1 / -1;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 0;
  padding: 11px 16px;
  border: none;
  border-radius: 12px;
  background: $primary;
  color: #fff;
  font-size: 0.88rem;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background 0.2s ease,
    transform 0.15s ease;

  .bi {
    font-size: 1.05rem;
    line-height: 1;
  }

  &:hover {
    background: #256f46;
    transform: translateY(-1px);
  }
}

.reserve__summary-card {
  padding: 1.25rem 1.35rem;
  border-radius: $radius-lg;
}

.reserve__page-nav {
  display: none;
  flex-direction: row;
  position: sticky;
  top: $header-height;
  z-index: 50;
  gap: 8px;
  padding: 10px 0 14px;
  margin-bottom: 4px;
  background: rgba($color-page-bg, 0.92);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid $color-border;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.reserve__page-nav-btn {
  flex: 0 0 auto;
  padding: 8px 16px;
  border: 1px solid $color-border;
  border-radius: 999px;
  background: #fff;
  color: $color-primary;
  font-size: 0.82rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease;

  &:hover {
    background: $color-light;
    border-color: rgba($color-primary, 0.35);
  }
}

.reserve__mobile-bar {
  display: none;
}

.reserve__desktop-map-hint {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid $color-border;
  border-radius: $radius;
  background: $color-light;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease;

  .bi-map {
    flex-shrink: 0;
    font-size: 1.25rem;
    color: $primary;
  }

  span {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 2px;
    min-width: 0;

    strong {
      font-size: 0.88rem;
      font-weight: 700;
      color: #0f172a;
    }

    small {
      font-size: 0.78rem;
      color: #667085;
      line-height: 1.3;
    }
  }

  &:hover {
    border-color: rgba($color-primary, 0.35);
    background: #fff;
  }
}

.reserve__desktop-map-hint-chev {
  flex-shrink: 0;
  color: #98a2b3;
  font-size: 1rem;
}

.reserve__desktop-anchor-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 4px;
}

.reserve__desktop-anchor {
  padding: 7px 14px;
  border: 1px solid #d5e5dc;
  border-radius: 999px;
  background: #fff;
  color: $primary;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease;

  &:hover {
    background: #f4fbf8;
    border-color: rgba($primary, 0.45);
  }
}

.reserve__section-card {
  margin-bottom: 1.5rem;
  padding: 1.35rem 1.5rem;
  min-width: 0;

  .reserve__description,
  .reserve__map-section {
    margin-bottom: 0;
  }

  .section-title,
  .reserve__section-title,
  .reserve__map-heading {
    color: #0f172a;
    font-weight: 800;
  }

}

.reserve__sections {
  padding-bottom: 2.5rem;
}

.reserve__gallery--hero {
  margin-bottom: 0;
}

.reserve__gallery--hero .reserve__slider-wrapper {
  max-width: none;
  width: 100%;
  border-radius: 0;
  aspect-ratio: 4 / 3.1;
  min-height: 260px;
  box-shadow: none;
}

.reserve__gallery--hero .reserve__slider-wrapper {
  touch-action: pan-y pinch-zoom;
}

.reserve__hero-dots {
  position: absolute;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  z-index: 6;
  pointer-events: auto;
}

.reserve__gallery--hero .slider-btn--overlay {
  z-index: 6;
}

.reserve__hero-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  border: none;
  padding: 0;
  background: rgba(255, 255, 255, 0.45);
  cursor: pointer;

  &.active {
    background: #fff;
    transform: scale(1.15);
  }
}

.reserve-spec-block {
  margin-bottom: 0;

  &:last-child {
    margin-bottom: 0;
  }

  &--compact {
    .reserve-spec-block__title {
      margin-bottom: 8px;
      font-size: 0.92rem;
    }

    .reserve-spec-card {
      padding: 0.85rem 1rem;
    }

    .reserve-spec-list__row {
      padding: 7px 0;

      dt {
        font-size: 0.8rem;
      }

      dd {
        font-size: 0.85rem;
      }
    }
  }
}

.reserve-spec-block__title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 10px;
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;

  .bi {
    font-size: 1.05rem;
    line-height: 1;
    color: $primary;
  }
}

.reserve-spec-card {
  padding: 1.1rem 1.35rem;
  margin: 0;
}

.reserve-spec-list__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 0;
  border-bottom: 1px solid #eef0f2;

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  &:first-child {
    padding-top: 0;
  }

  dt {
    margin: 0;
    font-size: 0.88rem;
    font-weight: 500;
    color: #667085;
    flex-shrink: 0;
  }

  dd {
    margin: 0;
    font-size: 0.92rem;
    font-weight: 600;
    color: #0f172a;
    text-align: right;
  }
}

.reserve-spec-list__coords {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  font-size: 0.88rem;
  font-weight: 600;
}

.reserve-spec-list__copy {
  display: inline-flex;
  align-items: center;
  padding: 0;
  border: none;
  background: none;
  color: #98a2b3;
  cursor: pointer;
  line-height: 1;

  .bi {
    font-size: 0.95rem;
    line-height: 1;
  }

  &:hover {
    color: $primary;
  }
}

.reserve-spec-list__link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: $primary;
  font-weight: 600;
  text-decoration: none;

  .bi {
    font-size: 0.85rem;
    line-height: 1;
  }

  &:hover {
    text-decoration: underline;
  }

  &--external {
    color: $primary;
  }
}

.reserve__overview-desktop {
  display: none;
}

.reserve__read-more {
  margin-top: 8px;
  padding: 0;
  border: none;
  background: none;
  color: $primary;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}

.text-content--collapsed {
  max-height: 7.5rem;
  overflow: hidden;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 2.5rem;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0), #fff);
    pointer-events: none;
  }
}

.reserve__section-title {
  margin-bottom: 0.75rem;
}

@media (min-width: 769px) {
  .reserve__mobile {
    display: none;
  }

  .reserve__desktop {
    display: block;
  }

  .reserve__sections {
    padding-top: 0;
  }

  .reserve__desktop-aside-inner {
    position: sticky;
    top: 88px;
  }

  .reserve__overview--sidebar {
    .reserve__specs-mobile {
      display: none;
    }

    .reserve__overview-desktop {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
  }

  .reserve__overview--mobile-only {
    display: none;
  }

  .reserve__page-nav {
    display: none;
  }

  .reserve__desktop-anchor-nav {
    display: flex;
  }

  .reserve__section-card .text-content {
    background: transparent;
    border: none;
    box-shadow: none;
    padding: 0;
  }
}

@media (max-width: 768px) {
  .reserve {
    background: #fff;
    padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px));
  }

  .reserve__page-nav {
    display: flex;
  }

  .reserve__desktop-anchor-nav {
    display: none;
  }

  .reserve__mobile-bar {
    display: flex;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 90;
    align-items: center;
    justify-content: space-around;
    gap: 8px;
    padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0px));
    background: rgba(255, 255, 255, 0.96);
    border-top: 1px solid $color-border;
    backdrop-filter: blur(10px);
    box-shadow: 0 -4px 20px rgba(15, 23, 42, 0.08);
  }

  .reserve__mobile-bar-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-width: 48px;
    min-height: 48px;
    padding: 0 14px;
    border: 1px solid $color-border;
    border-radius: 12px;
    background: #fff;
    color: $color-primary;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;

    &--primary {
      flex: 1;
      max-width: 200px;
      border: none;
      background: $color-primary;
      color: #fff;
    }

    &--active {
      border-color: $color-primary;
      background: $color-light;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .reserve__layout .container {
    padding-left: 16px;
    padding-right: 16px;
  }

  .reserve__hero-nav,
  .reserve__hero-stats {
    display: flex;
  }

  .reserve-mobile-intro,
  .reserve__specs-mobile {
    display: block;
  }

  .reserve__desktop {
    display: none !important;
  }

  .reserve__overview-desktop {
    display: none !important;
  }

  .reserve__top {
    position: relative;
    z-index: 1;
  }

  .reserve__gallery--hero .reserve__hero-dots {
    bottom: 44px;
  }

  .reserve__gallery--hero .slider-btn--overlay {
    width: 36px;
    height: 36px;

    &.prev {
      left: 8px;
    }

    &.next {
      right: 8px;
    }
  }

  .reserve__top--no-photo {
    min-height: 52px;
    padding-top: env(safe-area-inset-top, 0px);
    background: #fff;
  }

  .reserve__top--no-photo .reserve__hero-stats {
    display: none;
  }

  .reserve__hero-nav {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: calc(10px + env(safe-area-inset-top, 0px)) 12px 10px;
    pointer-events: none;
  }

  .reserve__top--no-photo .reserve__hero-nav {
    position: relative;
    padding-top: 10px;
  }

  .reserve__hero-nav-btn,
  .reserve__hero-nav-end {
    pointer-events: auto;
  }

  .reserve__hero-nav-end {
    display: flex;
    gap: 8px;
  }

  .reserve__hero-nav-btn {
    cursor: pointer;

    &--active {
      color: $primary;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .reserve__hero-nav-icon {
    font-size: 20px;
    line-height: 1;
  }

  .reserve__hero-stats {
    position: absolute;
    bottom: calc(28px + env(safe-area-inset-bottom, 0px));
    left: 12px;
    z-index: 4;
    display: flex;
    gap: 8px;
    pointer-events: none;
  }

  .reserve__hero-stat {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.92);
    color: #475467;
    font-size: 0.8rem;
    font-weight: 700;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.1);

    &--rating {
      color: #b45309;
    }
  }

  .reserve__hero-stat-icon {
    /* Иначе наследует 0.8rem у .reserve__hero-stat и выглядит мельче задуманного */
    font-size: 0.95rem;
    line-height: 1;
    flex-shrink: 0;
  }

  .reserve__sheet {
    position: relative;
    z-index: 2;
    margin-top: -22px;
    background: #fff;
    border-radius: 24px 24px 0 0;
  }

  .reserve__sheet-inner {
    padding-top: 18px;
    padding-bottom: 4px;
  }

  .reserve-mobile-intro__type {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    border-radius: 999px;
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    line-height: 1.2;
  }

  .reserve-mobile-intro__type-dot {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: var(--type-color, $primary);
    flex-shrink: 0;
  }

  .reserve-mobile-intro__title {
    margin: 10px 0 6px;
    font-size: 1.45rem;
    font-weight: 800;
    line-height: 1.2;
    color: #0f172a;
    letter-spacing: -0.02em;
  }

  .reserve-mobile-intro__location {
    margin: 0 0 16px;
    font-size: 0.88rem;
    color: #667085;
    line-height: 1.35;

    .bi {
      font-size: 1.1em;
      line-height: 1;
      vertical-align: -0.15em;
    }
  }

  .reserve-mobile-actions {
    display: flex;
    justify-content: space-around;
    gap: 8px;
    margin-bottom: 8px;
    padding-bottom: 4px;
  }

  .reserve-mobile-actions__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex: 1;
    border: none;
    background: none;
    padding: 0;
    cursor: pointer;
    color: $primary;

    &--active .reserve-mobile-actions__icon {
      background: rgba($primary, 0.12);
      border-color: $primary;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .reserve-mobile-actions__icon {
    display: grid;
    place-items: center;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    border: 2px solid rgba($primary, 0.35);
    background: #fff;
    color: $primary;

    svg {
      width: 22px;
      height: 22px;
      display: block;
    }

    .bi {
      font-size: 22px;
      line-height: 1;
    }
  }

  .reserve-mobile-actions__label {
    font-size: 0.78rem;
    font-weight: 600;
    color: #334155;
    text-align: center;
    line-height: 1.2;
  }

  .reserve__sections {
    padding-top: 8px;
    padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px));
  }

  .reserve__overview {
    margin-bottom: 1.75rem;
  }

  .reserve__description {
    margin-bottom: 1.75rem;
  }

  .section-title,
  .reserve__section-title {
    font-size: 1.05rem;
    font-weight: 800;
    color: #0f172a;
    padding-bottom: 0;

    &::after {
      display: none;
    }
  }

  .text-content {
    margin-top: 0;
    padding: 0;
    background: transparent;
    border: none;
    box-shadow: none;
    font-size: 0.92rem;
    line-height: 1.65;
    color: #475467;
  }

  .reserve__map-section {
    margin-bottom: 1.75rem;
  }
}

@media (min-width: 768px) {
  .reserve__thumbnails {
    display: flex;
  }
  .reserve__title {
    font-size: 2.8rem;
  }
}

@media (max-width: 640px) {
  .reserve-back {
    margin-top: 0.5rem;
    margin-bottom: 1rem;
  }

  .reserve__header {
    flex-direction: column;
    align-items: stretch;
    margin-bottom: 1.5rem;
    gap: 1rem;
  }

  .reserve__title {
    font-size: 1.65rem;
  }

  .reserve__badges {
    gap: 0.5rem;
  }

  .badge {
    font-size: 0.78rem;
    padding: 0.3rem 0.7rem;
  }

  .reserve__actions {
    flex-direction: column;
  }

  .reserve__share,
  .reserve__favorite {
    justify-content: center;
    width: 100%;
    padding: 0.7rem 1rem;
  }

  .reserve__slider-wrapper {
    aspect-ratio: 4/3;
    border-radius: 14px;
  }

  .slider-btn {
    width: 40px;
    height: 40px;

    &.prev {
      left: 0.5rem;
    }

    &.next {
      right: 0.5rem;
    }
  }

  .grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .info-card {
    padding: 1.25rem;

    h3 {
      font-size: 1.15rem;
    }
  }

  .reserve__gallery {
    margin-bottom: 2rem;
  }

  .loading-state,
  .error-state {
    padding: 4rem 1rem;
  }
}

.loading-state,
.error-state {
  text-align: center;
  padding: 6rem 1rem;
  color: $gray;
}

.reserve-loading__spin {
  display: block;
  margin: 0 auto 1rem;
  font-size: 2rem;
  color: $primary;
  animation: reserve-spin 0.85s linear infinite;
}

@keyframes reserve-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.no-data {
  text-align: center;
  padding: 3rem;
  background: $light;
  border-radius: 16px;
  color: $gray;
  font-style: italic;
}
</style>

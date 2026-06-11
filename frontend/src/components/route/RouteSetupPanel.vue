<template>
  <div class="route-setup-root">
  <button
    v-if="!menuOpen"
    ref="fabEl"
    :aria-expanded="menuOpen ? 'true' : 'false'"
    aria-controls="route-setup-panel"
    class="route-fab"
    type="button"
    @click="$emit('open-menu')"
  >
    <i aria-hidden="true" class="bi bi-signpost-split route-fab__icon"></i>
    <span class="route-fab__label">Маршрут</span>
  </button>

  <div
    v-show="menuOpen"
    id="route-setup-panel"
    ref="panelEl"
    :class="{
      'route-setup--with-route': routeActive,
      'route-setup--mobile-compact': mobileCompact,
    }"
    aria-label="Построение маршрута"
    aria-modal="false"
    class="route-setup"
    role="dialog"
    tabindex="-1"
    @keydown.esc.prevent="$emit('close-menu')"
  >
    <div class="route-setup__header">
      <div class="route-setup__heading">
        <span class="route-setup__title">
          <i aria-hidden="true" class="bi bi-signpost-2"></i>
          {{ panelTitle }}
        </span>
        <p v-if="!routeActive && !showProfileSelect && profileHint" class="route-setup__subtitle">
          {{ profileHint }}
        </p>
      </div>
      <button
        aria-label="Закрыть панель"
        class="route-setup__close"
        type="button"
        @click="$emit('close-menu')"
      >
        <i aria-hidden="true" class="bi bi-x-lg"></i>
      </button>
    </div>

    <template v-if="!routeActive">
      <p class="route-setup__label">Точка старта</p>
      <div aria-label="Точка старта" class="route-segments route-segments--start" role="group">
        <button
          :class="{ 'route-segments__btn--active': startSource === 'geo' }"
          class="route-segments__btn route-segments__btn--icon"
          type="button"
          @click="startSource = 'geo'"
        >
          <i aria-hidden="true" class="bi bi-geo-alt-fill"></i>
          <span>Я здесь</span>
        </button>
        <button
          :class="{ 'route-segments__btn--active': startSource === 'map' }"
          class="route-segments__btn route-segments__btn--icon"
          type="button"
          @click="startSource = 'map'"
        >
          <i aria-hidden="true" class="bi bi-pin-map-fill"></i>
          <span>На карте</span>
        </button>
      </div>

      <template v-if="showProfileSelect">
        <p class="route-setup__label">Способ передвижения</p>
        <div aria-label="Способ передвижения" class="route-segments" role="group">
          <button
            :class="{ 'route-segments__btn--active': profile === 'driving-car' }"
            class="route-segments__btn route-segments__btn--icon"
            type="button"
            @click="profile = 'driving-car'"
          >
            <i aria-hidden="true" class="bi bi-car-front-fill"></i>
            <span>Авто</span>
          </button>
          <button
            :class="{ 'route-segments__btn--active': profile === 'foot-walking' }"
            class="route-segments__btn route-segments__btn--icon"
            type="button"
            @click="profile = 'foot-walking'"
          >
            <i aria-hidden="true" class="bi bi-person-walking"></i>
            <span>Пешком</span>
          </button>
        </div>
      </template>

      <button :disabled="loading" class="route-action-primary" type="button" @click="$emit('build')">
        <i v-if="loading" aria-hidden="true" class="bi bi-arrow-repeat route-action-primary__spin"></i>
        <i v-else aria-hidden="true" class="bi bi-play-fill"></i>
        {{ loading ? 'Строим…' : 'Построить маршрут' }}
      </button>
    </template>

    <template v-else>
      <dl class="route-setup__facts">
        <div class="route-setup__fact">
          <dt class="route-setup__fact-label">Старт</dt>
          <dd class="route-setup__fact-value">{{ startStatusText }}</dd>
        </div>
        <div v-if="profileDisplayText" class="route-setup__fact">
          <dt class="route-setup__fact-label">Профиль</dt>
          <dd class="route-setup__fact-value">{{ profileDisplayText }}</dd>
        </div>
      </dl>

      <div class="route-active-toolbar">
        <button class="route-toolbar-btn route-toolbar-btn--danger" type="button" @click="$emit('clear')">
          <i aria-hidden="true" class="bi bi-arrow-counterclockwise"></i>
          <span>Сбросить</span>
        </button>
        <button
          v-if="showSave"
          :disabled="loading || saving"
          class="route-toolbar-btn route-toolbar-btn--save"
          type="button"
          @click="$emit('save')"
        >
          <i aria-hidden="true" class="bi bi-bookmark-plus"></i>
          <span>{{ saving ? 'Сохранение…' : 'В профиль' }}</span>
        </button>
        <button
          v-if="canAddVia"
          :disabled="loading"
          class="route-toolbar-btn"
          type="button"
          @click="$emit('add-via')"
        >
          <i aria-hidden="true" class="bi bi-plus-lg"></i>
          <span>Точка</span>
        </button>
      </div>
    </template>
  </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'

const startSource = defineModel('startSource', { type: String, default: 'geo' })
const profile = defineModel('profile', { type: String, default: 'driving-car' })

const props = defineProps({
  menuOpen: { type: Boolean, default: false },
  routeActive: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  panelTitle: { type: String, default: 'До объекта' },
  showSave: { type: Boolean, default: false },
  canAddVia: { type: Boolean, default: false },
  showProfileSelect: { type: Boolean, default: true },
  profileHint: { type: String, default: '' },
  startPoint: { type: Object, default: null },
  buildStartSource: { type: String, default: '' },
  mobileCompact: { type: Boolean, default: false },
})

defineEmits(['open-menu', 'close-menu', 'build', 'clear', 'save', 'add-via'])

const fabEl = ref(null)
const panelEl = ref(null)

const startStatusText = computed(() => {
  const source =
    props.routeActive && props.buildStartSource
      ? props.buildStartSource
      : startSource.value
  if (source === 'geo') return 'Ваше местоположение'
  const lat = Number(props.startPoint?.lat)
  const lng = Number(props.startPoint?.lng)
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  }
  return 'Точка на карте'
})

const profileDisplayText = computed(() => {
  if (props.showProfileSelect) {
    return profile.value === 'foot-walking' ? 'Пешком' : 'На авто'
  }
  return props.profileHint || ''
})

watch(
  () => props.menuOpen,
  async (opened) => {
    await nextTick()
    if (opened) panelEl.value?.focus()
    else fabEl.value?.focus()
  },
)

defineExpose({ fabEl, panelEl })
</script>

<style lang="scss" scoped>
.route-setup-root {
  position: absolute;
  inset: 0;
  z-index: 600;
  pointer-events: none;
}

.route-setup-root .route-fab,
.route-setup-root .route-setup {
  pointer-events: auto;
}

.route-fab {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.6rem 0.95rem;
  border: 1px solid rgba($color-primary, 0.28);
  border-radius: 999px;
  background: $color-surface;
  box-shadow: $shadow;
  font-weight: 700;
  font-size: 0.9rem;
  color: $color-primary-dark;
  cursor: pointer;
  transition: $transition;

  &:hover {
    background: $color-light;
    border-color: $color-primary;
    color: $color-darker;
  }
}

.route-fab__icon {
  font-size: 1rem;
  color: $color-primary;
}

.route-setup {
  position: absolute;
  z-index: 650;
  top: 12px;
  left: 12px;
  width: min(320px, calc(100% - 1.5rem));
  padding: 0.9rem 1rem 1rem;
  text-align: left;
  background: $color-surface;
  border-radius: $radius;
  box-shadow: $shadow;
  border: 1px solid rgba($color-primary, 0.15);
}

.route-setup__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.65rem;
}

.route-setup__heading {
  min-width: 0;
}

.route-setup__title {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 700;
  font-size: 0.98rem;
  color: $color-darker;

  i {
    color: $color-primary;
  }
}

.route-setup__subtitle {
  margin: 0.2rem 0 0;
  padding-left: 1.35rem;
  font-size: 0.76rem;
  font-weight: 500;
  color: $color-text-light;
  line-height: 1.35;
}

.route-setup__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: $color-gray-light;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  font-size: 0.9rem;
  cursor: pointer;
  color: $color-text-light;
  transition: $transition;

  &:hover {
    background: $color-gray;
    color: $color-text;
  }
}

.route-setup__label {
  margin: 0.55rem 0 0.35rem;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: $color-text-light;
}

.route-setup__facts {
  margin: 0;
  padding: 0.55rem 0.65rem;
  border-radius: $radius;
  background: $color-gray-light;
  border: 1px solid rgba($color-primary, 0.12);
}

.route-setup__fact {
  display: grid;
  grid-template-columns: 4.5rem minmax(0, 1fr);
  gap: 0.45rem;
  align-items: baseline;
  margin: 0;
  padding: 0.28rem 0;

  & + & {
    border-top: 1px solid rgba($color-primary, 0.1);
    margin-top: 0.15rem;
    padding-top: 0.4rem;
  }
}

.route-setup__fact-label {
  margin: 0;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: $color-text-light;
}

.route-setup__fact-value {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: $color-text;
  line-height: 1.35;
  word-break: break-word;
}

.route-segments {
  display: flex;
  border-radius: $radius;
  overflow: hidden;
  border: 1px solid rgba($color-primary, 0.2);
  background: $color-gray-light;

  &--start {
    margin-top: 0;
  }
}

.route-segments__btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.5rem 0.45rem;
  border: none;
  background: transparent;
  font-size: 0.8rem;
  font-weight: 600;
  color: $color-text-light;
  cursor: pointer;
  transition: $transition;

  i {
    font-size: 0.95rem;
  }

  &:hover {
    background: rgba($color-surface, 0.7);
    color: $color-text;
  }

  &--active {
    background: $color-surface;
    color: $color-darker;
    box-shadow: inset 0 0 0 1px rgba($color-primary, 0.18);
  }
}

.route-action-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  width: 100%;
  margin-top: 0.75rem;
  padding: 0.62rem 0.75rem;
  border: none;
  border-radius: $radius;
  background: $color-secondary;
  color: $color-surface;
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba($color-primary, 0.35);
  transition: $transition;

  &:hover:not(:disabled) {
    background: $color-primary;
  }

  &:disabled {
    opacity: 0.65;
    cursor: wait;
  }
}

.route-action-primary__spin {
  animation: route-spin 0.85s linear infinite;
}

@keyframes route-spin {
  to {
    transform: rotate(360deg);
  }
}

.route-active-toolbar {
  display: flex;
  gap: 0.35rem;
  margin-top: 0.75rem;
}

.route-toolbar-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.42rem 0.35rem;
  border-radius: $radius;
  border: 1px solid rgba($color-primary, 0.25);
  background: $color-surface;
  font-size: 0.72rem;
  font-weight: 600;
  color: $color-text;
  cursor: pointer;
  transition: $transition;

  i {
    font-size: 0.85rem;
  }

  &:hover:not(:disabled) {
    background: $color-light;
  }

  &--danger {
    border-color: rgba($color-danger, 0.45);
    color: $color-danger-dark;
    background: rgba($color-danger, 0.06);

    &:hover {
      background: rgba($color-danger, 0.12);
    }
  }

  &--save {
    border-color: rgba($color-primary, 0.45);
    color: $color-primary;
    background: rgba($color-secondary, 0.12);

    &:hover:not(:disabled) {
      background: rgba($color-secondary, 0.22);
    }
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

@media (max-width: $bp-md) {
  .route-fab {
    top: 10px;
    left: 10px;
    padding: 0.55rem 0.8rem;
  }

  .route-setup {
    top: auto;
    bottom: 10px;
    left: 10px;
    right: 10px;
    width: auto;
    max-height: min(34vh, 240px);
    overflow-y: auto;

    &.route-setup--with-route,
    &.route-setup--mobile-compact {
      top: 8px;
      bottom: auto;
      max-height: min(28vh, 200px);
    }
  }

  .route-toolbar-btn span {
    display: none;
  }

  .route-toolbar-btn {
    padding: 0.5rem;
  }
}

@media (max-width: $bp-sm) {
  .route-fab__label {
    display: none;
  }

  .route-fab {
    width: 2.65rem;
    height: 2.65rem;
    padding: 0;
    justify-content: center;
    border-radius: 50%;
  }
}
</style>

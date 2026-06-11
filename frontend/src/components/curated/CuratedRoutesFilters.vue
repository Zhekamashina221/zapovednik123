<template>
  <aside class="curated-filters">
    <div class="curated-filters__header">
      <h2 class="curated-filters__title">Фильтры</h2>
      <button
        v-if="activeFiltersCount"
        class="curated-filters__reset"
        type="button"
        @click="onReset"
      >
        Сбросить все
      </button>
    </div>

    <div class="curated-filters__group">
      <span class="curated-filters__label">Способ передвижения</span>
      <div class="curated-filters__options">
        <label v-for="opt in profileOptions" :key="opt.value" class="curated-filters__radio">
          <input v-model="draft.profile" type="radio" :value="opt.value" name="curated-profile" />
          <span>{{ opt.label }}</span>
        </label>
      </div>
    </div>

    <div class="curated-filters__group">
      <span class="curated-filters__label">Регион</span>
      <select v-model="draft.region" class="app-input curated-filters__select">
        <option value="all">Все</option>
        <option v-for="r in regionOptions" :key="r" :value="r">{{ r }}</option>
      </select>
    </div>

    <div class="curated-filters__group">
      <span class="curated-filters__label">Длительность</span>
      <div class="curated-filters__options">
        <label v-for="opt in durationOptions" :key="opt.value" class="curated-filters__radio">
          <input v-model="draft.duration" type="radio" :value="opt.value" name="curated-duration" />
          <span>{{ opt.label }}</span>
        </label>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'

const props = defineProps({
  regionOptions: {
    type: Array,
    default: () => [],
  },
  modelValue: {
    type: Object,
    default: () => ({
      profile: 'all',
      region: 'all',
      duration: 'all',
    }),
  },
})

const emit = defineEmits(['update:modelValue'])

const profileOptions = [
  { value: 'all', label: 'Все' },
  { value: 'driving-car', label: 'На авто' },
  { value: 'foot-walking', label: 'Пешком' },
]

const durationOptions = [
  { value: 'all', label: 'Все' },
  { value: 'under3', label: 'до 3 ч' },
  { value: '3to6', label: '3–6 ч' },
  { value: 'over6', label: '6+ ч' },
]

const draft = reactive({
  profile: 'all',
  region: 'all',
  duration: 'all',
})

const activeFiltersCount = computed(() => {
  let count = 0
  if (draft.profile !== 'all') count++
  if (draft.region !== 'all') count++
  if (draft.duration !== 'all') count++
  return count
})

watch(
  () => props.modelValue,
  (v) => {
    if (!v) return
    draft.profile = v.profile ?? 'all'
    draft.region = v.region ?? 'all'
    draft.duration = v.duration ?? 'all'
  },
  { immediate: true, deep: true },
)

function emitFilters() {
  const next = { profile: draft.profile, region: draft.region, duration: draft.duration }
  emit('update:modelValue', next)
}

watch(
  () => [draft.profile, draft.region, draft.duration],
  () => {
    emitFilters()
  },
)

function onReset() {
  draft.profile = 'all'
  draft.region = 'all'
  draft.duration = 'all'
  const next = { profile: 'all', region: 'all', duration: 'all' }
  emit('update:modelValue', next)
}
</script>

<style scoped lang="scss">
.curated-filters {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.curated-filters__header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.curated-filters__title {
  margin: 0;
  flex: 1;
  font-size: 1.05rem;
  font-weight: 700;
  color: #1f2937;
}

.curated-filters__reset {
  border: none;
  background: none;
  color: $color-primary;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 6px;
  white-space: nowrap;
  transition: $transition;

  &:hover {
    color: $color-primary-dark;
  }
}

.curated-filters__group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.curated-filters__label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #475467;
}

.curated-filters__options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.curated-filters__radio {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: #344054;
  cursor: pointer;

  input {
    accent-color: #2e8b57;
  }
}

.curated-filters__select {
  width: 100%;
  border-radius: 12px;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .curated-filters {
    gap: 14px;
    padding: 14px;
    border: 1px solid #e6e7e9;
    border-radius: 14px;
    background: #fafbfc;
  }

  .curated-filters__title {
    font-size: 1rem;
  }
}
</style>
